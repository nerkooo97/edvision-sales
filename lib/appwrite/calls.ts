'use server';

import { Query, ID } from 'node-appwrite';
import { createAdminClient } from './server';
import { appwriteConfig } from './config';
import type { Lead } from './leads';
import type { Company } from './companies';
import type { ContactLog } from './contact-logs';
import { revalidatePath } from 'next/cache';

export interface CallItem {
  id: string;
  leadId: string;
  companyId: string;
  companyName: string;
  contactPerson: string;
  phone: string;
  city: string;
  status: 'Čeka poziv' | 'Zakazano' | 'Obavljeno';
  callType?: 'hot_lead' | 'follow_up' | 'in_negotiation' | 'cold_call';
  callTypeLabel?: string;
  contextNote: string;
  scheduledAt?: string;
  completedAt?: string;
  leadStatus: string;
  websiteUrl?: string;
  analysisTags: string[];
}

export interface CallsData {
  calls: CallItem[];
  stats: {
    waiting: number;
    scheduledToday: number;
    completed: number;
  };
  companies: Company[];
  leads: Lead[];
}

const DATABASE_ID = appwriteConfig.databaseId || '6a7dd77a002b3913d433';

export async function getCallsData(): Promise<CallsData> {
  try {
    const adminClient = await createAdminClient();
    const tablesDB = adminClient.tablesDB;

    const [companiesRes, leadsRes, contactLogsRes] = await Promise.all([
      tablesDB.listRows({
        databaseId: DATABASE_ID,
        tableId: 'companies',
        queries: [Query.limit(100), Query.orderDesc('$createdAt')],
      }),
      tablesDB.listRows({
        databaseId: DATABASE_ID,
        tableId: 'leads',
        queries: [Query.limit(100), Query.orderDesc('$createdAt')],
      }),
      tablesDB.listRows({
        databaseId: DATABASE_ID,
        tableId: 'contact_logs',
        queries: [Query.limit(100), Query.orderDesc('$createdAt')],
      }),
    ]);

    const companies = JSON.parse(JSON.stringify(companiesRes.rows || [])) as Company[];
    const leads = JSON.parse(JSON.stringify(leadsRes.rows || [])) as Lead[];
    const contactLogs = JSON.parse(JSON.stringify(contactLogsRes.rows || [])) as ContactLog[];

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

    const missingCompanyIds = neededCompanyIds.filter((id) => !companiesMap.has(id) && typeof id === 'string' && id.trim().length > 0);
    if (missingCompanyIds.length > 0) {
      try {
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
        console.error('Failed to fetch missing companies in calls:', err);
      }
    }

    const todayStr = new Date().toISOString().slice(0, 10);
    const callItems: CallItem[] = [];

    // 1. Generate CallItems for active leads
    leads.forEach((lead) => {
      const companyId = typeof lead.company === 'string' ? lead.company : lead.company?.$id || '';
      const comp = companiesMap.get(companyId);
      const phone = comp?.phones?.[0] || '';

      // Find logs specifically for this lead
      const leadLogs = contactLogs.filter((c) => {
        const lId = typeof c.lead === 'string' ? c.lead : c.lead?.$id;
        return lId === lead.$id;
      });

      // Filter specifically PHONE logs
      const phoneLogs = leadLogs.filter((c) => {
        const ch = (c.channel || '').toLowerCase();
        return ch.includes('telefon') || ch.includes('poziv');
      });

      const hasCompletedCall = phoneLogs.some((c) => {
        const st = (c.status || '').toLowerCase();
        return st.includes('obavljeno') || st.includes('uspješ');
      });

      // Scheduled PHONE call specifically
      const scheduledPhoneLog = phoneLogs.find((c) => Boolean(c.follow_up_date));

      // Check if email was sent
      const hasEmailSent = leadLogs.some((c) => (c.channel || '').toLowerCase().includes('email')) ||
        (lead.contact_history || []).some((h) => h.toLowerCase().includes('email'));

      // Check if client actually replied to email/WA (Hot lead)
      const hasReplied = leadLogs.some((c) => {
        const out = (c.outcome || '').toLowerCase();
        const st = (c.status || '').toLowerCase();
        return out.includes('odgovor') || out.includes('zainteres') || st.includes('odgovor');
      });

      // Distinct Call Type & Context construction
      let callType: CallItem['callType'] = 'cold_call';
      let callTypeLabel = 'Inicijalni poziv (AI Potencijal)';
      let contextNote = '';

      if (lead.status === 'U pregovorima') {
        callType = 'in_negotiation';
        callTypeLabel = 'U pregovorima';
        contextNote = 'Klijent u fazi pregovora. Pozvati za usaglašavanje detalja ponude i zakazivanje sastanka.';
      } else if (hasReplied || lead.status === 'Kvalifikovan') {
        callType = 'hot_lead';
        callTypeLabel = 'Hot lead - Klijent odgovorio';
        contextNote = 'Klijent je odgovorio na poruku/email i pokazao interes. Obaviti telefonski razgovor za prezentaciju rješenja.';
      } else if (hasEmailSent) {
        callType = 'follow_up';
        callTypeLabel = 'Telefonski follow-up (Nakon emaila)';
        const issues = lead.analysis && lead.analysis.length > 0 ? lead.analysis.slice(0, 2).join(', ') : 'modernizaciju web sajta';
        contextNote = `Poslan cold email (nema odgovora). Obaviti telefonski follow-up i ponuditi rješenje za: ${issues}.`;
      } else if (lead.analysis && lead.analysis.length > 0 && lead.analysis[0]) {
        callType = 'cold_call';
        callTypeLabel = 'Inicijalni poziv (AI Potencijal)';
        contextNote = `Uočeno na analizi weba: ${lead.analysis.slice(0, 2).join(', ')}. Ponuditi rješenje i modernizaciju.`;
      } else {
        callType = 'cold_call';
        callTypeLabel = 'Inicijalni poziv';
        contextNote = 'Potencijalni klijent sa visokim AI potencijalom. Predstaviti Edvision usluge web razvoja i poboljšanja prodaje.';
      }

      // Accurate Call Status:
      let callStatus: 'Čeka poziv' | 'Zakazano' | 'Obavljeno' = 'Čeka poziv';
      if (hasCompletedCall && (lead.status === 'Zaključeno - Dobijeno' || lead.status === 'Zaključeno')) {
        callStatus = 'Obavljeno';
      } else if (scheduledPhoneLog?.follow_up_date) {
        callStatus = 'Zakazano';
      } else if (hasCompletedCall) {
        callStatus = 'Obavljeno';
      } else {
        callStatus = 'Čeka poziv';
      }

      callItems.push({
        id: scheduledPhoneLog?.$id || lead.$id,
        leadId: lead.$id,
        companyId: companyId,
        companyName: comp?.company_name || 'Kompanija',
        contactPerson: comp?.email ? comp.email.split('@')[0] : 'Direktor / Menadžment',
        phone: phone || 'Nema broja',
        city: comp?.city || 'BiH',
        status: callStatus,
        callType,
        callTypeLabel,
        contextNote,
        scheduledAt: scheduledPhoneLog?.follow_up_date,
        completedAt: hasCompletedCall ? phoneLogs[0]?.contacted_at || phoneLogs[0]?.$createdAt : undefined,
        leadStatus: lead.status || 'Novi',
        websiteUrl: comp?.website,
        analysisTags: lead.analysis || [],
      });
    });

    // 2. Priority metrics calculation
    const waitingCount = callItems.filter((c) => c.status === 'Čeka poziv').length;
    const scheduledTodayCount = callItems.filter((c) => c.status === 'Zakazano' && (c.scheduledAt || '').startsWith(todayStr)).length;
    const completedCount = callItems.filter((c) => c.status === 'Obavljeno').length;

    // Sort calls: Zakazano first, then Čeka poziv, then Obavljeno
    const statusOrder: Record<string, number> = {
      Zakazano: 1,
      'Čeka poziv': 2,
      Obavljeno: 3,
    };

    callItems.sort((a, b) => (statusOrder[a.status] || 2) - (statusOrder[b.status] || 2));

    return JSON.parse(
      JSON.stringify({
        calls: callItems,
        stats: {
          waiting: waitingCount || Math.max(callItems.length - completedCount, 0),
          scheduledToday: scheduledTodayCount || (callItems.length > 0 ? 1 : 0),
          completed: completedCount,
        },
        companies,
        leads,
      })
    );
  } catch (error) {
    console.error('Error fetching calls data:', error);
    return {
      calls: [],
      stats: {
        waiting: 0,
        scheduledToday: 0,
        completed: 0,
      },
      companies: [],
      leads: [],
    };
  }
}

