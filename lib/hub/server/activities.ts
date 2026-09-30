import { ID, Query } from 'node-appwrite';
import type { ActivityType } from '../constants';
import { HUB_TABLES } from '../config';
import type { HubActivity } from '../types';
import { getHubDb, toPlain } from './db';

const DEFAULT_LIMIT = 100;

export async function listActivities(projectId: string, limit = DEFAULT_LIMIT): Promise<HubActivity[]> {
  const { tablesDB, databaseId } = await getHubDb();
  const { rows } = await tablesDB.listRows({
    databaseId,
    tableId: HUB_TABLES.activities,
    queries: [Query.equal('project_id', projectId), Query.orderDesc('$createdAt'), Query.limit(limit)],
  });
  return toPlain<HubActivity[]>(rows);
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
