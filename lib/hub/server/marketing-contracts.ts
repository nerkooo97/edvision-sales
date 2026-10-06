import { ID, Query } from 'node-appwrite';
import { HUB_TABLES } from '../config';
import type { MarketingContractInput } from '../schemas';
import type { HubMarketingContract } from '../types';
import { getHubDb, isNotFound, toPlain } from './db';

// One year holds a few dozen rows; the bound only protects against runaway data.
const MAX_CONTRACTS_PER_YEAR = 500;

/** Reads one calendar year through the indexed `year` column, so the cost does not grow with the years. */
export async function listMarketingContracts(year: number): Promise<HubMarketingContract[]> {
  const { tablesDB, databaseId } = await getHubDb();
  const { rows } = await tablesDB.listRows({
    databaseId,
    total: false,
    tableId: HUB_TABLES.marketingContracts,
    queries: [Query.equal('year', year), Query.limit(MAX_CONTRACTS_PER_YEAR)],
  });
  return toPlain<HubMarketingContract[]>(rows);
}

export async function getMarketingContract(contractId: string): Promise<HubMarketingContract | null> {
  const { tablesDB, databaseId } = await getHubDb();
  try {
    const row = await tablesDB.getRow({ databaseId, tableId: HUB_TABLES.marketingContracts, rowId: contractId });
    return toPlain<HubMarketingContract>(row);
  } catch (error) {
    if (isNotFound(error)) return null;
    throw error;
  }
}

/** Whether any contract of any year belongs to the client (only the id column is read). */
export async function clientHasMarketingContracts(clientId: string): Promise<boolean> {
  const { tablesDB, databaseId } = await getHubDb();
  const { rows } = await tablesDB.listRows({
    databaseId,
    total: false,
    tableId: HUB_TABLES.marketingContracts,
    queries: [Query.equal('client_id', clientId), Query.select(['$id']), Query.limit(1)],
  });
  return rows.length > 0;
}

export async function createMarketingContract(data: MarketingContractInput): Promise<HubMarketingContract> {
  const { tablesDB, databaseId } = await getHubDb();
  const row = await tablesDB.createRow({
    databaseId,
    tableId: HUB_TABLES.marketingContracts,
    rowId: ID.unique(),
    data,
  });
  return toPlain<HubMarketingContract>(row);
}

export async function updateMarketingContract(
  contractId: string,
  data: MarketingContractInput
): Promise<HubMarketingContract> {
  const { tablesDB, databaseId } = await getHubDb();
  const row = await tablesDB.updateRow({
    databaseId,
    tableId: HUB_TABLES.marketingContracts,
    rowId: contractId,
    data,
  });
  return toPlain<HubMarketingContract>(row);
}

export async function deleteMarketingContract(contractId: string): Promise<void> {
  const { tablesDB, databaseId } = await getHubDb();
  await tablesDB.deleteRow({ databaseId, tableId: HUB_TABLES.marketingContracts, rowId: contractId });
}

/** The id of the client's contract for `year`, if there is one (indexed client_id; a client has few rows). */
export async function findMarketingContractFor(clientId: string, year: number): Promise<string | null> {
  const { tablesDB, databaseId } = await getHubDb();
  const { rows } = await tablesDB.listRows({
    databaseId,
    total: false,
    tableId: HUB_TABLES.marketingContracts,
    queries: [Query.equal('client_id', clientId), Query.equal('year', year), Query.select(['$id']), Query.limit(1)],
  });
  return rows[0]?.$id ?? null;
}

/** Writes only the months of a contract (the month grid), nothing else. */
export async function setMarketingContractMonths(contractId: string, months: number): Promise<HubMarketingContract> {
  const { tablesDB, databaseId } = await getHubDb();
  const row = await tablesDB.updateRow({
    databaseId,
    tableId: HUB_TABLES.marketingContracts,
    rowId: contractId,
    data: { months },
  });
  return toPlain<HubMarketingContract>(row);
}
