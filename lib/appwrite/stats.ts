'use server';

import { Query } from 'node-appwrite';
import { createAdminClient } from './server';
import { appwriteConfig } from './config';
import type { Lead } from './leads';
import type { Company } from './companies';
import type { ContactLog } from './contact-logs';

export interface DashboardStats {
  totalCompanies: number;
  totalLeads: number;
  totalContacts: number;
  wonDeals: number;
  conversionRate: number;
  statusBreakdown: Record<string, number>;
  channelBreakdown: Record<string, number>;
  todayFollowUps: ContactLog[];
  recentActivities: ContactLog[];
  recentLeads: Lead[];
  timelineData: { date: string; emails: number; calls: number; whatsapp: number }[];
}

export type DashboardPeriod = 'this_week' | 'this_month' | 'this_year' | 'all_time';

const DATABASE_ID = appwriteConfig.databaseId || '6a7dd77a002b3913d433';

export async function getDashboardStats(period: DashboardPeriod = 'this_week'): Promise<DashboardStats> {
  try {
    const adminClient = await createAdminClient();
    const tablesDB = adminClient.tablesDB;

    // Determine date ranges based on period
    const now = new Date();
    let startDate: Date | null = null;
    let endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    if (period === 'this_week') {
      const day = now.getDay() || 7; // Get current day number, converting Sun(0) to 7
      if (day !== 1) { // Only manipulate the date if it isn't Monday
        now.setHours(-24 * (day - 1));
      }
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    } else if (period === 'this_month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
    } else if (period === 'this_year') {
      startDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0);
    }

    const queries = [Query.limit(100), Query.orderDesc('$createdAt')];
    if (startDate) {
      queries.push(Query.greaterThanEqual('$createdAt', startDate.toISOString()));
      queries.push(Query.lessThanEqual('$createdAt', endDate.toISOString()));
    }

    // 1. Fetch Companies, Leads, Contact Logs concurrently
    const [companiesRes, leadsRes, contactLogsRes] = await Promise.all([
      tablesDB.listRows({ databaseId: DATABASE_ID, tableId: 'companies', queries }),
      tablesDB.listRows({ databaseId: DATABASE_ID, tableId: 'leads', queries }),
      tablesDB.listRows({ databaseId: DATABASE_ID, tableId: 'contact_logs', queries }),
    ]);

    const companies = JSON.parse(JSON.stringify(companiesRes.rows || [])) as Company[];
    const leads = JSON.parse(JSON.stringify(leadsRes.rows || [])) as Lead[];
    const contactLogs = JSON.parse(JSON.stringify(contactLogsRes.rows || [])) as ContactLog[];

    const companiesMap = new Map<string, Company>();
    companies.forEach((c) => companiesMap.set(c.$id, c));

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

    const statusBreakdown: Record<string, number> = {
      Novi: 0,
      Kontaktiran: 0,
      Kvalifikovan: 0,
      'U pregovorima': 0,
      'Zaključeno - Dobijeno': 0,
      Odbijeno: 0,
      'Ne javlja se': 0,
    };

    leads.forEach((l) => {
      const st = l.status || 'Novi';
      statusBreakdown[st] = (statusBreakdown[st] || 0) + 1;
    });

    const wonDeals = statusBreakdown['Zaključeno - Dobijeno'] || 0;
    const conversionRate = totalLeads > 0 ? Math.round((wonDeals / totalLeads) * 100) : 0;

    const channelBreakdown: Record<string, number> = {
      Email: 0,
      WhatsApp: 0,
      Telefon: 0,
      Sastanak: 0,
      Drugo: 0,
    };

    contactLogs.forEach((c) => {
      const ch = c.channel || 'Email';
      channelBreakdown[ch] = (channelBreakdown[ch] || 0) + 1;
    });

    // 3. Today / Overdue Follow-ups
    const todayNow = new Date();
    const todayEnd = new Date(todayNow.getFullYear(), todayNow.getMonth(), todayNow.getDate(), 23, 59, 59);

    const todayFollowUps = populatedContactLogs.filter((log) => {
      if (!log.follow_up_date) return false;
      const fDate = new Date(log.follow_up_date);
      return fDate <= todayEnd;
    });

    // 4. Timeline data for chart (Dynamic based on period)
    const timelineMap: Record<string, { emails: number; calls: number; whatsapp: number }> = {};
    
    // Generate buckets depending on period length
    if (period === 'this_week') {
      // Last 7 days
      for (let i = 6; i >= 0; i--) {
        const d = new Date(endDate);
        d.setDate(d.getDate() - i);
        timelineMap[d.toISOString().slice(5, 10)] = { emails: 0, calls: 0, whatsapp: 0 };
      }
    } else if (period === 'this_month') {
      // All days of the current month up to today
      const daysInMonth = endDate.getDate();
      for (let i = 1; i <= daysInMonth; i++) {
        const d = new Date(endDate.getFullYear(), endDate.getMonth(), i);
        timelineMap[d.toISOString().slice(5, 10)] = { emails: 0, calls: 0, whatsapp: 0 };
      }
    } else if (period === 'this_year') {
      // 12 months
      for (let i = 0; i <= endDate.getMonth(); i++) {
        const key = `${endDate.getFullYear()}-${String(i + 1).padStart(2, '0')}`;
        timelineMap[key] = { emails: 0, calls: 0, whatsapp: 0 };
      }
    } else {
      // All time - Just use months for the last 12 months
      for (let i = 11; i >= 0; i--) {
        const d = new Date(endDate.getFullYear(), endDate.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        timelineMap[key] = { emails: 0, calls: 0, whatsapp: 0 };
      }
    }

    contactLogs.forEach((log) => {
      let dateKey = (log.contacted_at || log.$createdAt || '').slice(5, 10); // MM-DD
      
      if (period === 'this_year' || period === 'all_time') {
        dateKey = (log.contacted_at || log.$createdAt || '').slice(0, 7); // YYYY-MM
      }

      if (timelineMap[dateKey]) {
        const ch = (log.channel || '').toLowerCase();
        if (ch.includes('email')) timelineMap[dateKey].emails += 1;
        else if (ch.includes('telefon') || ch.includes('poziv') || ch.includes('sastanak')) timelineMap[dateKey].calls += 1;
        else if (ch.includes('whatsapp')) timelineMap[dateKey].whatsapp += 1;
      }
    });

    const timelineData = Object.entries(timelineMap).map(([date, counts]) => ({
      date,
      ...counts,
    }));

    return {
      totalCompanies,
      totalLeads,
      totalContacts,
      wonDeals,
      conversionRate,
      statusBreakdown,
      channelBreakdown,
      todayFollowUps,
      recentActivities: populatedContactLogs.slice(0, 8),
      recentLeads: populatedLeads.slice(0, 6),
      timelineData,
    };
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
      recentActivities: [],
      recentLeads: [],
      timelineData: [],
    };
  }
}
