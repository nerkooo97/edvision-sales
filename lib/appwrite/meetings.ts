'use server';

import { Query, ID } from 'node-appwrite';
import { revalidatePath } from 'next/cache';
import { createAdminClient } from './server';
import { appwriteConfig } from './config';
import { getCompanies } from './companies';
import type { Company } from './companies';

export type MeetingStatus = 'Zakazan' | 'Potvrđen' | 'Završen' | 'Otkazan' | 'Odgođen' | 'Na čekanju';
export type MeetingLocationType = 'Kancelarija' | 'Kod klijenta';

export interface Meeting {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  title: string;
  scheduled_at: string;
  duration_min?: number;
  location_type: MeetingLocationType;
  location_note?: string;
  status: MeetingStatus;
  notes?: string;
  company_id?: string;
  company_name?: string;
  /** Datum/vrijeme podsjetnika kada status = "Na čekanju" */
  reminder_at?: string | null;
  // Populated field (not stored in DB)
  company?: Company;
}

export type MeetingInput = {
  title: string;
  scheduled_at: string;
  duration_min?: number;
  location_type: MeetingLocationType;
  location_note?: string;
  status?: MeetingStatus;
  notes?: string;
  company_id: string;
  company_name?: string;
  /** Datum/vrijeme podsjetnika (ISO string) */
  reminder_at?: string | null;
};

