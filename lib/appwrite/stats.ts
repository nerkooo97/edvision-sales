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

const DATABASE_ID = appwriteConfig.databaseId || '6a7dd77a002b3913d433';

export async function getDashboardStats(): Promise<DashboardStats> {
  try {
    const adminClient = await createAdminClient();
    const tablesDB = adminClient.tablesDB;

    // 1. Fetch Companies, Leads, Contact Logs concurrently
    const [companiesRes, leadsRes, contactLogsRes] = await Promise.all([
      tablesDB.listRows({ databaseId: DATABASE_ID, tableId: 'companies', queries: [Query.limit(100)] }),
      tablesDB.listRows({ databaseId: DATABASE_ID, tableId: 'leads', queries: [Query.limit(100)] }),
      tablesDB.listRows({ databaseId: DATABASE_ID, tableId: 'contact_logs', queries: [Query.limit(100), Query.orderDesc('$createdAt')] }),
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
    const now = new Date();
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    const todayFollowUps = populatedContactLogs.filter((log) => {
      if (!log.follow_up_date) return false;
      const fDate = new Date(log.follow_up_date);
      return fDate <= todayEnd;
    });

    // 4. Timeline data for chart (Last 7 days)
    const timelineMap: Record<string, { emails: number; calls: number; whatsapp: number }> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(5, 10); // MM-DD
      timelineMap[key] = { emails: 0, calls: 0, whatsapp: 0 };
    }

    contactLogs.forEach((log) => {
      const dateKey = (log.contacted_at || log.$createdAt || '').slice(5, 10);
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
