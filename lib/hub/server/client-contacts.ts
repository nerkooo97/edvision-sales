import { ID, Query } from 'node-appwrite';
import { HUB_TABLES } from '../config';
import type { CreateContactInput, UpdateContactInput } from '../schemas';
import type { HubClientContact } from '../types';
import { getHubDb, isNotFound, toPlain } from './db';

// A client has a handful of contacts; this only caps a runaway list.
const MAX_CONTACTS_PER_CLIENT = 100;

const fullName = (contact: HubClientContact) => [contact.first_name, contact.last_name].filter(Boolean).join(' ');

/** Primary first, then active before inactive, then by name. */
export function sortContacts(contacts: HubClientContact[]): HubClientContact[] {
  return [...contacts].sort(
    (a, b) =>
      Number(b.is_primary) - Number(a.is_primary) ||
      Number(b.is_active) - Number(a.is_active) ||
      fullName(a).localeCompare(fullName(b), 'bs')
  );
}

export async function listContacts(clientId: string): Promise<HubClientContact[]> {
  const { tablesDB, databaseId } = await getHubDb();
  const { rows } = await tablesDB.listRows({
    databaseId,
    total: false,
    tableId: HUB_TABLES.clientContacts,
    queries: [Query.equal('client_id', clientId), Query.limit(MAX_CONTACTS_PER_CLIENT)],
  });
  return sortContacts(toPlain<HubClientContact[]>(rows));
}

/** The client's primary contact, or null. Uses the client_id index; is_primary narrows a few rows. */
export async function getPrimaryContact(clientId: string): Promise<HubClientContact | null> {
  const { tablesDB, databaseId } = await getHubDb();
  const { rows } = await tablesDB.listRows({
    databaseId,
    total: false,
    tableId: HUB_TABLES.clientContacts,
    queries: [Query.equal('client_id', clientId), Query.equal('is_primary', true), Query.limit(1)],
  });
  return rows.length ? toPlain<HubClientContact>(rows[0]) : null;
}

export async function getContact(contactId: string): Promise<HubClientContact | null> {
  const { tablesDB, databaseId } = await getHubDb();
  try {
    const row = await tablesDB.getRow({ databaseId, tableId: HUB_TABLES.clientContacts, rowId: contactId });
    return toPlain<HubClientContact>(row);
  } catch (error) {
    if (isNotFound(error)) return null;
    throw error;
  }
}

/**
 * Keeps exactly one primary contact per client: `preferredId` when given, otherwise the current primary
 * if it is still active, otherwise the first active contact. Only rows whose flag changes are written.
 */
async function settlePrimary(clientId: string, preferredId?: string): Promise<void> {
  const contacts = await listContacts(clientId);
  const current = contacts.find((contact) => contact.is_primary);
  const primary =
    contacts.find((contact) => contact.$id === preferredId) ??
    (current?.is_active ? current : undefined) ??
    contacts.find((contact) => contact.is_active) ??
    current;

  const { tablesDB, databaseId } = await getHubDb();
  await Promise.all(
    contacts
      .filter((contact) => contact.is_primary !== (contact === primary))
      .map((contact) =>
        tablesDB.updateRow({
          databaseId,
          tableId: HUB_TABLES.clientContacts,
          rowId: contact.$id,
          data: { is_primary: contact === primary },
        })
      )
  );
}

export async function createContact(input: CreateContactInput): Promise<HubClientContact> {
  const { tablesDB, databaseId } = await getHubDb();
  const row = await tablesDB.createRow({
    databaseId,
    tableId: HUB_TABLES.clientContacts,
    rowId: ID.unique(),
    data: input,
  });
  const contact = toPlain<HubClientContact>(row);
  await settlePrimary(contact.client_id, input.is_primary ? contact.$id : undefined);
  return (await getContact(contact.$id)) ?? contact;
}

export async function updateContact(current: HubClientContact, patch: UpdateContactInput): Promise<HubClientContact> {
  const { tablesDB, databaseId } = await getHubDb();
  const row = await tablesDB.updateRow({
    databaseId,
    tableId: HUB_TABLES.clientContacts,
    rowId: current.$id,
    data: patch,
  });
  const contact = toPlain<HubClientContact>(row);
  // Only a change to the primary or active flag can move the primary role.
  if (patch.is_primary !== undefined || patch.is_active !== undefined) {
    await settlePrimary(contact.client_id, patch.is_primary ? contact.$id : undefined);
    return (await getContact(contact.$id)) ?? contact;
  }
  return contact;
}

export async function deleteContact(contact: HubClientContact): Promise<void> {
  const { tablesDB, databaseId } = await getHubDb();
  await tablesDB.deleteRow({ databaseId, tableId: HUB_TABLES.clientContacts, rowId: contact.$id });
  if (contact.is_primary) await settlePrimary(contact.client_id);
}

/** Removes every contact of a client in one bulk request (used when the client is deleted). */
export async function deleteContactsOfClient(clientId: string): Promise<void> {
  const { tablesDB, databaseId } = await getHubDb();
  await tablesDB.deleteRows({
    databaseId,
    tableId: HUB_TABLES.clientContacts,
    queries: [Query.equal('client_id', clientId)],
  });
}
