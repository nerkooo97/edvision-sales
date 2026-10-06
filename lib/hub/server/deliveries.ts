import { Query } from 'node-appwrite';
import { HUB_TABLES } from '../config';
import type { HubDelivery } from '../types';
import { getHubDb, isNotFound, toPlain } from './db';

const MAX_WEEKS = 200;

/** One row per project and contract week; the fixed id makes "set the count for week N" a plain upsert. */
const deliveryRowId = (projectId: string, week: number) => `${projectId}_${week}`;

export async function listDeliveries(projectId: string): Promise<HubDelivery[]> {
  const { tablesDB, databaseId } = await getHubDb();
  const { rows } = await tablesDB.listRows({
    databaseId,
    total: false,
    tableId: HUB_TABLES.deliveries,
    queries: [Query.equal('project_id', projectId), Query.orderAsc('week'), Query.limit(MAX_WEEKS)],
  });
  return toPlain<HubDelivery[]>(rows);
}

/** Sets the number of posts delivered in a week (absolute value, so retries and double clicks are harmless). */
export async function setDelivery(
  projectId: string,
  week: number,
  delivered: number,
  userId: string
): Promise<HubDelivery> {
  const { tablesDB, databaseId } = await getHubDb();
  const rowId = deliveryRowId(projectId, week);
  const data = { project_id: projectId, week, delivered, updated_by: userId };

  try {
    const row = await tablesDB.updateRow({ databaseId, tableId: HUB_TABLES.deliveries, rowId, data });
    return toPlain<HubDelivery>(row);
  } catch (error) {
    if (!isNotFound(error)) throw error;
    const row = await tablesDB.createRow({ databaseId, tableId: HUB_TABLES.deliveries, rowId, data });
    return toPlain<HubDelivery>(row);
  }
}
