'use server';

import { Query, ID } from 'node-appwrite';
import { revalidatePath } from 'next/cache';
import { createAdminClient } from './server';
import { appwriteConfig } from './config';
import type { Company } from './companies';
import type { ContactLog } from './contact-logs';

export interface Lead {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  company?: Company | string | null;
  has_web?: boolean;
  has_email?: boolean;
  has_phone?: boolean;
  status?: string;
  analysis?: string[];
  contact_history?: string[];
  contact_logs?: ContactLog[];
}

export type LeadInput = {
  company?: string | null; // Company ID
  has_web?: boolean;
  has_email?: boolean;
  has_phone?: boolean;
  status?: string;
  analysis?: string[];
  contact_history?: string[];
};

export interface GetLeadsParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}

export interface GetLeadsResult {
  leads: Lead[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const DATABASE_ID = appwriteConfig.databaseId || '6a7dd77a002b3913d433';
const TABLE_ID = 'leads';

async function getClient() {
  const adminClient = await createAdminClient();
  return adminClient.tablesDB;
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

export async function getLeads({
  page = 1,
  limit = 15,
  search = '',
  status = '',
}: GetLeadsParams = {}): Promise<GetLeadsResult> {
  try {
    const clientToUse = await getClient();

    const isSearching = !!(search && search.trim());
    const fetchLimit = isSearching ? 1000 : limit;
    const fetchOffset = isSearching ? 0 : (page - 1) * limit;

    const queries = [
      Query.limit(fetchLimit),
      Query.offset(fetchOffset),
      Query.orderDesc('$createdAt'),
    ];

    if (status && status.trim() && status !== 'all') {
      queries.push(Query.equal('status', status.trim()));
    }

    const response = await clientToUse.listRows({
      databaseId: DATABASE_ID,
      tableId: TABLE_ID,
      queries,
    });

    const rawRows = response.rows ?? (response as unknown as { documents?: unknown[] }).documents ?? [];
    const plainRows = JSON.parse(JSON.stringify(rawRows)) as Lead[];

    // Populate company objects if company is an ID string
    const companyIds = Array.from(
      new Set(
        plainRows
          .map((r) => (typeof r.company === 'string' ? r.company : (r.company as unknown as { $id?: string })?.$id))
          .filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
      )
    );

    const companiesMap = new Map<string, Company>();
    if (companyIds.length > 0) {
      try {
        const compChunks = chunkArray(companyIds, 100);
        const compResults = await Promise.all(
          compChunks.map((chunk) =>
            clientToUse.listRows({
              databaseId: DATABASE_ID,
              tableId: 'companies',
              queries: [Query.equal('$id', chunk), Query.limit(100)],
            }).catch((err) => {
              console.error('Failed to listRows for company chunk:', err);
              return { rows: [] };
            })
          )
        );
        compResults.forEach((compRes) => {
          const compRows = JSON.parse(JSON.stringify(compRes.rows || [])) as Company[];
          compRows.forEach((c) => companiesMap.set(c.$id, c));
        });
      } catch (err) {
        console.error('Failed to populate companies by ID for leads, falling back:', err);
      }
    }

    const populatedLeads = plainRows.map((lead) => {
      const companyId = typeof lead.company === 'string' ? lead.company : (lead.company as unknown as { $id?: string })?.$id;
      if (companyId && companiesMap.has(companyId)) {
        return {
          ...lead,
          company: companiesMap.get(companyId)!,
        };
      }
      return lead;
    });

    // Populate contact_logs for each lead (match by lead ID and by associated company ID)
    const leadIds = Array.from(
      new Set(
        populatedLeads
          .map((l) => l.$id)
          .filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
      )
    );
    const associatedCompanyIds = Array.from(
      new Set(
        populatedLeads
          .map((l) => (typeof l.company === 'string' ? l.company : (l.company as unknown as { $id?: string })?.$id))
          .filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
      )
    );

    if (leadIds.length > 0 || associatedCompanyIds.length > 0) {
      try {
        let logRows: ContactLog[] = [];
        const leadChunks = chunkArray(leadIds, 100);
        const compChunks = chunkArray(associatedCompanyIds, 100);

        const leadLogPromises = leadChunks.map((chunk) =>
          clientToUse.listRows({
            databaseId: DATABASE_ID,
            tableId: 'contact_logs',
            queries: [Query.equal('lead', chunk), Query.limit(100), Query.orderDesc('$createdAt')],
          }).catch(() => ({ rows: [] }))
        );

        const compLogPromises = compChunks.map((chunk) =>
          clientToUse.listRows({
            databaseId: DATABASE_ID,
            tableId: 'contact_logs',
            queries: [Query.equal('company', chunk), Query.limit(100), Query.orderDesc('$createdAt')],
          }).catch(() => ({ rows: [] }))
        );

        const logResults = await Promise.all([...leadLogPromises, ...compLogPromises]);
        logResults.forEach((res) => {
          const rows = JSON.parse(JSON.stringify(res.rows || [])) as ContactLog[];
          logRows.push(...rows);
        });

        const logsByLead = new Map<string, ContactLog[]>();
        const logsByCompany = new Map<string, ContactLog[]>();

        logRows.forEach((log) => {
          const lId = typeof log.lead === 'string' ? log.lead : (log.lead as unknown as { $id?: string })?.$id;
          if (lId) {
            if (!logsByLead.has(lId)) logsByLead.set(lId, []);
            logsByLead.get(lId)!.push(log);
          }
          const cId = typeof log.company === 'string' ? log.company : (log.company as unknown as { $id?: string })?.$id;
          if (cId) {
            if (!logsByCompany.has(cId)) logsByCompany.set(cId, []);
            logsByCompany.get(cId)!.push(log);
          }
        });

        populatedLeads.forEach((lead) => {
          const cId = typeof lead.company === 'string' ? lead.company : (lead.company as unknown as { $id?: string })?.$id;
          const directLogs = logsByLead.get(lead.$id) || [];
          const compLogs = cId ? (logsByCompany.get(cId) || []) : [];

          // Merge unique logs
          const logMap = new Map<string, ContactLog>();
          directLogs.forEach((l) => logMap.set(l.$id, l));
          compLogs.forEach((l) => logMap.set(l.$id, l));

          lead.contact_logs = Array.from(logMap.values());
        });
      } catch (err) {
        console.warn('Could not populate contact_logs for leads in batch:', err);
      }
    }

    let finalLeads = populatedLeads;
    
    if (isSearching) {
      const normalize = (str: string) =>
        (str || '')
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/["'„”«»\-]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();

      const searchNorm = normalize(search);

      finalLeads = finalLeads.filter((lead) => {
        const comp = typeof lead.company === 'object' && lead.company ? lead.company : null;
        const compName = normalize(comp?.company_name || '');
        const city = normalize(comp?.city || '');
        const statusText = normalize(lead.status || '');
        const analysisText = normalize((lead.analysis || []).join(' '));

        return (
          compName.includes(searchNorm) ||
          city.includes(searchNorm) ||
          statusText.includes(searchNorm) ||
          analysisText.includes(searchNorm)
        );
      });
    }

    const total = isSearching ? finalLeads.length : response.total;
    const totalPages = Math.ceil(total / limit) || 1;
    
    if (isSearching) {
      finalLeads = finalLeads.slice((page - 1) * limit, page * limit);
    }

    return JSON.parse(
      JSON.stringify({
        leads: finalLeads,
        total,
        page,
        limit,
        totalPages,
      })
    );
  } catch (error) {
    console.error('Error fetching leads:', error);
    return {
      leads: [],
      total: 0,
      page: 1,
      limit,
      totalPages: 1,
    };
  }
}

export async function getLeadById(leadId: string): Promise<Lead | null> {
  try {
    const clientToUse = await getClient();
    const row = await clientToUse.getRow({
      databaseId: DATABASE_ID,
      tableId: TABLE_ID,
      rowId: leadId,
    });
    const lead = JSON.parse(JSON.stringify(row)) as Lead;

    if (typeof lead.company === 'string') {
      try {
        const comp = await clientToUse.getRow({
          databaseId: DATABASE_ID,
          tableId: 'companies',
          rowId: lead.company,
        });
        lead.company = JSON.parse(JSON.stringify(comp)) as Company;
      } catch {
        // ignore
      }
    }

    try {
      const companyId = typeof lead.company === 'object' && lead.company ? lead.company.$id : lead.company;
      const queries = [Query.limit(100), Query.orderDesc('$createdAt')];
      if (companyId) {
        try {
          queries.push(Query.or([Query.equal('lead', leadId), Query.equal('company', companyId)]));
        } catch {
          queries.push(Query.equal('lead', leadId));
        }
      } else {
        queries.push(Query.equal('lead', leadId));
      }
      const logsRes = await clientToUse.listRows({
        databaseId: DATABASE_ID,
        tableId: 'contact_logs',
        queries,
      });
      lead.contact_logs = JSON.parse(JSON.stringify(logsRes.rows || [])) as ContactLog[];
    } catch {
      lead.contact_logs = [];
    }

    return lead;
  } catch (error) {
    console.error('Error getting lead:', error);
    return null;
  }
}

export async function createLead(data: LeadInput): Promise<{ success: boolean; data?: Lead; error?: string }> {
  try {
    const clientToUse = await getClient();

    const cleanData: Record<string, unknown> = {
      has_web: Boolean(data.has_web),
      has_email: Boolean(data.has_email),
      has_phone: Boolean(data.has_phone),
      status: data.status?.trim() || 'Novi',
      analysis: Array.isArray(data.analysis) ? data.analysis.filter(Boolean) : [],
      contact_history: Array.isArray(data.contact_history) ? data.contact_history.filter(Boolean) : [],
    };

    if (data.company) {
      cleanData.company = data.company;
    }

    const row = await clientToUse.createRow({
      databaseId: DATABASE_ID,
      tableId: TABLE_ID,
      rowId: ID.unique(),
      data: cleanData,
    });

    revalidatePath('/leads');
    return { success: true, data: JSON.parse(JSON.stringify(row)) as Lead };
  } catch (error) {
    console.error('Error creating lead:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Greška pri kreiranju leada',
    };
  }
}

export async function updateLead(
  leadId: string,
  data: Partial<LeadInput>
): Promise<{ success: boolean; data?: Lead; error?: string }> {
  try {
    const clientToUse = await getClient();

    const cleanData: Record<string, unknown> = {};

    if (data.has_web !== undefined) cleanData.has_web = Boolean(data.has_web);
    if (data.has_email !== undefined) cleanData.has_email = Boolean(data.has_email);
    if (data.has_phone !== undefined) cleanData.has_phone = Boolean(data.has_phone);
    if (data.status !== undefined) cleanData.status = data.status.trim();
    if (data.analysis !== undefined) cleanData.analysis = Array.isArray(data.analysis) ? data.analysis.filter(Boolean) : [];
    if (data.contact_history !== undefined) cleanData.contact_history = Array.isArray(data.contact_history) ? data.contact_history.filter(Boolean) : [];
    if (data.company !== undefined) cleanData.company = data.company || null;

    const row = await clientToUse.updateRow({
      databaseId: DATABASE_ID,
      tableId: TABLE_ID,
      rowId: leadId,
      data: cleanData,
    });

    revalidatePath('/leads');
    return { success: true, data: JSON.parse(JSON.stringify(row)) as Lead };
  } catch (error) {
    console.error('Error updating lead:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Greška pri izmjeni leada',
    };
  }
}

export async function deleteLead(leadId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const clientToUse = await getClient();
    await clientToUse.deleteRow({
      databaseId: DATABASE_ID,
      tableId: TABLE_ID,
      rowId: leadId,
    });

    revalidatePath('/leads');
    return { success: true };
  } catch (error) {
    console.error('Error deleting lead:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Greška pri brisanju leada',
    };
  }
}
