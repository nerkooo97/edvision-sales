import { ID, Query } from 'node-appwrite';
import type { ActivityType } from '../constants';
import { HUB_TABLES } from '../config';
import type { HubActivity, HubPage } from '../types';
import { getHubDb, toPlain } from './db';

const PAGE_SIZE = 50;

/**
 * One page of a project's history, newest first. `before` is the id of the oldest entry already shown;
 * one row more than the page tells whether older entries exist, so Appwrite never counts the table.
 */
export async function listActivities(projectId: string, before?: string): Promise<HubPage<HubActivity>> {
  const { tablesDB, databaseId } = await getHubDb();
  const { rows } = await tablesDB.listRows({
    databaseId,
    total: false,
    tableId: HUB_TABLES.activities,
    queries: [
      Query.equal('project_id', projectId),
      Query.orderDesc('$createdAt'),
      Query.limit(PAGE_SIZE + 1),
      ...(before ? [Query.cursorAfter(before)] : []),
    ],
  });
  return { items: toPlain<HubActivity[]>(rows.slice(0, PAGE_SIZE)), hasMore: rows.length > PAGE_SIZE };
}

/** The audit log must never break the action it describes, so failures are logged and swallowed. */
export async function logActivity(entry: {
  projectId: string;
  userId: string;
  type: ActivityType;
  details: string;
}): Promise<void> {
  try {
    const { tablesDB, databaseId } = await getHubDb();
    await tablesDB.createRow({
      databaseId,
      tableId: HUB_TABLES.activities,
      rowId: ID.unique(),
      data: {
        project_id: entry.projectId,
        user_id: entry.userId,
        type: entry.type,
        details: entry.details.slice(0, 1000),
      },
    });
  } catch (error) {
    console.error('Hub: failed to write activity log', error);
  }
}
