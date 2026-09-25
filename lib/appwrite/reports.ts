'use server';

import { Query } from 'node-appwrite';
import { createAdminClient } from './server';
import { appwriteConfig } from './config';
import type { Lead } from './leads';
import type { Company } from './companies';
import type { ContactLog } from './contact-logs';
import { isContactLogError } from '@/lib/contact-log-status';

export interface FunnelStep {
  name: string;
  count: number;
  percentage: number;
  description: string;
  color: string;
}

export interface AcquisitionDay {
  date: string;
  dayName: string;
  kontaktirano: number;
  odgovoreno: number;
  greska: number;
}

export interface ChannelMetric {
  channel: string;
  total: number;
  answered: number;
  rate: number;
  color: string;
}

export interface CityMetric {
  city: string;
  count: number;
  percentage: number;
}

export interface WebsiteDeficiency {
  name: string;
  count: number;
  percentage: number;
}

export interface ChannelStatusBreakdown {
  poslano: number;
  otvoreno: number;
  odgovoreno: number;
  greska: number;
  total: number;
}

export interface ReportsData {
  totalCompanies: number;
  totalLeads: number;
  totalContacts: number;
  wonDeals: number;
  overallConversionRate: number;
  funnelSteps: FunnelStep[];
  acquisition7Days: AcquisitionDay[];
  acquisition30Days: AcquisitionDay[];
  acquisitionYearWeeks: AcquisitionDay[];
  channelMetrics: ChannelMetric[];
  cityMetrics: CityMetric[];
  websiteDeficiencies: WebsiteDeficiency[];
  statusDistribution: { name: string; count: number; color: string }[];
  emailStatusBreakdown: ChannelStatusBreakdown;
  whatsappStatusBreakdown: ChannelStatusBreakdown;
  exportRows: Array<{
    kompanija: string;
    grad: string;
    telefon: string;
    email: string;
    status: string;
    aiScore: number;
    poslednjiKontakt: string;
    kreirano: string;
  }>;
}

const DATABASE_ID = appwriteConfig.databaseId || '6a7dd77a002b3913d433';

type TablesDBClient = Awaited<ReturnType<typeof createAdminClient>>['tablesDB'];

// Appwrite listRows vraća najviše po stranicu (limit) redova -- za izvještaje nam
// treba KOMPLETAN skup (npr. sve kompanije za "Top gradovi"), ne samo najnoviju
// stranicu, inače statistika bude iskrivljena na uzorak od par stotina zadnje
// unesenih redova. Ovdje prolazimo kroz sve stranice preko cursorAfter paginacije.
async function fetchAllRows(
  tablesDB: TablesDBClient,
  tableId: string,
  baseQueries: string[],
  pageSize = 100,
  maxPages = 30
): Promise<Record<string, unknown>[]> {
  const all: Record<string, unknown>[] = [];
  let cursor: string | undefined;

  for (let page = 0; page < maxPages; page++) {
    const queries = [...baseQueries, Query.limit(pageSize)];
    if (cursor) queries.push(Query.cursorAfter(cursor));

    const res = await tablesDB.listRows({ databaseId: DATABASE_ID, tableId, queries });
    const rows = (res.rows || []) as Record<string, unknown>[];
    all.push(...rows);

    if (rows.length < pageSize) break;
    cursor = rows[rows.length - 1].$id as string;
  }

  return all;
}

