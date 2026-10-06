import { ID, Query } from 'node-appwrite';
import { clientNameKey } from '../client-name';
import { HUB_TABLES } from '../config';
import type { CreateClientInput, UpdateClientInput } from '../schemas';
import type { HubClient, HubClientListItem, HubClientOption } from '../types';
import { deleteContactsOfClient } from './client-contacts';
import { getHubDb, isNotFound, toPlain } from './db';

// A company's client list is a few hundred rows, read in one query and searched in the browser.
const MAX_CLIENTS = 2000;
const SYNC_BATCH = 100;
const SYNC_MAX_BATCHES = 50;

// Only the columns each screen shows are read, so the many pages that need a client picker stay light.
const OPTION_COLUMNS = ['$id', 'name', 'city', 'email', 'phone', 'is_active'];
const LIST_COLUMNS = [...OPTION_COLUMNS, 'tax_id', 'country'];

async function listClientColumns<T>(columns: string[]): Promise<T[]> {
  const { tablesDB, databaseId } = await getHubDb();
  const { rows } = await tablesDB.listRows({
    databaseId,
    total: false,
    tableId: HUB_TABLES.clients,
    queries: [Query.select(columns), Query.orderAsc('name'), Query.limit(MAX_CLIENTS)],
  });
  return toPlain<T[]>(rows);
}

/** Clients for pickers (project form, contracts, generator). */
export function listClientOptions(): Promise<HubClientOption[]> {
  return listClientColumns<HubClientOption>(OPTION_COLUMNS);
}

/** Clients for the client list screen. */
export function listClientItems(): Promise<HubClientListItem[]> {
  return listClientColumns<HubClientListItem>(LIST_COLUMNS);
}

export async function getClient(clientId: string): Promise<HubClient | null> {
  const { tablesDB, databaseId } = await getHubDb();
  try {
    const row = await tablesDB.getRow({ databaseId, tableId: HUB_TABLES.clients, rowId: clientId });
    return toPlain<HubClient>(row);
  } catch (error) {
    if (isNotFound(error)) return null;
    throw error;
  }
}

/** Finds a saved client whose name matches ignoring case, accents and repeated spaces (one indexed read). */
export async function findClientByName(name: string): Promise<Pick<HubClient, '$id' | 'name'> | null> {
  const { tablesDB, databaseId } = await getHubDb();
  const { rows } = await tablesDB.listRows({
    databaseId,
    total: false,
    tableId: HUB_TABLES.clients,
    queries: [Query.equal('name_key', clientNameKey(name)), Query.select(['$id', 'name']), Query.limit(1)],
  });
  return rows.length ? toPlain<Pick<HubClient, '$id' | 'name'>>(rows[0]) : null;
}

export async function createClient(input: CreateClientInput): Promise<HubClient> {
  const { tablesDB, databaseId } = await getHubDb();
  const row = await tablesDB.createRow({
    databaseId,
    tableId: HUB_TABLES.clients,
    rowId: ID.unique(),
    data: { ...input, name_key: clientNameKey(input.name) },
  });
  return toPlain<HubClient>(row);
}

export async function updateClient(clientId: string, patch: UpdateClientInput): Promise<HubClient> {
  const { tablesDB, databaseId } = await getHubDb();
  const data = patch.name === undefined ? patch : { ...patch, name_key: clientNameKey(patch.name) };
  const row = await tablesDB.updateRow({ databaseId, tableId: HUB_TABLES.clients, rowId: clientId, data });
  const client = toPlain<HubClient>(row);
  if (patch.name !== undefined) await syncClientNameToProjects(clientId, client.name);
  return client;
}

export async function clientHasProjects(clientId: string): Promise<boolean> {
  const { tablesDB, databaseId } = await getHubDb();
  const { rows } = await tablesDB.listRows({
    databaseId,
    total: false,
    tableId: HUB_TABLES.projects,
    queries: [Query.equal('client_id', clientId), Query.select(['$id']), Query.limit(1)],
  });
  return rows.length > 0;
}

/** Deletes the client together with its contacts (contacts first, so none is left without a client). */
export async function deleteClient(clientId: string): Promise<void> {
  const { tablesDB, databaseId } = await getHubDb();
  await deleteContactsOfClient(clientId);
  await tablesDB.deleteRow({ databaseId, tableId: HUB_TABLES.clients, rowId: clientId });
}

/**
 * Projects keep a copy of the client's name so lists and the Kanban need no lookup. When a client is
 * renamed the copy is refreshed in bulk; rows already up to date drop out of the query, so each batch
 * makes progress and the loop always ends.
 */
async function syncClientNameToProjects(clientId: string, name: string): Promise<void> {
  const { tablesDB, databaseId } = await getHubDb();

  for (let batch = 0; batch < SYNC_MAX_BATCHES; batch += 1) {
    const { rows } = await tablesDB.updateRows({
      databaseId,
      tableId: HUB_TABLES.projects,
      data: { client_name: name },
      queries: [Query.equal('client_id', clientId), Query.notEqual('client_name', name), Query.limit(SYNC_BATCH)],
    });
    if (rows.length < SYNC_BATCH) break;
  }
}
