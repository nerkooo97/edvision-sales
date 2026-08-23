'use server';

import { Query, ID } from 'node-appwrite';
import { revalidatePath } from 'next/cache';
import { createAdminClient } from './server';
import { appwriteConfig } from './config';

export interface Company {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  company_name: string;
  city?: string;
  address?: string;
  website?: string;
  email?: string;
  phones?: string[];
  tax_id?: string;
  owner_name?: string;
  industry?: string;
  company_size?: string;
  source?: string;
}

export type CompanyInput = Omit<Company, '$id' | '$createdAt' | '$updatedAt'>;

export interface GetCompaniesParams {
  page?: number;
  limit?: number;
  search?: string;
}

export interface GetCompaniesResult {
  companies: Company[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const DATABASE_ID = appwriteConfig.databaseId || '6a7dd77a002b3913d433';
const TABLE_ID = 'companies';

async function getClient() {
  const adminClient = await createAdminClient();
  return adminClient.tablesDB;
}

export async function getCompanies({
  page = 1,
  limit = 15,
  search = '',
}: GetCompaniesParams = {}): Promise<GetCompaniesResult> {
  try {
    const clientToUse = await getClient();

    const queries = [
      Query.limit(limit),
      Query.offset((page - 1) * limit),
      Query.orderDesc('$createdAt'),
    ];

    if (search && search.trim()) {
      queries.push(Query.contains('company_name', search.trim()));
    }

    const response = await clientToUse.listRows({
      databaseId: DATABASE_ID,
      tableId: TABLE_ID,
      queries,
    });

    const total = response.total;
    const totalPages = Math.ceil(total / limit) || 1;
    const rawRows = response.rows ?? (response as unknown as { documents?: unknown[] }).documents ?? [];
    const plainRows = JSON.parse(JSON.stringify(rawRows)) as Company[];

    return {
      companies: plainRows,
      total,
      page,
      limit,
      totalPages,
    };
  } catch (error) {
    console.error('Error fetching companies:', error);
    return {
      companies: [],
      total: 0,
      page: 1,
      limit,
      totalPages: 1,
    };
  }
}

export async function getCompanyById(companyId: string): Promise<Company | null> {
  try {
    const clientToUse = await getClient();
    const row = await clientToUse.getRow({
      databaseId: DATABASE_ID,
      tableId: TABLE_ID,
      rowId: companyId,
    });
    return JSON.parse(JSON.stringify(row)) as Company;
  } catch (error) {
    console.error('Error getting company:', error);
    return null;
  }
}

export async function createCompany(data: CompanyInput): Promise<{ success: boolean; data?: Company; error?: string }> {
  try {
    const clientToUse = await getClient();

    const cleanData: Record<string, unknown> = {
      company_name: data.company_name?.trim(),
      city: data.city?.trim() || null,
      address: data.address?.trim() || null,
      website: data.website?.trim() || null,
      email: data.email?.trim() || null,
      phones: Array.isArray(data.phones) ? data.phones.filter(Boolean) : [],
      tax_id: data.tax_id?.trim() || null,
      owner_name: data.owner_name?.trim() || null,
      industry: data.industry?.trim() || null,
      company_size: data.company_size?.trim() || null,
      source: data.source?.trim() || null,
    };

    const row = await clientToUse.createRow({
      databaseId: DATABASE_ID,
      tableId: TABLE_ID,
      rowId: ID.unique(),
      data: cleanData,
    });

    revalidatePath('/companies');
    return { success: true, data: JSON.parse(JSON.stringify(row)) as Company };
  } catch (error) {
    console.error('Error creating company:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Greška pri kreiranju kompanije',
    };
  }
}

export async function updateCompany(
  companyId: string,
  data: Partial<CompanyInput>
): Promise<{ success: boolean; data?: Company; error?: string }> {
  try {
    const clientToUse = await getClient();

    const cleanData: Record<string, unknown> = {};

    if (data.company_name !== undefined) cleanData.company_name = data.company_name.trim();
    if (data.city !== undefined) cleanData.city = data.city?.trim() || null;
    if (data.address !== undefined) cleanData.address = data.address?.trim() || null;
    if (data.website !== undefined) cleanData.website = data.website?.trim() || null;
    if (data.email !== undefined) cleanData.email = data.email?.trim() || null;
    if (data.phones !== undefined) cleanData.phones = Array.isArray(data.phones) ? data.phones.filter(Boolean) : [];
    if (data.tax_id !== undefined) cleanData.tax_id = data.tax_id?.trim() || null;
    if (data.owner_name !== undefined) cleanData.owner_name = data.owner_name?.trim() || null;
    if (data.industry !== undefined) cleanData.industry = data.industry?.trim() || null;
    if (data.company_size !== undefined) cleanData.company_size = data.company_size?.trim() || null;
    if (data.source !== undefined) cleanData.source = data.source?.trim() || null;

    const row = await clientToUse.updateRow({
      databaseId: DATABASE_ID,
      tableId: TABLE_ID,
      rowId: companyId,
      data: cleanData,
    });

    revalidatePath('/companies');
    return { success: true, data: JSON.parse(JSON.stringify(row)) as Company };
  } catch (error) {
    console.error('Error updating company:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Greška pri izmjeni kompanije',
    };
  }
}

export async function deleteCompany(companyId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const clientToUse = await getClient();
    await clientToUse.deleteRow({
      databaseId: DATABASE_ID,
      tableId: TABLE_ID,
      rowId: companyId,
    });

    revalidatePath('/companies');
    return { success: true };
  } catch (error) {
    console.error('Error deleting company:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Greška pri brisanju kompanije',
    };
  }
}
