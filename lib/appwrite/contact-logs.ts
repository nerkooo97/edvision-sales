'use server';

import { Query, ID } from 'node-appwrite';
import { revalidatePath } from 'next/cache';
import { createAdminClient } from './server';
import { appwriteConfig } from './config';
import type { Company } from './companies';
import type { Lead } from './leads';

export interface ContactLog {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  channel?: string;
  recipient?: string;
  contacted_at?: string;
  subject?: string;
  content?: string;
  status?: string;
  outcome?: string;
  follow_up_date?: string;
  lead?: Lead | string | null;
  company?: Company | string | null;
}

export type ContactLogInput = {
  channel?: string;
  recipient?: string;
  contacted_at?: string;
  subject?: string;
  content?: string;
  status?: string;
  outcome?: string;
  follow_up_date?: string;
  lead?: string | null;
  company?: string | null;
};

export interface GetContactLogsParams {
  page?: number;
  limit?: number;
  channel?: string;
  status?: string;
  leadId?: string;
  companyId?: string;
}

export interface GetContactLogsResult {
  contactLogs: ContactLog[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const DATABASE_ID = appwriteConfig.databaseId || '6a7dd77a002b3913d433';
const TABLE_ID = 'contact_logs';

async function getClient() {
  const adminClient = await createAdminClient();
  return adminClient.tablesDB;
}

export async function getContactLogs({
  page = 1,
  limit = 15,
  channel = '',
  status = '',
  leadId = '',
  companyId = '',
}: GetContactLogsParams = {}): Promise<GetContactLogsResult> {
  try {
    const clientToUse = await getClient();

    const queries = [
      Query.limit(limit),
      Query.offset((page - 1) * limit),
      Query.orderDesc('$createdAt'),
    ];

    if (channel && channel.trim() && channel !== 'all') {
      queries.push(Query.equal('channel', channel.trim()));
    }

    if (status && status.trim() && status !== 'all') {
      queries.push(Query.equal('status', status.trim()));
    }

    if (leadId && leadId.trim()) {
      queries.push(Query.equal('lead', leadId.trim()));
    }

    if (companyId && companyId.trim()) {
      queries.push(Query.equal('company', companyId.trim()));
    }

    const response = await clientToUse.listRows({
      databaseId: DATABASE_ID,
      tableId: TABLE_ID,
      queries,
    });

    const total = response.total;
    const totalPages = Math.ceil(total / limit) || 1;
    const rawRows = response.rows ?? (response as unknown as { documents?: unknown[] }).documents ?? [];
    const plainRows = JSON.parse(JSON.stringify(rawRows)) as ContactLog[];

    // Auto-populate company objects if company is stored as string ID
    const companyIdsToFetch = Array.from(
      new Set(
        plainRows
          .map((log) => (typeof log.company === 'string' ? log.company : (log.company as unknown as { $id?: string })?.$id))
          .filter((c): c is string => typeof c === 'string' && Boolean(c))
      )
    );

    if (companyIdsToFetch.length > 0) {
      try {
        const companiesRes = await clientToUse.listRows({
          databaseId: DATABASE_ID,
          tableId: 'companies',
          queries: [Query.equal('$id', companyIdsToFetch), Query.limit(100)],
        });
        const fetchedCompanies = JSON.parse(JSON.stringify(companiesRes.rows || [])) as Company[];
        const companyMap = new Map<string, Company>();
        fetchedCompanies.forEach((comp) => companyMap.set(comp.$id, comp));

        plainRows.forEach((log) => {
          if (typeof log.company === 'string' && companyMap.has(log.company)) {
            log.company = companyMap.get(log.company)!;
          }
        });
      } catch (err) {
        console.warn('Could not batch-populate companies for contact logs:', err);
      }
    }

    return JSON.parse(
      JSON.stringify({
        contactLogs: plainRows,
        total,
        page,
        limit,
        totalPages,
      })
    );
  } catch (error) {
    console.error('Error fetching contact logs:', error);
    return {
      contactLogs: [],
      total: 0,
      page: 1,
      limit,
      totalPages: 1,
    };
  }
}

export async function getContactLogsByLeadId(leadId: string): Promise<ContactLog[]> {
  if (!leadId) return [];
  try {
    const clientToUse = await getClient();
    const response = await clientToUse.listRows({
      databaseId: DATABASE_ID,
      tableId: TABLE_ID,
      queries: [
        Query.equal('lead', leadId),
        Query.orderDesc('$createdAt'),
        Query.limit(100),
      ],
    });

    const rawRows = response.rows ?? (response as unknown as { documents?: unknown[] }).documents ?? [];
    return JSON.parse(JSON.stringify(rawRows)) as ContactLog[];
  } catch (error) {
    console.error('Error fetching contact logs by lead id:', error);
    return [];
  }
}

export async function createContactLog(data: ContactLogInput): Promise<{ success: boolean; data?: ContactLog; error?: string }> {
  try {
    const clientToUse = await getClient();

    const cleanData: Record<string, unknown> = {
      channel: data.channel?.trim() || 'Email',
      recipient: data.recipient?.trim() || null,
      contacted_at: data.contacted_at || new Date().toISOString(),
      subject: data.subject?.trim() || null,
      content: data.content?.trim() || null,
      status: data.status?.trim() || 'Poslano',
      outcome: data.outcome?.trim() || null,
      follow_up_date: data.follow_up_date || null,
    };

    if (data.lead) cleanData.lead = data.lead;
    if (data.company) cleanData.company = data.company;

    const row = await clientToUse.createRow({
      databaseId: DATABASE_ID,
      tableId: TABLE_ID,
      rowId: ID.unique(),
      data: cleanData,
    });

    revalidatePath('/contact-logs');
    revalidatePath('/leads');
    return { success: true, data: row as unknown as ContactLog };
  } catch (error) {
    console.error('Error creating contact log:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Greška pri kreiranju zapisa kontakta',
    };
  }
}

export async function updateContactLog(
  logId: string,
  data: Partial<ContactLogInput>
): Promise<{ success: boolean; data?: ContactLog; error?: string }> {
  try {
    const clientToUse = await getClient();

    const cleanData: Record<string, unknown> = {};

    if (data.channel !== undefined) cleanData.channel = data.channel.trim();
    if (data.recipient !== undefined) cleanData.recipient = data.recipient?.trim() || null;
    if (data.contacted_at !== undefined) cleanData.contacted_at = data.contacted_at || null;
    if (data.subject !== undefined) cleanData.subject = data.subject?.trim() || null;
    if (data.content !== undefined) cleanData.content = data.content?.trim() || null;
    if (data.status !== undefined) cleanData.status = data.status?.trim() || null;
    if (data.outcome !== undefined) cleanData.outcome = data.outcome?.trim() || null;
    if (data.follow_up_date !== undefined) cleanData.follow_up_date = data.follow_up_date || null;
    if (data.lead !== undefined) cleanData.lead = data.lead || null;
    if (data.company !== undefined) cleanData.company = data.company || null;

    const row = await clientToUse.updateRow({
      databaseId: DATABASE_ID,
      tableId: TABLE_ID,
      rowId: logId,
      data: cleanData,
    });

    revalidatePath('/contact-logs');
    return { success: true, data: row as unknown as ContactLog };
  } catch (error) {
    console.error('Error updating contact log:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Greška pri izmjeni zapisa kontakta',
    };
  }
}

export async function deleteContactLog(logId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const clientToUse = await getClient();
    await clientToUse.deleteRow({
      databaseId: DATABASE_ID,
      tableId: TABLE_ID,
      rowId: logId,
    });

    revalidatePath('/contact-logs');
    return { success: true };
  } catch (error) {
    console.error('Error deleting contact log:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Greška pri brisanju zapisa kontakta',
    };
  }
}