export interface GetMeetingsParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface GetMeetingsResult {
  meetings: Meeting[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const DATABASE_ID = appwriteConfig.databaseId || '6a7dd77a002b3913d433';
const TABLE_ID = 'meetings';

async function getClient() {
  const adminClient = await createAdminClient();
  return adminClient.tablesDB;
}

export async function getMeetings({
  page = 1,
  limit = 15,
  search = '',
  status = '',
  dateFrom = '',
  dateTo = '',
}: GetMeetingsParams = {}): Promise<GetMeetingsResult> {
  try {
    const clientToUse = await getClient();

    const isSearching = !!(search && search.trim());
    const fetchLimit = isSearching ? 500 : limit;
    const fetchOffset = isSearching ? 0 : (page - 1) * limit;

    const queries = [
      Query.limit(fetchLimit),
      Query.offset(fetchOffset),
      Query.orderAsc('scheduled_at'),
    ];

    if (status && status.trim() && status !== 'all') {
      queries.push(Query.equal('status', status.trim()));
    }

    if (dateFrom) {
      queries.push(Query.greaterThanEqual('scheduled_at', dateFrom));
    }
    if (dateTo) {
      queries.push(Query.lessThanEqual('scheduled_at', dateTo));
    }

    const response = await clientToUse.listRows({
      databaseId: DATABASE_ID,
      tableId: TABLE_ID,
      queries,
    });

    const rawRows = response.rows ?? (response as unknown as { documents?: unknown[] }).documents ?? [];
    let meetings = JSON.parse(JSON.stringify(rawRows)) as Meeting[];

    if (isSearching) {
      const normalize = (str: string) =>
        (str || '')
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .trim();

      const searchNorm = normalize(search);
      meetings = meetings.filter((m) =>
        normalize(m.title).includes(searchNorm) ||
        normalize(m.company_name || '').includes(searchNorm) ||
        normalize(m.location_note || '').includes(searchNorm) ||
        normalize(m.notes || '').includes(searchNorm)
      );
    }

    const total = isSearching ? meetings.length : response.total;
    const totalPages = Math.ceil(total / limit) || 1;

    if (isSearching) {
      meetings = meetings.slice((page - 1) * limit, page * limit);
    }

    return JSON.parse(
      JSON.stringify({ meetings, total, page, limit, totalPages })
    );
  } catch (error) {
    console.error('Greška pri dohvatanju sastanaka:', error);
    return { meetings: [], total: 0, page: 1, limit, totalPages: 1 };
  }
}

export async function getMeetingById(meetingId: string): Promise<Meeting | null> {
  try {
    const clientToUse = await getClient();
    const row = await clientToUse.getRow({
      databaseId: DATABASE_ID,
      tableId: TABLE_ID,
      rowId: meetingId,
    });
    return JSON.parse(JSON.stringify(row)) as Meeting;
  } catch (error) {
    console.error('Greška pri dohvatanju sastanka:', error);
    return null;
  }
}

/**
 * Dohvata sastanke za određeni mjesec — za kalendar prikaz.
 */
export async function getMeetingsByMonth(year: number, month: number): Promise<Meeting[]> {
  try {
    const clientToUse = await getClient();

    const dateFrom = new Date(year, month - 1, 1).toISOString();
    const dateTo = new Date(year, month, 0, 23, 59, 59).toISOString();

    const response = await clientToUse.listRows({
      databaseId: DATABASE_ID,
      tableId: TABLE_ID,
      queries: [
        Query.greaterThanEqual('scheduled_at', dateFrom),
        Query.lessThanEqual('scheduled_at', dateTo),
        Query.orderAsc('scheduled_at'),
        Query.limit(200),
      ],
    });

    const rows = JSON.parse(JSON.stringify(response.rows ?? [])) as Meeting[];
    return rows;
  } catch (error) {
    console.error('Greška pri dohvatanju sastanaka za mjesec:', error);
    return [];
  }
}

/**
 * Dohvata predstojeće sastanke (od danas nadalje).
 */
export async function getUpcomingMeetings(limit = 5): Promise<Meeting[]> {
  try {
    const clientToUse = await getClient();
    const now = new Date().toISOString();

    const response = await clientToUse.listRows({
      databaseId: DATABASE_ID,
      tableId: TABLE_ID,
      queries: [
        Query.greaterThanEqual('scheduled_at', now),
        Query.equal('status', ['Zakazan', 'Potvrđen']),
        Query.orderAsc('scheduled_at'),
        Query.limit(limit),
      ],
    });

    return JSON.parse(JSON.stringify(response.rows ?? [])) as Meeting[];
  } catch (error) {
    console.error('Greška pri dohvatanju predstojećih sastanaka:', error);
    return [];
  }
}

/**
 * Dohvata sve sastanke za određenu firmu (po company_id).
 */
export async function getMeetingsByCompanyId(companyId: string): Promise<Meeting[]> {
  try {
    if (!companyId) return [];
    const clientToUse = await getClient();

    const response = await clientToUse.listRows({
      databaseId: DATABASE_ID,
      tableId: TABLE_ID,
      queries: [
        Query.equal('company_id', companyId),
        Query.orderDesc('scheduled_at'),
        Query.limit(50),
      ],
    });

    return JSON.parse(JSON.stringify(response.rows ?? [])) as Meeting[];
  } catch (error) {
    console.error('Greška pri dohvatanju sastanaka za kompaniju:', error);
    return [];
  }
}

/**
 * Dohvata listu svih kompanija (za dropdown u formi).
 */
export async function getCompaniesForMeetingForm(): Promise<Company[]> {
  try {
    const result = await getCompanies({ limit: 500 });
    return result.companies;
  } catch {
    return [];
  }
}

export async function createMeeting(
  data: MeetingInput
): Promise<{ success: boolean; data?: Meeting; error?: string }> {
  try {
    const clientToUse = await getClient();
    const companyId = data.company_id?.trim();
    if (!companyId) {
      return { success: false, error: 'Firma je obavezna za zakazivanje sastanka.' };
    }

    const cleanData: Record<string, unknown> = {
      title: data.title.trim(),
      scheduled_at: data.scheduled_at,
      duration_min: data.duration_min ?? 60,
      location_type: data.location_type,
      location_note: data.location_note?.trim() || null,
      status: data.status || 'Zakazan',
      notes: data.notes?.trim() || null,
      company_id: companyId,
      company_name: data.company_name?.trim() || null,
      reminder_at: data.reminder_at ?? null,
    };

    const row = await clientToUse.createRow({
      databaseId: DATABASE_ID,
      tableId: TABLE_ID,
      rowId: ID.unique(),
      data: cleanData,
    });

    revalidatePath('/meetings');
    revalidatePath('/dashboard');
    revalidatePath('/leads');
    revalidatePath('/companies');
    return { success: true, data: JSON.parse(JSON.stringify(row)) as Meeting };
  } catch (error) {
    console.error('Greška pri kreiranju sastanka:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Greška pri zakazivanju sastanka',
    };
  }
}

export async function updateMeeting(
  meetingId: string,
  data: Partial<MeetingInput>
): Promise<{ success: boolean; data?: Meeting; error?: string }> {
  try {
    const clientToUse = await getClient();

    const cleanData: Record<string, unknown> = {};

    if (data.company_id !== undefined && !data.company_id.trim()) {
      return { success: false, error: 'Firma je obavezna za sastanak.' };
    }

    if (data.title !== undefined) cleanData.title = data.title.trim();
    if (data.scheduled_at !== undefined) cleanData.scheduled_at = data.scheduled_at;
    if (data.duration_min !== undefined) cleanData.duration_min = data.duration_min;
    if (data.location_type !== undefined) cleanData.location_type = data.location_type;
    if (data.location_note !== undefined) cleanData.location_note = data.location_note?.trim() || null;
    if (data.status !== undefined) cleanData.status = data.status;
    if (data.notes !== undefined) cleanData.notes = data.notes?.trim() || null;
    if (data.company_id !== undefined) cleanData.company_id = data.company_id.trim();
    if (data.company_name !== undefined) cleanData.company_name = data.company_name?.trim() || null;
    if (data.reminder_at !== undefined) cleanData.reminder_at = data.reminder_at ?? null;

    const row = await clientToUse.updateRow({
      databaseId: DATABASE_ID,
      tableId: TABLE_ID,
      rowId: meetingId,
      data: cleanData,
    });

    revalidatePath('/meetings');
    revalidatePath('/dashboard');
    revalidatePath('/leads');
    revalidatePath('/companies');
    return { success: true, data: JSON.parse(JSON.stringify(row)) as Meeting };
  } catch (error) {
    console.error('Greška pri izmjeni sastanka:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Greška pri izmjeni sastanka',
    };
  }
}

export async function deleteMeeting(
  meetingId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const clientToUse = await getClient();
    await clientToUse.deleteRow({
      databaseId: DATABASE_ID,
      tableId: TABLE_ID,
      rowId: meetingId,
    });

    revalidatePath('/meetings');
    revalidatePath('/dashboard');
    revalidatePath('/leads');
    revalidatePath('/companies');
    return { success: true };
  } catch (error) {
    console.error('Greška pri brisanju sastanka:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Greška pri brisanju sastanka',
    };
  }
}