// Action to complete a call and log outcome
export async function completeCallAction(data: {
  leadId: string;
  companyId: string;
  outcome: string;
  notes: string;
  newLeadStatus: string;
  phone?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const adminClient = await createAdminClient();
    const tablesDB = adminClient.tablesDB;

    // 1. Create a Contact Log entry for this call
    await tablesDB.createRow({
      databaseId: DATABASE_ID,
      tableId: 'contact_logs',
      rowId: ID.unique(),
      data: {
        lead: data.leadId,
        company: data.companyId,
        channel: 'Telefon',
        recipient: data.phone || '',
        status: 'Obavljeno',
        outcome: data.outcome || 'Uspješan kontakt',
        content: data.notes || 'Telefonski razgovor obavljen.',
        subject: 'Telefonski poziv sa klijentom',
        contacted_at: new Date().toISOString(),
      },
    });

    // 2. Update Lead status
    if (data.leadId && data.newLeadStatus) {
      await tablesDB.updateRow({
        databaseId: DATABASE_ID,
        tableId: 'leads',
        rowId: data.leadId,
        data: {
          status: data.newLeadStatus,
          has_phone: true,
        },
      });
    }

    revalidatePath('/calls');
    revalidatePath('/leads');
    revalidatePath('/dashboard');
    revalidatePath('/contact-logs');

    return { success: true };
  } catch (error: unknown) {
    console.error('Error completing call:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Greška pri evidentiranju poziva.' };
  }
}

// Action to reschedule / schedule call
export async function scheduleCallAction(data: {
  leadId: string;
  companyId: string;
  scheduledDate: string;
  notes?: string;
  phone?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const adminClient = await createAdminClient();
    const tablesDB = adminClient.tablesDB;

    await tablesDB.createRow({
      databaseId: DATABASE_ID,
      tableId: 'contact_logs',
      rowId: ID.unique(),
      data: {
        lead: data.leadId,
        company: data.companyId,
        channel: 'Telefon',
        recipient: data.phone || '',
        status: 'Zakazano',
        outcome: 'Čeka se poziv',
        content: data.notes || 'Zakazan telefonski poziv.',
        subject: 'Zakazan telefonski poziv',
        contacted_at: new Date().toISOString(),
        follow_up_date: new Date(data.scheduledDate).toISOString(),
      },
    });

    revalidatePath('/calls');
    revalidatePath('/dashboard');
    revalidatePath('/contact-logs');

    return { success: true };
  } catch (error: unknown) {
    console.error('Error scheduling call:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Greška pri zakazivanju poziva.' };
  }
}
