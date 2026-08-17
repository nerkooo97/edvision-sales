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

export async function getLeads({
  page = 1,
  limit = 15,
  status = '',
}: GetLeadsParams = {}): Promise<GetLeadsResult> {
  try {
    const clientToUse = await getClient();

    const queries = [
      Query.limit(limit),
      Query.offset((page - 1) * limit),
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

    const total = response.total;
    const totalPages = Math.ceil(total / limit) || 1;
    const rawRows = response.rows ?? (response as unknown as { documents?: unknown[] }).documents ?? [];
    const plainRows = JSON.parse(JSON.stringify(rawRows)) as Lead[];

    // Populate company objects if company is an ID string
    const companyIds = Array.from(
      new Set(
        plainRows
          .map((r) => (typeof r.company === 'string' ? r.company : null))
          .filter((id): id is string => Boolean(id))
      )
    );

    const companiesMap = new Map<string, Company>();
    if (companyIds.length > 0) {
      try {
        const compRes = await clientToUse.listRows({
          databaseId: DATABASE_ID,
          tableId: 'companies',
          queries: [Query.limit(100)],
        });
        const compRows = JSON.parse(JSON.stringify(compRes.rows || [])) as Company[];
        compRows.forEach((c) => companiesMap.set(c.$id, c));
      } catch (err) {
        console.error('Failed to populate companies for leads:', err);
      }
    }

    const populatedLeads = plainRows.map((lead) => {
      if (typeof lead.company === 'string' && companiesMap.has(lead.company)) {
        return {
          ...lead,
          company: companiesMap.get(lead.company) || lead.company,
        };
      }
      return lead;
    });

    return {
      leads: populatedLeads,
      total,
      page,
      limit,
      totalPages,
    };
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
    return { success: true, data: row as unknown as Lead };
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
    return { success: true, data: row as unknown as Lead };
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
