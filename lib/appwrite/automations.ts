'use server';

import { Query } from 'node-appwrite';
import { createAdminClient, getLoggedInUser } from './server';
import { appwriteConfig } from './config';
import type { Company } from './companies';
import type { ContactLog } from './contact-logs';
import type { Lead } from './leads';
import { fetchN8nWorkflows, fetchN8nExecutions } from '../n8n/client';
import type { N8nWorkflow, N8nExecution } from '../n8n/types';
import { getAutomationSettings, type AutomationSettings } from './automation-settings';
import { stripDiacritics } from '../utils';
import { checkSalesAccess } from '../access/server/access';
import { fetchAllRows, fetchRowsByIds, flattenRelations, relationId } from './rows';

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
  automationSettings: AutomationSettings;
}

const DATABASE_ID = appwriteConfig.databaseId || '6a7dd77a002b3913d433';
const BUSINESS_TIME_ZONE = 'Europe/Sarajevo';
const SUCCESSFUL_EMAIL_STATUSES = new Set(['poslano', 'otvoreno', 'otvorena', 'odgovoreno']);
const RECENT_LOGS_COUNT = 15;
const TODAY_WINDOW_MS = 48 * 60 * 60 * 1000;

function sarajevoDateKey(value: string | Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: BUSINESS_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(value));
  const map = Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));
  return `${map.year}-${map.month}-${map.day}`;
}

async function requireAuthenticatedUser() {
  const user = await getLoggedInUser();
  if (!user) {
    throw new Error('Unauthorized');
  }
}

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
  const denied = await checkSalesAccess('automations', 'view');
  if (denied) throw new Error(denied);

  await requireAuthenticatedUser();

  try {
    const adminClient = await createAdminClient();
    const tablesDB = adminClient.tablesDB;

    // 1. Samo ono što stranica prikazuje: današnji logovi (nekoliko kolona), 15 zadnjih logova i firme
    //    iza njih, plus ukupan broj logova. Ranije se na svako osvježavanje (svakih 15 s dok flow radi)
    //    čitalo po 500 punih logova, firmi i leadova.
    //    Današnji logovi: sve kreirano ili kontaktirano u zadnjih 48 h; tačan dan (Sarajevo) se filtrira
    //    niže, isto kao ranije -- 48 h sigurno pokriva cijeli današnji dan.
    const since = new Date(Date.now() - TODAY_WINDOW_MS).toISOString();
    const [todayLogRows, recentLogsRes, logCountRes, workflows, executions, automationSettings] = await Promise.all([
      fetchAllRows(tablesDB, 'contact_logs', [
        Query.select(['$id', '$createdAt', 'contacted_at', 'channel', 'status', 'outcome', 'recipient', 'company.$id']),
        Query.or([Query.greaterThanEqual('contacted_at', since), Query.greaterThanEqual('$createdAt', since)]),
      ]),
      tablesDB.listRows({
        databaseId: DATABASE_ID,
        tableId: 'contact_logs',
        queries: [Query.limit(RECENT_LOGS_COUNT), Query.orderDesc('$createdAt')],
        total: false,
      }),
      // Samo za ukupan broj logova: Appwrite broji, a vraća jedan red s jednom kolonom.
      tablesDB.listRows({
        databaseId: DATABASE_ID,
        tableId: 'contact_logs',
        queries: [Query.select(['$id']), Query.limit(1)],
      }),
      fetchN8nWorkflows().catch(() => []),
      fetchN8nExecutions(15).catch(() => []),
      getAutomationSettings(),
    ]);

    const todayLogs = flattenRelations<ContactLog>(todayLogRows, ['company']);
    const recentContactLogs = JSON.parse(JSON.stringify(recentLogsRes.rows || [])) as ContactLog[];

    // Firme za 15 zadnjih logova: direktno preko log.company, a za logove bez firme preko njihovog leada.
    const leadIdsWithoutCompany = recentContactLogs
      .filter((log) => !relationId(log.company))
      .map((log) => relationId(log.lead))
      .filter((id): id is string => Boolean(id));
    const leads = flattenRelations<Lead>(
      await fetchRowsByIds(tablesDB, 'leads', leadIdsWithoutCompany, ['$id', 'company.$id']),
      ['company']
    );
    const leadsMap = new Map<string, Lead>();
    leads.forEach((l) => leadsMap.set(l.$id, l));

    const companyIds = [
      ...recentContactLogs.map((log) => relationId(log.company)),
      ...leads.map((lead) => relationId(lead.company)),
    ].filter((id): id is string => Boolean(id));
    const companies = (await fetchRowsByIds(tablesDB, 'companies', companyIds, ['$id', 'company_name'])) as unknown as Company[];
    const companiesMap = new Map<string, Company>();
    companies.forEach((c) => companiesMap.set(c.$id, c));

    // Izračunaj statistiku za današnji dan (brojeći jedinstvene kompanije)
    const today = sarajevoDateKey(new Date());

    const uniqueCompanyIdsToday = new Set<string>();
    let errorsToday = 0;

    todayLogs.forEach((log) => {
      const timestamp = log.contacted_at || log.$createdAt;
      if (timestamp && sarajevoDateKey(timestamp) === today) {
        if ((log.channel || '').toLowerCase() !== 'email') return;
        // Jedinstveni identifikator firme (ID kompanije ili email primaoca)
        const companyKey = String(
          (typeof log.company === 'string' ? log.company : (log.company as unknown as { $id?: string })?.$id) ||
          log.recipient ||
          log.$id
        );
        if (SUCCESSFUL_EMAIL_STATUSES.has((log.status || '').toLowerCase())) {
          uniqueCompanyIdsToday.add(companyKey);
        }

        const st = stripDiacritics((log.status || '').toLowerCase());
        const out = stripDiacritics((log.outcome || '').toLowerCase());
        if (st.includes('gresk') || st.includes('error') || out.includes('gresk') || out.includes('nevazec')) {
          errorsToday++;
        }
      }
    });

    const processedToday = uniqueCompanyIdsToday.size;

    // Mapiranje logova
    const recentLogs: AutomationLogItem[] = recentContactLogs.map((log) => {
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

      const st = stripDiacritics((log.status || '').toLowerCase());
      if (st.includes('gresk') || st.includes('error')) {
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
    const outreachWf = workflows.find((workflow) => workflow.name === 'ED Vision — Email Outreach');
    const followupWf = workflows.find((workflow) => workflow.name === 'ED Vision - Follow-up & WhatsApp');
    const scheduleParts = [
      outreachWf?.schedule?.time ? `${outreachWf.schedule.time} (Outreach)` : null,
      followupWf?.schedule?.time ? `${followupWf.schedule.time} (Follow-up)` : null,
    ].filter(Boolean);

    return {
      isActive: workflows.length > 0 ? isAnyActive : false,
      processedToday,
      errorsToday,
      totalOutreach: logCountRes.total,
      nextSchedule: isAnyActive
        ? scheduleParts.length > 0
          ? scheduleParts.join(' / ')
          : 'Raspored nije prepoznat'
        : 'Pauzirano',
      recentLogs,
      workflows,
      executions,
      n8nConnected: workflows.length > 0 || executions.length > 0,
      automationSettings,
    };
  } catch (error) {
    console.error('Error fetching automations data:', error);
    return {
      isActive: false,
      processedToday: 0,
      errorsToday: 0,
      totalOutreach: 0,
      nextSchedule: 'Nepoznato (n8n/Appwrite nedostupni)',
      recentLogs: [],
      workflows: [],
      executions: [],
      n8nConnected: false,
      automationSettings: { dailyLimit: 50, delayMinutes: 15 },
    };
  }
}

