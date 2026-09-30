import { ID, Query } from 'node-appwrite';
import { HUB_TABLES } from '../config';
import type { CreateClientInput, UpdateClientInput } from '../schemas';
import type { HubClient } from '../types';
import { getHubDb, isNotFound, toPlain } from './db';

// A company's client list is short, so it is read whole and searched in the browser.
const MAX_CLIENTS = 500;
const SYNC_BATCH = 100;
const SYNC_MAX_BATCHES = 50;

const normalizeName = (name: string) =>
  name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

export async function listClients(): Promise<HubClient[]> {
  const { tablesDB, databaseId } = await getHubDb();
  const { rows } = await tablesDB.listRows({
    databaseId,
    tableId: HUB_TABLES.clients,
    queries: [Query.orderAsc('name'), Query.limit(MAX_CLIENTS)],
  });
  return toPlain<HubClient[]>(rows);
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

/** Finds a saved client whose name matches ignoring case, accents and repeated spaces. */
export async function findClientByName(name: string): Promise<HubClient | null> {
  const wanted = normalizeName(name);
  const clients = await listClients();
  return clients.find((client) => normalizeName(client.name) === wanted) ?? null;
}

export async function createClient(input: CreateClientInput): Promise<HubClient> {
  const { tablesDB, databaseId } = await getHubDb();
  const row = await tablesDB.createRow({ databaseId, tableId: HUB_TABLES.clients, rowId: ID.unique(), data: input });
  return toPlain<HubClient>(row);
}

export async function updateClient(clientId: string, patch: UpdateClientInput): Promise<HubClient> {
  const { tablesDB, databaseId } = await getHubDb();
  const row = await tablesDB.updateRow({ databaseId, tableId: HUB_TABLES.clients, rowId: clientId, data: patch });
  const client = toPlain<HubClient>(row);
  if (patch.name !== undefined) await syncClientNameToProjects(clientId, client.name);
  return client;
}

export async function countProjectsOfClient(clientId: string): Promise<number> {
  const { tablesDB, databaseId } = await getHubDb();
  const { total } = await tablesDB.listRows({
    databaseId,
    tableId: HUB_TABLES.projects,
    queries: [Query.equal('client_id', clientId), Query.limit(1)],
  });
  return total;
}

export async function deleteClient(clientId: string): Promise<void> {
  const { tablesDB, databaseId } = await getHubDb();
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
