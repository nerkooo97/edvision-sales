'use server';

import { Query } from 'node-appwrite';
import { createAdminClient } from './server';
import { appwriteConfig } from './config';
import type { Lead } from './leads';
import type { Company } from './companies';
import type { ContactLog } from './contact-logs';
import type { Meeting } from './meetings';
import { isContactLogError } from '@/lib/contact-log-status';
import { getSarajevoDateParts } from '../utils';
import { checkSalesAccess } from '../access/server/access';
import { flattenRelations } from './rows';

export interface DashboardStats {
  totalCompanies: number;
  totalLeads: number;
  totalContacts: number;
  wonDeals: number;
  conversionRate: number;
  statusBreakdown: Record<string, number>;
  channelBreakdown: Record<string, number>;
  todayFollowUps: ContactLog[];
  todayMeetingReminders: Meeting[];
  recentActivities: ContactLog[];
  recentLeads: Lead[];
  timelineData: { date: string; emails: number; calls: number; whatsapp: number }[];
}

const DATABASE_ID = appwriteConfig.databaseId || '6a7dd77a002b3913d433';

// Kolone logova koje dashboard koristi (sve osim teksta emaila).
const DASHBOARD_LOG_COLUMNS = [
  '$id', '$createdAt', '$updatedAt', 'contacted_at', 'follow_up_date', 'channel', 'recipient', 'subject', 'status',
  'outcome', 'company.$id', 'lead.$id',
];

const LEAD_STATUSES = [
  'Novi',
  'Kontaktiran',
  'Kvalifikovan',
  'U pregovorima',
  'Zaključeno - Dobijeno',
  'Odbijeno',
  'Ne javlja se',
  'Greška - Nepostojeći email',
  'Greška - Neisporučen email',
];
const CHANNELS = ['Email', 'WhatsApp', 'Telefon', 'Sastanak', 'Drugo'];

type TablesDBClient = Awaited<ReturnType<typeof createAdminClient>>['tablesDB'];

/**
 * How many rows have each of `values` in `column`, counted by Appwrite (one tiny request per value).
 * Rows with an empty column count as `emptyAs`, as the dashboard always did.
 */