export async function getReportsData(): Promise<ReportsData> {
  try {
    const adminClient = await createAdminClient();
    const tablesDB = adminClient.tablesDB;

    // Fetch all core collections concurrently (paginated -- vidi fetchAllRows)
    const [companiesRows, leadsRows, contactLogsRows] = await Promise.all([
      fetchAllRows(tablesDB, 'companies', [Query.orderDesc('$createdAt')]),
      fetchAllRows(tablesDB, 'leads', [Query.orderDesc('$createdAt')]),
      fetchAllRows(tablesDB, 'contact_logs', [Query.orderDesc('$createdAt')]),
    ]);

    const companies = JSON.parse(JSON.stringify(companiesRows)) as Company[];
    const leads = JSON.parse(JSON.stringify(leadsRows)) as Lead[];
    const contactLogs = JSON.parse(JSON.stringify(contactLogsRows)) as ContactLog[];

    // Build companies map
    const companiesMap = new Map<string, Company>();
    companies.forEach((c) => companiesMap.set(c.$id, c));

    // Resolve any missing company IDs
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
        console.error('Failed to fetch missing companies in reports:', err);
      }
    }

    // 1. High level metrics
    const totalCompanies = companies.length;
    const totalLeads = leads.length;
    const totalContacts = contactLogs.length;

    const wonDeals = leads.filter((l) => l.status === 'Zaključeno - Dobijeno').length;
    const inNegotiation = leads.filter((l) => l.status === 'U pregovorima').length;
    const contactedLeads = leads.filter((l) => l.status === 'Kontaktiran' || l.status === 'Kvalifikovan' || l.status === 'U pregovorima' || l.status === 'Zaključeno - Dobijeno').length;
    const overallConversionRate = totalLeads > 0 ? Math.round((wonDeals / totalLeads) * 100) : 0;

    // 2. Conversion Funnel (Lijevak Konverzije)
    const emailSentLogs = contactLogs.filter((c) => (c.channel || '').toLowerCase().includes('email'));
    const emailAnsweredLogs = emailSentLogs.filter(
      (c) =>
        (c.status || '').toLowerCase().includes('odgovor') ||
        (c.outcome || '').toLowerCase().includes('odgovor') ||
        (c.outcome || '').toLowerCase().includes('pozitiv') ||
        (c.outcome || '').toLowerCase().includes('zainteresov')
    );
    const phoneCallsLogs = contactLogs.filter((c) => (c.channel || '').toLowerCase().includes('telefon') || (c.channel || '').toLowerCase().includes('poziv') || (c.channel || '').toLowerCase().includes('sastanak'));

    const funnelBaseline = Math.max(totalCompanies, totalLeads, 1);

    const step1Count = totalCompanies;
    const step2Count = Math.max(emailSentLogs.length, contactedLeads);
    const step3Count = Math.max(emailAnsweredLogs.length, inNegotiation + wonDeals);
    const step4Count = Math.max(phoneCallsLogs.length, inNegotiation + wonDeals);
    const step5Count = Math.max(inNegotiation + wonDeals, 1);
    const step6Count = wonDeals;

    const funnelSteps: FunnelStep[] = [
      {
        name: 'Prikupljeno',
        count: step1Count,
        percentage: 100,
        description: 'Baza svih evidentiranih kompanija',
        color: 'bg-blue-500',
      },
      {
        name: 'Email poslan',
        count: step2Count,
        percentage: Math.round((step2Count / funnelBaseline) * 100),
        description: 'Inicijalni outreach putem emaila',
        color: 'bg-sky-500',
      },
      {
        name: 'Odgovoreno',
        count: step3Count,
        percentage: Math.round((step3Count / funnelBaseline) * 100),
        description: 'Pozitivan odgovor na ponudu',
        color: 'bg-emerald-500',
      },
      {
        name: 'Poziv / Sastanak',
        count: step4Count,
        percentage: Math.round((step4Count / funnelBaseline) * 100),
        description: 'Telefonski razgovor ili online sastanak',
        color: 'bg-purple-500',
      },
      {
        name: 'U pregovorima',
        count: step5Count,
        percentage: Math.round((step5Count / funnelBaseline) * 100),
        description: 'Definisanje ponude i detalja ugovora',
        color: 'bg-amber-500',
      },
      {
        name: 'Zaključeno',
        count: step6Count,
        percentage: Math.round((step6Count / funnelBaseline) * 100),
        description: 'Uspješno realizovana prodaja (Dobijeno)',
        color: 'bg-emerald-600',
      },
    ];

    // 3. Acquisition Timeline (Past 7 days & 30 days)
    const dayNames = ['Ned', 'Pon', 'Uto', 'Sri', 'Čet', 'Pet', 'Sub'];

    const buildTimeline = (daysCount: number): AcquisitionDay[] => {
      const days: AcquisitionDay[] = [];
      for (let i = daysCount - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const isoDate = d.toISOString().slice(0, 10);
        const dayLabel = `${d.getDate()}.${d.getMonth() + 1}.`;
        const dayName = daysCount <= 7 ? dayNames[d.getDay()] : dayLabel;

        const contactedCount = contactLogs.filter(
          (c) => (c.contacted_at || c.$createdAt || '').startsWith(isoDate) && !isContactLogError(c.status, c.outcome)
        ).length;
        const answeredCount = contactLogs.filter(
          (c) =>
            (c.contacted_at || c.$createdAt || '').startsWith(isoDate) &&
            ((c.status || '').toLowerCase().includes('odgovor') || (c.outcome || '').toLowerCase().includes('odgovor'))
        ).length;
        const errorCount = contactLogs.filter(
          (c) => (c.contacted_at || c.$createdAt || '').startsWith(isoDate) && isContactLogError(c.status, c.outcome)
        ).length;

        days.push({
          date: dayLabel,
          dayName,
          kontaktirano: contactedCount,
          odgovoreno: answeredCount,
          greska: errorCount,
        });
      }
      return days;
    };

    const acquisition7Days = buildTimeline(7);
    const acquisition30Days = buildTimeline(30);

    // Weekly aggregation for current year
    const currentYear = new Date().getFullYear();
    const now = new Date();
    const getWeekNumber = (d: Date): number => {
      const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
      const dayNum = date.getUTCDay() || 7;
      date.setUTCDate(date.getUTCDate() + 4 - dayNum);
      const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
      return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
    };

    const currentWeekNumber = Math.max(getWeekNumber(now), 1);
    const totalWeeks = Math.min(Math.max(currentWeekNumber, 12), 52);
    const acquisitionYearWeeks: AcquisitionDay[] = [];

    for (let w = 1; w <= totalWeeks; w++) {
      const daysOffset = (w - 1) * 7;
      const weekStart = new Date(currentYear, 0, 1 + daysOffset);
      const weekEnd = new Date(currentYear, 0, 1 + daysOffset + 6, 23, 59, 59);

      const weekStartISO = weekStart.toISOString().slice(0, 10);
      const weekEndISO = weekEnd.toISOString().slice(0, 10);

      const weekLabel = `Sedmica ${w} (${weekStart.getDate()}.${weekStart.getMonth() + 1}. - ${weekEnd.getDate()}.${weekEnd.getMonth() + 1}.)`;
      const shortLabel = `Sed ${w}`;

      const contactedInWeek = contactLogs.filter((c) => {
        const d = (c.contacted_at || c.$createdAt || '').slice(0, 10);
        return d >= weekStartISO && d <= weekEndISO && !isContactLogError(c.status, c.outcome);
      }).length;

      const answeredInWeek = contactLogs.filter((c) => {
        const d = (c.contacted_at || c.$createdAt || '').slice(0, 10);
        return (
          d >= weekStartISO &&
          d <= weekEndISO &&
          ((c.status || '').toLowerCase().includes('odgovor') || (c.outcome || '').toLowerCase().includes('odgovor'))
        );
      }).length;

      const errorsInWeek = contactLogs.filter((c) => {
        const d = (c.contacted_at || c.$createdAt || '').slice(0, 10);
        return d >= weekStartISO && d <= weekEndISO && isContactLogError(c.status, c.outcome);
      }).length;

      acquisitionYearWeeks.push({
        date: weekLabel,
        dayName: shortLabel,
        kontaktirano: contactedInWeek,
        odgovoreno: answeredInWeek,
        greska: errorsInWeek,
      });
    }

    // 4. Channel Performance Metrics
    const channelNames = ['Email', 'WhatsApp', 'Telefon', 'Sastanak'];
    const channelColors: Record<string, string> = {
      Email: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
      WhatsApp: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
      Telefon: 'text-purple-500 bg-purple-500/10 border-purple-500/20',
      Sastanak: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
    };

    const channelMetrics: ChannelMetric[] = channelNames.map((ch) => {
      const logs = contactLogs.filter((c) => (c.channel || '').toLowerCase().includes(ch.toLowerCase()));
      const answered = logs.filter(
        (c) =>
          (c.status || '').toLowerCase().includes('odgovor') ||
          (c.status || '').toLowerCase().includes('uspješ') ||
          (c.status || '').toLowerCase().includes('zainteresov') ||
          (c.outcome || '').toLowerCase().includes('odgovor') ||
          (c.outcome || '').toLowerCase().includes('pozitiv') ||
          (c.outcome || '').toLowerCase().includes('sastanak') ||
          (c.outcome || '').toLowerCase().includes('zainteresov')
      ).length;
      const rate = logs.length > 0 ? Math.round((answered / logs.length) * 100) : 0;

      return {
        channel: ch,
        total: logs.length,
        answered,
        rate,
        color: channelColors[ch] || 'text-primary bg-primary/10 border-primary/20',
      };
    });

    // 5. City Distribution
    const cityCountMap: Record<string, number> = {};
    companies.forEach((c) => {
      const city = c.city?.trim() || 'Ostalo';
      cityCountMap[city] = (cityCountMap[city] || 0) + 1;
    });

    const cityMetrics: CityMetric[] = Object.entries(cityCountMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([city, count]) => ({
        city,
        count,
        percentage: totalCompanies > 0 ? Math.round((count / totalCompanies) * 100) : 0,
      }));

    // 6. Website Deficiencies / Pain Points (Tehnički nedostaci klijenata)
    const deficiencyMap: Record<string, number> = {};
    leads.forEach((l) => {
      if (l.analysis && Array.isArray(l.analysis)) {
        l.analysis.forEach((tag) => {
          const cleanTag = (tag || '').trim();
          if (cleanTag) {
            deficiencyMap[cleanTag] = (deficiencyMap[cleanTag] || 0) + 1;
          }
        });
      }
    });

    const totalDeficienciesCount = Math.max(
      Object.values(deficiencyMap).reduce((a, b) => a + b, 0),
      1
    );

    const websiteDeficiencies: WebsiteDeficiency[] = Object.entries(deficiencyMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, count]) => ({
        name,
        count,
        percentage: Math.round((count / totalDeficienciesCount) * 100),
      }));

    // 7. Status Breakdown Colors for Donut
    const rawStatusDistribution = [
      { name: 'Novi', count: leads.filter((l) => (l.status || 'Novi') === 'Novi').length, color: '#3b82f6' },
      { name: 'Kontaktiran', count: leads.filter((l) => l.status === 'Kontaktiran').length, color: '#06b6d4' },
      { name: 'Kvalifikovan', count: leads.filter((l) => l.status === 'Kvalifikovan').length, color: '#8b5cf6' },
      { name: 'U pregovorima', count: leads.filter((l) => l.status === 'U pregovorima').length, color: '#ff8d11' },
      { name: 'Zaključeno', count: wonDeals, color: '#10b981' },
      { name: 'Odbijeno', count: leads.filter((l) => l.status === 'Odbijeno').length, color: '#ef4444' },
    ];

    const statusDistribution = rawStatusDistribution.filter((s) => s.count > 0);

    // 8. Email / WhatsApp Status Breakdown (Poslano, Otvoreno, Odgovoreno, Greška)
    const classifyLogStatus = (log: ContactLog): 'poslano' | 'otvoreno' | 'odgovoreno' | 'greska' => {
      const outcomeLower = (log.outcome || '').toLowerCase();
      const dbStatus = log.status || '';

      if (isContactLogError(dbStatus, log.outcome)) return 'greska';
      if (dbStatus === 'Odgovoreno' || outcomeLower.includes('odgovor') || outcomeLower.includes('zainteresov') || outcomeLower.includes('pozitiv')) {
        return 'odgovoreno';
      }
      if (dbStatus === 'Otvorena' || dbStatus === 'Otvoreno' || outcomeLower.includes('otvor') || outcomeLower.includes('pročit')) {
        return 'otvoreno';
      }
      return 'poslano';
    };

    const buildStatusBreakdown = (channelKeyword: string): ChannelStatusBreakdown => {
      const logs = contactLogs.filter((c) => (c.channel || '').toLowerCase().includes(channelKeyword));
      const breakdown: ChannelStatusBreakdown = { poslano: 0, otvoreno: 0, odgovoreno: 0, greska: 0, total: logs.length };
      logs.forEach((log) => {
        breakdown[classifyLogStatus(log)] += 1;
      });
      return breakdown;
    };

    const emailStatusBreakdown = buildStatusBreakdown('email');
    const whatsappStatusBreakdown = buildStatusBreakdown('whatsapp');

    // 9. Structured Export Rows for CSV
    const exportRows = leads.map((lead) => {
      const comp = typeof lead.company === 'object' && lead.company ? lead.company : companiesMap.get(lead.company as string);
      return {
        kompanija: comp?.company_name || 'Nepoznato',
        grad: comp?.city || '—',
        telefon: comp?.phones?.[0] || '—',
        email: comp?.email || '—',
        status: lead.status || 'Novi',
        aiScore: lead.has_phone ? 95 : 70,
        poslednjiKontakt: lead.$updatedAt ? new Date(lead.$updatedAt).toLocaleDateString('bs-BA') : '—',
        kreirano: lead.$createdAt ? new Date(lead.$createdAt).toLocaleDateString('bs-BA') : '—',
      };
    });

    return JSON.parse(
      JSON.stringify({
        totalCompanies,
        totalLeads,
        totalContacts,
        wonDeals,
        overallConversionRate,
        funnelSteps,
        acquisition7Days,
        acquisition30Days,
        acquisitionYearWeeks,
        channelMetrics,
        cityMetrics,
        websiteDeficiencies,
        statusDistribution: statusDistribution.length > 0 ? statusDistribution : rawStatusDistribution.slice(0, 4),
        emailStatusBreakdown,
        whatsappStatusBreakdown,
        exportRows,
      })
    );
  } catch (error) {
    console.error('Error getting reports data:', error);
    const emptyBreakdown: ChannelStatusBreakdown = { poslano: 0, otvoreno: 0, odgovoreno: 0, greska: 0, total: 0 };
    return {
      totalCompanies: 0,
      totalLeads: 0,
      totalContacts: 0,
      wonDeals: 0,
      overallConversionRate: 0,
      funnelSteps: [],
      acquisition7Days: [],
      acquisition30Days: [],
      acquisitionYearWeeks: [],
      channelMetrics: [],
      cityMetrics: [],
      websiteDeficiencies: [],
      statusDistribution: [],
      emailStatusBreakdown: emptyBreakdown,
      whatsappStatusBreakdown: emptyBreakdown,
      exportRows: [],
    };
  }
}
