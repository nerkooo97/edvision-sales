// Internal data-access helpers. These modules use the admin API key and do NOT check who is asking:
// they must only be called from Hub server actions (lib/hub/actions) after requireHubUser().
// They deliberately have no 'use server' directive, so they are never exposed as endpoints.

import { createAdminClient } from '../../appwrite/server';
import { getHubDatabaseId } from '../config';

export async function getHubDb() {
  const { tablesDB } = await createAdminClient();
  return { tablesDB, databaseId: getHubDatabaseId() };
}

/** Rows from the SDK are class instances; convert to plain JSON so they can cross the server/client boundary. */
export function toPlain<T>(value: unknown): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/** Appwrite reports a missing row as code 404. */
export function isNotFound(error: unknown): boolean {
  return (error as { code?: number } | null)?.code === 404;
}
