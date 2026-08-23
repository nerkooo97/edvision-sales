'use server';

import { Query } from 'node-appwrite';
import { createAdminClient } from './server';
import { appwriteConfig } from './config';
import type { Company } from './companies';
import type { ContactLog } from './contact-logs';

export interface EmailLog {
  $id: string;
  $createdAt: string;
  companyName: string;
  companyEmail: string;
  companyCity?: string;
  subject: string;
  preview: string;
  body: string;
  status: 'Otvoreno' | 'Poslano' | 'Odgovoreno' | 'Bez odgovora' | 'Greška';
  sentAt: string;
  leadId?: string;
  companyId?: string;
}

const DATABASE_ID = appwriteConfig.databaseId || '6a7dd77a002b3913d433';

export async function getEmailLogs(): Promise<EmailLog[]> {
  try {
    const adminClient = await createAdminClient();
    const tablesDB = adminClient.tablesDB;

    // Fetch contact logs that are email channel
    const logsRes = await tablesDB.listRows({
      databaseId: DATABASE_ID,
      tableId: 'contact_logs',
      queries: [Query.equal('channel', 'Email'), Query.limit(100), Query.orderDesc('$createdAt')],
    });

    const contactLogs = JSON.parse(JSON.stringify(logsRes.rows || [])) as ContactLog[];

    // Fetch associated companies
    const companyIds = Array.from(
      new Set(
        contactLogs
          .map((c) => (typeof c.company === 'string' ? c.company : (c.company as unknown as { $id?: string })?.$id))
          .filter((id): id is string => Boolean(id))
      )
    );

    const companiesMap = new Map<string, Company>();
    if (companyIds.length > 0) {
      try {
        const compRes = await tablesDB.listRows({
          databaseId: DATABASE_ID,
          tableId: 'companies',
          queries: [Query.equal('$id', companyIds), Query.limit(100)],
        });
        const compRows = JSON.parse(JSON.stringify(compRes.rows || [])) as Company[];
        compRows.forEach((c) => companiesMap.set(c.$id, c));
      } catch (err) {
        console.error('Failed to fetch companies for email logs:', err);
      }
    }

    const realEmailLogs: EmailLog[] = contactLogs.map((log) => {
      const cId = typeof log.company === 'string' ? log.company : (log.company as unknown as { $id?: string })?.$id;
      const comp = cId ? companiesMap.get(cId) : (typeof log.company === 'object' ? log.company : null);
      
      const compName = comp?.company_name || 'Kompanija';
      const compEmail = comp?.email || log.recipient || 'kontakt@klijent.ba';
      const compCity = comp?.city || '';

      const outcomeLower = (log.outcome || log.status || '').toLowerCase();
      let status: EmailLog['status'] = 'Poslano';
      if (outcomeLower.includes('odgovor') || outcomeLower.includes('zainteresov') || outcomeLower.includes('pozitiv')) {
        status = 'Odgovoreno';
      } else if (outcomeLower.includes('otvor') || outcomeLower.includes('pročit')) {
        status = 'Otvoreno';
      } else if (outcomeLower.includes('nije') || outcomeLower.includes('bez') || outcomeLower.includes('odbij')) {
        status = 'Bez odgovora';
      } else if (outcomeLower.includes('grešk') || outcomeLower.includes('bounce') || outcomeLower.includes('fail')) {
        status = 'Greška';
      }

      const note = log.content || 'Inicijalni cold email sa ponudom rješenja za modernizaciju poslovanja.';
      const subject = log.subject || 'Ponuda za saradnju i unaprjeđenje prodaje';
      const preview = note.length > 120 ? note.slice(0, 120) + '...' : note;

      const dateObj = log.contacted_at || log.$createdAt ? new Date(log.contacted_at || log.$createdAt) : new Date();
      const day = String(dateObj.getDate()).padStart(2, '0');
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const year = dateObj.getFullYear();
      const hours = String(dateObj.getHours()).padStart(2, '0');
      const mins = String(dateObj.getMinutes()).padStart(2, '0');
      const sentAt = `${day}.${month}.${year} ${hours}:${mins}`;

      return {
        $id: log.$id,
        $createdAt: log.$createdAt,
        companyName: compName,
        companyEmail: compEmail,
        companyCity: compCity,
        subject,
        preview,
        body: note,
        status,
        sentAt,
        leadId: typeof log.lead === 'string' ? log.lead : (log.lead as unknown as { $id?: string })?.$id,
        companyId: cId,
      };
    });

    return realEmailLogs;
  } catch (error) {
    console.error('Error fetching email logs:', error);
    return [];
  }
}