async function countByValue(
  tablesDB: TablesDBClient,
  tableId: string,
  column: string,
  values: string[],
  emptyAs: string
): Promise<Record<string, number>> {
  const counts = await Promise.all(
    values.map(async (value) => {
      const match =
        value === emptyAs
          ? Query.or([Query.equal(column, [value, '']), Query.isNull(column)])
          : Query.equal(column, value);
      const { total } = await tablesDB.listRows({
        databaseId: DATABASE_ID,
        tableId,
        queries: [match, Query.select(['$id']), Query.limit(1)],
      });
      return [value, total] as const;
    })
  );
  return Object.fromEntries(counts);
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const denied = await checkSalesAccess('dashboard', 'view');
  if (denied) throw new Error(denied);

  try {
    const adminClient = await createAdminClient();
    const tablesDB = adminClient.tablesDB;

    // Raspodjele (vidi niže) idu paralelno s ostalim upitima.
    const breakdownsPromise = Promise.all([
      countByValue(tablesDB, 'leads', 'status', LEAD_STATUSES, 'Novi'),
      countByValue(tablesDB, 'contact_logs', 'channel', CHANNELS, 'Email'),
    ]);
    // Awaited below; this only stops a failure from being reported as unhandled if an earlier step throws.
    breakdownsPromise.catch(() => undefined);

    // 1. Fetch Companies, Leads, Contact Logs concurrently
    const [companiesRes, leadsRes, contactLogsRes, meetingsRes] = await Promise.all([
      tablesDB.listRows({ databaseId: DATABASE_ID, tableId: 'companies', queries: [Query.limit(500), Query.orderDesc('$createdAt')] }),
      tablesDB.listRows({ databaseId: DATABASE_ID, tableId: 'leads', queries: [Query.limit(500), Query.orderDesc('$createdAt')] }),
      // Bez kolone content (tekst emaila): dashboard je nigdje ne prikazuje, a ona je većina veličine reda.
      tablesDB.listRows({
        databaseId: DATABASE_ID,
        tableId: 'contact_logs',
        queries: [Query.select(DASHBOARD_LOG_COLUMNS), Query.limit(500), Query.orderDesc('$createdAt')],
      }),
      tablesDB.listRows({
        databaseId: DATABASE_ID,
        total: false,
        tableId: 'meetings',
        queries: [Query.equal('status', ['Zakazan', 'Potvrđen', 'Odgođen', 'Na čekanju']), Query.limit(500)],
      }),
    ]);

    const companies = JSON.parse(JSON.stringify(companiesRes.rows || [])) as Company[];
    const leads = JSON.parse(JSON.stringify(leadsRes.rows || [])) as Lead[];
    const contactLogs = flattenRelations<ContactLog>(JSON.parse(JSON.stringify(contactLogsRes.rows || [])), ['company', 'lead']);
    const activeMeetings = JSON.parse(JSON.stringify(meetingsRes.rows || [])) as Meeting[];

    const companiesMap = new Map<string, Company>();
    companies.forEach((c) => companiesMap.set(c.$id, c));

    // Collect all company IDs needed by leads and contact logs
    const neededCompanyIds = Array.from(
      new Set(
        [
          ...leads.map((l) => (typeof l.company === 'string' ? l.company : (l.company as unknown as { $id?: string })?.$id)),
          ...contactLogs.map((c) => (typeof c.company === 'string' ? c.company : (c.company as unknown as { $id?: string })?.$id)),
        ].filter((id): id is string => Boolean(id))
      )
    );

    const missingCompanyIds = neededCompanyIds.filter((id) => !companiesMap.has(id));
    if (missingCompanyIds.length > 0) {
      try {
        // Appwrite ograničava Query.equal na najviše 100 vrijednosti odjednom --
        // dijelimo u grupe da izbjegnemo "Invalid queries param" grešku kad ima puno firmi.
        const chunks: string[][] = [];
        for (let i = 0; i < missingCompanyIds.length; i += 100) {
          chunks.push(missingCompanyIds.slice(i, i + 100));
        }
        const missingResults = await Promise.all(
          chunks.map((chunk) =>
            tablesDB.listRows({
              databaseId: DATABASE_ID,
              total: false,
              tableId: 'companies',
              queries: [Query.equal('$id', chunk), Query.limit(100)],
            }).catch(() => ({ rows: [] }))
          )
        );
        missingResults.forEach((missingRes) => {
          const missingCompanies = JSON.parse(JSON.stringify(missingRes.rows || [])) as Company[];
          missingCompanies.forEach((c) => companiesMap.set(c.$id, c));
        });
      } catch (err) {
        console.error('Failed to fetch missing companies in stats:', err);
      }
    }

    // Populate company references on leads & contact logs
    const populatedLeads = leads.map((lead) => ({
      ...lead,
      company: typeof lead.company === 'string' ? companiesMap.get(lead.company) || lead.company : lead.company,
    }));

    const populatedContactLogs = contactLogs.map((log) => ({
      ...log,
      company: typeof log.company === 'string' ? companiesMap.get(log.company) || log.company : log.company,
      lead: typeof log.lead === 'string' ? populatedLeads.find((l) => l.$id === log.lead) || log.lead : log.lead,
    }));

    // 2. Metrics calculation
    const totalCompanies = companiesRes.total || companies.length;
    const totalLeads = leadsRes.total || leads.length;
    const totalContacts = contactLogsRes.total || contactLogs.length;

    // Raspodjele se broje u bazi nad SVIM leadovima i logovima -- ranije su se računale samo na
    // najnovijih 500 redova, pa su brojke bile netačne čim tabela pređe 500 redova.
    const [statusBreakdown, channelBreakdown] = await breakdownsPromise;

    const wonDeals = statusBreakdown['Zaključeno - Dobijeno'] || 0;
    const conversionRate = totalLeads > 0 ? Math.round((wonDeals / totalLeads) * 100) : 0;

    // 3. Today / Overdue Follow-ups
    const now = new Date();
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    const activeMeetingCompanyIds = new Set(
      activeMeetings.map((meeting) => meeting.company_id).filter((id): id is string => Boolean(id))
    );
    const blockedLeadStatuses = new Set([
      'U pregovorima',
      'Kvalifikovan',
      'Zaključeno - Dobijeno',
      'Odbijeno',
    ]);
    // Bilo koji status koji počinje sa "Greška" (npr. "Greška - Nepostojeći email",
    // "Greška - Neisporučen email") blokira dalje follow-upove -- ne nabrajamo ih
    // ručno da izbjegnemo da neki od njih ostane nepokriven kao ranije.
    const isBlockedLeadStatus = (status?: string): boolean =>
      Boolean(status) && (blockedLeadStatuses.has(status!) || status!.startsWith('Greška'));
    const blockedLeadCompanyIds = new Set(
      populatedLeads
        .filter((lead) => isBlockedLeadStatus(lead.status))
        .map((lead) => typeof lead.company === 'string' ? lead.company : lead.company?.$id)
        .filter((id): id is string => Boolean(id))
    );

    const todayFollowUps = populatedContactLogs.filter((log) => {
      if (!log.follow_up_date || isContactLogError(log.status, log.outcome)) return false;
      const companyId = typeof log.company === 'string' ? log.company : log.company?.$id;
      const leadStatus = typeof log.lead === 'object' && log.lead ? log.lead.status : '';
      if (companyId && activeMeetingCompanyIds.has(companyId)) return false;
      if (companyId && blockedLeadCompanyIds.has(companyId)) return false;
      if (leadStatus && isBlockedLeadStatus(leadStatus)) return false;
      const fDate = new Date(log.follow_up_date);
      return fDate <= todayEnd;
    });

    const todayMeetingReminders = activeMeetings.filter((m) => {
      if (m.status !== 'Na čekanju' || !m.reminder_at) return false;
      const rDate = new Date(m.reminder_at);
      return rDate <= todayEnd;
    });

    // 4. Timeline data for chart (Last 7 days, u Europe/Sarajevo vremenskoj zoni --
    // dosljedno sa ostatkom aplikacije, da kontakti kasno navečer ne upadnu u pogrešan dan)
    const timelineMap: Record<string, { emails: number; calls: number; whatsapp: number }> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const parts = getSarajevoDateParts(d);
      const key = `${parts.month}-${parts.day}`; // MM-DD
      timelineMap[key] = { emails: 0, calls: 0, whatsapp: 0 };
    }

    contactLogs.forEach((log) => {
      const timestamp = log.contacted_at || log.$createdAt;
      if (!timestamp) return;
      const parts = getSarajevoDateParts(new Date(timestamp));
      const dateKey = `${parts.month}-${parts.day}`;
      if (timelineMap[dateKey]) {
        const ch = (log.channel || '').toLowerCase();
        if (ch.includes('email')) timelineMap[dateKey].emails += 1;
        else if (ch.includes('telefon') || ch.includes('poziv')) timelineMap[dateKey].calls += 1;
        else if (ch.includes('whatsapp')) timelineMap[dateKey].whatsapp += 1;
      }
    });

    const timelineData = Object.entries(timelineMap).map(([date, counts]) => ({
      date,
      ...counts,
    }));

    return JSON.parse(
      JSON.stringify({
        totalCompanies,
        totalLeads,
        totalContacts,
        wonDeals,
        conversionRate,
        statusBreakdown,
        channelBreakdown,
        todayFollowUps,
        todayMeetingReminders,
        recentActivities: populatedContactLogs.slice(0, 8),
        recentLeads: populatedLeads.slice(0, 6),
        timelineData,
      })
    );
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return {
      totalCompanies: 0,
      totalLeads: 0,
      totalContacts: 0,
      wonDeals: 0,
      conversionRate: 0,
      statusBreakdown: {},
      channelBreakdown: {},
      todayFollowUps: [],
      todayMeetingReminders: [],
      recentActivities: [],
      recentLeads: [],
      timelineData: [],
    };
  }
}
