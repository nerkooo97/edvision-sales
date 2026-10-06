import { ID, Query } from 'node-appwrite';
import { HUB_TABLES } from '../config';
import type { MaintenanceContractInput } from '../schemas';
import type { HubMaintenanceContract } from '../types';
import { getHubDb, isNotFound, toPlain } from './db';

// A company has a few hundred maintenance contracts at most, so the whole table is read in one bounded query.
const MAX_CONTRACTS = 1000;

export async function listMaintenanceContracts(): Promise<HubMaintenanceContract[]> {
  const { tablesDB, databaseId } = await getHubDb();
  const { rows } = await tablesDB.listRows({
    databaseId,
    total: false,
    tableId: HUB_TABLES.maintenanceContracts,
    queries: [Query.orderAsc('end_date'), Query.limit(MAX_CONTRACTS)],
  });
  return toPlain<HubMaintenanceContract[]>(rows);
}

export async function getMaintenanceContract(contractId: string): Promise<HubMaintenanceContract | null> {
  const { tablesDB, databaseId } = await getHubDb();
  try {
    const row = await tablesDB.getRow({ databaseId, tableId: HUB_TABLES.maintenanceContracts, rowId: contractId });
    return toPlain<HubMaintenanceContract>(row);
  } catch (error) {
    if (isNotFound(error)) return null;
    throw error;
  }
}

/** Whether any contract belongs to the client (only the id column is read). */
export async function clientHasMaintenanceContracts(clientId: string): Promise<boolean> {
  const { tablesDB, databaseId } = await getHubDb();
  const { rows } = await tablesDB.listRows({
    databaseId,
    total: false,
    tableId: HUB_TABLES.maintenanceContracts,
    queries: [Query.equal('client_id', clientId), Query.select(['$id']), Query.limit(1)],
  });
  return rows.length > 0;
}

export async function createMaintenanceContract(data: MaintenanceContractInput): Promise<HubMaintenanceContract> {
  const { tablesDB, databaseId } = await getHubDb();
  const row = await tablesDB.createRow({
    databaseId,
    tableId: HUB_TABLES.maintenanceContracts,
    rowId: ID.unique(),
    data,
  });
  return toPlain<HubMaintenanceContract>(row);
}

export async function updateMaintenanceContract(
  contractId: string,
  data: MaintenanceContractInput
): Promise<HubMaintenanceContract> {
  const { tablesDB, databaseId } = await getHubDb();
  const row = await tablesDB.updateRow({
    databaseId,
    tableId: HUB_TABLES.maintenanceContracts,
    rowId: contractId,
    data,
  });
  return toPlain<HubMaintenanceContract>(row);
}

export async function deleteMaintenanceContract(contractId: string): Promise<void> {
  const { tablesDB, databaseId } = await getHubDb();
  await tablesDB.deleteRow({ databaseId, tableId: HUB_TABLES.maintenanceContracts, rowId: contractId });
}
