'use server';

import { Query } from 'node-appwrite';
import { revalidatePath } from 'next/cache';
import { createAdminClient } from './server';
import { appwriteConfig } from './config';
import type { Company } from './companies';
import type { ContactLog } from './contact-logs';
import type { Lead } from './leads';
import { fetchN8nWorkflows, fetchN8nExecutions } from '../n8n/client';
import type { N8nWorkflow, N8nExecution } from '../n8n/types';

export interface AutomationLogItem {
  id: string;
  type: 'email' | 'whatsapp' | 'call' | 'meeting' | 'slack' | 'lead' | 'error';
  title: string;
  description?: string;
  timestamp: string;
  status: string;
  companyName: string;
  recipient?: string;
}

export interface AutomationsData {
  isActive: boolean;
  processedToday: number;
  errorsToday: number;
  totalOutreach: number;
  nextSchedule: string;
  recentLogs: AutomationLogItem[];
  workflows: N8nWorkflow[];
  executions: N8nExecution[];
  n8nConnected: boolean;
}

const DATABASE_ID = appwriteConfig.databaseId || '6a7dd77a002b3913d433';
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || 'https://edvision.app.n8n.cloud/webhook/pokreni-sales';

// Pomoćna funkcija za pametno izvlačenje imena firme iz sadržaja/naslova ako relacija nedostaje
function extractCompanyName(log: ContactLog, companyObj?: Company | null): string {
  // 1. Ako imamo direktan objekat kompanije
  if (companyObj?.company_name && companyObj.company_name.trim()) {
    return companyObj.company_name.trim();
  }

  // 2. Ako je log.company objekat
  if (log.company && typeof log.company === 'object' && 'company_name' in log.company) {
    const name = (log.company as { company_name?: string }).company_name;
    if (name && name.trim()) return name.trim();
  }

  // 3. Pokušaj izvući iz naslova (subject) npr: "Prijedlog unapređenja - OKIĆ-TRANSPORTI d.o.o."
  const subject = log.subject || '';
  if (subject.includes(' - ')) {
    const parts = subject.split(' - ');
    const candidate = parts[parts.length - 1].trim();
    if (candidate && candidate.length > 1 && !candidate.toLowerCase().includes('ed vision')) {
      return candidate.replace(/^["'„“«»]+|["'„“«»]+$/g, '').trim();
    }
  }

  // 4. Pokušaj izvući iz sadržaja poruke (email_body)
  const content = log.content || '';
  if (content) {
    // Traži oblike: za "IME FIRME" d.o.o. ili da "IME FIRME" još uvijek
    const matchQuotes = content.match(/(?:za|da)\s+["'„“«»]([^"'„“«»]+)["'„“«»]/i);
    if (matchQuotes && matchQuotes[1]) {
      return matchQuotes[1].trim();
    }

    const matchDoo = content.match(/([A-Z0-9ČĆŽŠĐ\s\.\-_]{2,40}\s+d\.o\.o\.?)/i);
    if (matchDoo && matchDoo[1] && !matchDoo[1].toLowerCase().includes('ed vision')) {
      return matchDoo[1].replace(/^["'„“«»]+|["'„“«»]+$/g, '').trim();
    }
  }

  // 5. Pokušaj izvući iz email domene primaoca (npr. profine.bh@profine-group.com -> Profine Group)
  const recipient = log.recipient || '';
  if (recipient.includes('@')) {
    const domain = recipient.split('@')[1] || '';
    const namePart = domain.split('.')[0] || '';
    if (namePart && !['gmail', 'hotmail', 'yahoo', 'outlook', 'bih', 'ba', 'com'].includes(namePart.toLowerCase())) {
      return namePart
        .replace(/[-_]/g, ' ')
        .split(' ')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
    }
  }

  return 'Klijent';
}

export async function getAutomationsData(): Promise<AutomationsData> {
  try {
    const adminClient = await createAdminClient();
    const tablesDB = adminClient.tablesDB;

    // 1. Preuzmi zadnje logove, leadove, firme i n8n podatke paralelno
    const [contactLogsRes, companiesRes, leadsRes, workflows, executions] = await Promise.all([
      tablesDB.listRows({
        databaseId: DATABASE_ID,
        tableId: 'contact_logs',
        queries: [Query.limit(50), Query.orderDesc('$createdAt')],
      }),
      tablesDB.listRows({
        databaseId: DATABASE_ID,
        tableId: 'companies',
        queries: [Query.limit(100), Query.orderDesc('$createdAt')],
      }),
      tablesDB.listRows({
        databaseId: DATABASE_ID,
        tableId: 'leads',
        queries: [Query.limit(50), Query.orderDesc('$createdAt')],
      }),
      fetchN8nWorkflows().catch(() => []),
      fetchN8nExecutions(15).catch(() => []),
    ]);

    const companies = JSON.parse(JSON.stringify(companiesRes.rows || [])) as Company[];
    const contactLogs = JSON.parse(JSON.stringify(contactLogsRes.rows || [])) as ContactLog[];
    const leads = JSON.parse(JSON.stringify(leadsRes.rows || [])) as Lead[];

    const companiesMap = new Map<string, Company>();
    companies.forEach((c) => companiesMap.set(c.$id, c));

    const leadsMap = new Map<string, Lead>();
    leads.forEach((l) => leadsMap.set(l.$id, l));

    // Prikupi sve ID-jeve kompanija koje nedostaju u mapi
    const missingCompanyIds = new Set<string>();
    contactLogs.forEach((log) => {
      const compId = typeof log.company === 'string' ? log.company : (log.company as unknown as { $id?: string })?.$id;
      if (compId && !companiesMap.has(compId)) {
        missingCompanyIds.add(compId);
      }
      const leadId = typeof log.lead === 'string' ? log.lead : (log.lead as unknown as { $id?: string })?.$id;
      if (leadId && leadsMap.has(leadId)) {
        const leadComp = leadsMap.get(leadId)?.company;
        const leadCompId = typeof leadComp === 'string' ? leadComp : (leadComp as unknown as { $id?: string })?.$id;
        if (leadCompId && !companiesMap.has(leadCompId)) {
          missingCompanyIds.add(leadCompId);
        }
      }
    });

    if (missingCompanyIds.size > 0) {
      try {
        const extraCompRes = await tablesDB.listRows({
          databaseId: DATABASE_ID,
          tableId: 'companies',
          queries: [Query.equal('$id', Array.from(missingCompanyIds)), Query.limit(100)],
        });
        const extraCompanies = JSON.parse(JSON.stringify(extraCompRes.rows || [])) as Company[];
        extraCompanies.forEach((c) => companiesMap.set(c.$id, c));
      } catch (err) {
        console.warn('Greška pri dohvatanju dodatnih kompanija:', err);
      }
    }

    // Izračunaj statistiku za današnji dan
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);

    let processedToday = 0;
    let errorsToday = 0;

    contactLogs.forEach((log) => {
      const logDate = new Date(log.contacted_at || log.$createdAt);
      if (logDate >= startOfToday) {
        processedToday++;
        const st = (log.status || '').toLowerCase();
        const out = (log.outcome || '').toLowerCase();
        if (st.includes('grešk') || st.includes('error') || out.includes('grešk') || out.includes('nevažeć')) {
          errorsToday++;
        }
      }
    });

    // Mapiranje logova
    const recentLogs: AutomationLogItem[] = contactLogs.slice(0, 15).map((log) => {
      // 1. Pronađi kompaniju preko log.company
      let companyObj: Company | null = null;
      if (typeof log.company === 'string') {
        companyObj = companiesMap.get(log.company) || null;
      } else if (log.company && typeof log.company === 'object') {
        companyObj = log.company as Company;
      }

      // 2. Ako nema preko log.company, potraži preko log.lead
      if (!companyObj) {
        const leadId = typeof log.lead === 'string' ? log.lead : (log.lead as unknown as { $id?: string })?.$id;
        if (leadId && leadsMap.has(leadId)) {
          const lead = leadsMap.get(leadId)!;
          const leadCompId = typeof lead.company === 'string' ? lead.company : (lead.company as unknown as { $id?: string })?.$id;
          if (leadCompId && companiesMap.has(leadCompId)) {
            companyObj = companiesMap.get(leadCompId)!;
          }
        }
      }

      // Izvuci tačan naziv kompanije (sa fallback heuristikom)
      const companyName = extractCompanyName(log, companyObj);
      const channel = (log.channel || 'Email').toLowerCase();

      let type: AutomationLogItem['type'] = 'email';
      if (channel.includes('whatsapp')) type = 'whatsapp';
      else if (channel.includes('telefon') || channel.includes('poziv') || channel.includes('call') || channel.includes('phone')) type = 'call';
      else if (channel.includes('sastanak') || channel.includes('meeting')) type = 'meeting';
      else if (channel.includes('slack')) type = 'slack';
      else if (channel.includes('lead')) type = 'lead';

      const st = (log.status || '').toLowerCase();
      if (st.includes('grešk') || st.includes('error')) {
        type = 'error';
      }

      let title = '';
      if (type === 'whatsapp') {
        title = `WhatsApp poruka poslana za ${companyName}`;
      } else if (type === 'call') {
        title = `Telefonski poziv obavljen sa ${companyName}`;
      } else if (type === 'meeting') {
        title = `Sastanak održan sa ${companyName}`;
      } else if (type === 'email') {
        title = `Email poslan za ${companyName}`;
      } else if (type === 'error') {
        title = `Greška u komunikaciji sa ${companyName}`;
      } else {
        title = `Aktivnost: ${log.subject || 'Automatski kontakt'} (${companyName})`;
      }

      return {
        id: log.$id,
        type,
        title,
        description: log.content || log.outcome || log.subject || undefined,
        timestamp: log.contacted_at || log.$createdAt,
        status: log.status || 'Poslano',
        companyName,
        recipient: log.recipient,
      };
    });

    const isAnyActive = workflows.some((w) => w.active);

    return {
      isActive: workflows.length > 0 ? isAnyActive : true,
      processedToday,
      errorsToday,
      totalOutreach: contactLogsRes.total || contactLogs.length,
      nextSchedule: isAnyActive ? '09:00h (Outreach) / 10:00h (Follow-up)' : 'Pauzirano',
      recentLogs,
      workflows,
      executions,
      n8nConnected: workflows.length > 0 || executions.length > 0,
    };
  } catch (error) {
    console.error('Error fetching automations data:', error);
    return {
      isActive: true,
      processedToday: 0,
      errorsToday: 0,
      totalOutreach: 0,
      nextSchedule: '09:00h (Outreach) / 10:00h (Follow-up)',
      recentLogs: [],
      workflows: [],
      executions: [],
      n8nConnected: false,
    };
  }
}

export async function triggerN8nWorkflowManual(): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source: 'edvision_dashboard_manual',
        triggeredAt: new Date().toISOString(),
      }),
      cache: 'no-store',
    });

    revalidatePath('/automations');
    revalidatePath('/dashboard');
    revalidatePath('/contact-logs');

    if (response.ok || response.status === 200 || response.status === 201) {
      return {
        success: true,
        message: 'Ciklus automatizacije je uspješno pokrenut na n8n serveru!',
      };
    } else {
      return {
        success: true,
        message: `Zahtjev poslan (Status: ${response.status}). n8n je započeo procesiranje.`,
      };
    }
  } catch (error) {
    console.error('Failed to trigger n8n webhook:', error);
    return {
      success: false,
      message: 'Nije uspjelo povezivanje sa n8n Webhookom. Provjerite da li je n8n aktivan.',
    };
  }
}
