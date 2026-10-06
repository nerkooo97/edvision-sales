import { ID, Query } from 'node-appwrite';
import { HUB_TABLES } from '../config';
import type { GeneratedContractSummary, HubGeneratedContract } from '../types';
import { getHubDb, isNotFound, toPlain } from './db';

// A client has a handful of contracts; the bound only protects against runaway data.
const MAX_PER_CLIENT = 200;
// Without contract_values (the bulk of the row), for lists.
const LIST_COLUMNS = ['$id', '$createdAt', 'client_id', 'template', 'contract_number', 'concluded_date', 'start_date', 'end_date'];

const counterId = (year: number) => `contract_number_${year}`;

/**
 * The next contract number of `year` ("13-2026"), counted atomically in hub_counters, so two people
 * saving at the same moment never get the same number. The year's counter row is created on first use.
 */
export async function nextContractNumber(year: number): Promise<string> {
  const { tablesDB, databaseId } = await getHubDb();
  const increment = () =>
    tablesDB.incrementRowColumn({ databaseId, tableId: HUB_TABLES.counters, rowId: counterId(year), column: 'value', value: 1 });

  try {
    return `${Number((await increment()).value)}-${year}`;
  } catch (error) {
    if (!isNotFound(error)) throw error;
  }
  try {
    await tablesDB.createRow({
      databaseId,
      tableId: HUB_TABLES.counters,
      rowId: counterId(year),
      data: { key: counterId(year), value: 0 },
    });
  } catch (error) {
    // Someone else created it in the meantime; the increment below still counts correctly.
    if ((error as { code?: number })?.code !== 409) throw error;
  }
  return `${Number((await increment()).value)}-${year}`;
}

export async function createGeneratedContract(
  data: Omit<HubGeneratedContract, '$id' | '$createdAt' | '$updatedAt'>
): Promise<HubGeneratedContract> {
  const { tablesDB, databaseId } = await getHubDb();
  const row = await tablesDB.createRow({ databaseId, tableId: HUB_TABLES.generatedContracts, rowId: ID.unique(), data });
  return toPlain<HubGeneratedContract>(row);
}

/** A client's contracts, newest first, without the stored form values. */
export async function listGeneratedContractsOfClient(clientId: string): Promise<GeneratedContractSummary[]> {
  const { tablesDB, databaseId } = await getHubDb();
  const { rows } = await tablesDB.listRows({
    databaseId,
    total: false,
    tableId: HUB_TABLES.generatedContracts,
    queries: [
      Query.equal('client_id', clientId),
      Query.select(LIST_COLUMNS),
      Query.orderDesc('$createdAt'),
      Query.limit(MAX_PER_CLIENT),
    ],
  });
  return toPlain<GeneratedContractSummary[]>(rows);
}

export async function getGeneratedContract(contractId: string): Promise<HubGeneratedContract | null> {
  const { tablesDB, databaseId } = await getHubDb();
  try {
    return toPlain<HubGeneratedContract>(
      await tablesDB.getRow({ databaseId, tableId: HUB_TABLES.generatedContracts, rowId: contractId })
    );
  } catch (error) {
    if (isNotFound(error)) return null;
    throw error;
  }
}

export async function deleteGeneratedContract(contractId: string): Promise<void> {
  const { tablesDB, databaseId } = await getHubDb();
  await tablesDB.deleteRow({ databaseId, tableId: HUB_TABLES.generatedContracts, rowId: contractId });
}

/** Whether the client has any generated contract (only the id column is read). */
export async function clientHasGeneratedContracts(clientId: string): Promise<boolean> {
  const { tablesDB, databaseId } = await getHubDb();
  const { rows } = await tablesDB.listRows({
    databaseId,
    total: false,
    tableId: HUB_TABLES.generatedContracts,
    queries: [Query.equal('client_id', clientId), Query.select(['$id']), Query.limit(1)],
  });
  return rows.length > 0;
}

/** The last contract number used in `year` (0 when no contract of that year exists yet). */
export async function getContractCounter(year: number): Promise<number> {
  const { tablesDB, databaseId } = await getHubDb();
  try {
    const row = await tablesDB.getRow({ databaseId, tableId: HUB_TABLES.counters, rowId: counterId(year) });
    return Number(row.value);
  } catch (error) {
    if (isNotFound(error)) return 0;
    throw error;
  }
}

/**
 * Moves the counter of `year` up to `last` (the last number already used outside the app), so the next
 * contract gets `last + 1`. Never lowers it: the gap is added with an atomic increment, so a contract
 * saved at the same moment only pushes the counter further up, never back to a used number.
 */
export async function raiseContractCounter(year: number, last: number): Promise<number> {
  const current = await getContractCounter(year);
  if (last <= current) return current;

  const { tablesDB, databaseId } = await getHubDb();
  if (current === 0) {
    try {
      await tablesDB.createRow({
        databaseId,
        tableId: HUB_TABLES.counters,
        rowId: counterId(year),
        data: { key: counterId(year), value: 0 },
      });
    } catch (error) {
      if ((error as { code?: number })?.code !== 409) throw error;
    }
  }
  const row = await tablesDB.incrementRowColumn({
    databaseId,
    tableId: HUB_TABLES.counters,
    rowId: counterId(year),
    column: 'value',
    value: last - current,
  });
  return Number(row.value);
}
