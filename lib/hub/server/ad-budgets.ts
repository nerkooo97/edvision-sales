import { Query } from 'node-appwrite';
import { HUB_TABLES } from '../config';
import type { AdBudgetInput } from '../schemas';
import type { HubAdBudget } from '../types';
import { getHubDb, isNotFound, toPlain } from './db';

const MAX_ROWS = 500;

/** One row per project, month and platform; the fixed id makes saving a plain upsert. */
const rowIdOf = (projectId: string, month: string, platform: string) =>
  `${projectId}_${month.replace('-', '')}_${platform}`;

export async function listAdBudgets(projectId: string): Promise<HubAdBudget[]> {
  const { tablesDB, databaseId } = await getHubDb();
  const { rows } = await tablesDB.listRows({
    databaseId,
    total: false,
    tableId: HUB_TABLES.adBudgets,
    queries: [Query.equal('project_id', projectId), Query.orderAsc('month'), Query.limit(MAX_ROWS)],
  });
  return toPlain<HubAdBudget[]>(rows);
}

/** Every project's plan and spend for one month, used for alerts and the report. */
export async function listAdBudgetsForMonth(month: string): Promise<HubAdBudget[]> {
  const { tablesDB, databaseId } = await getHubDb();
  const { rows } = await tablesDB.listRows({
    databaseId,
    total: false,
    tableId: HUB_TABLES.adBudgets,
    queries: [Query.equal('month', month), Query.limit(MAX_ROWS)],
  });
  return toPlain<HubAdBudget[]>(rows);
}

/** Saves the plan and the actual spend of one month on one platform (absolute values, so retries are harmless). */
export async function setAdBudget(projectId: string, input: AdBudgetInput, userId: string): Promise<HubAdBudget> {
  const { tablesDB, databaseId } = await getHubDb();
  const rowId = rowIdOf(projectId, input.month, input.platform);
  const data = {
    project_id: projectId,
    month: input.month,
    platform: input.platform,
    planned: input.planned,
    spent: input.spent,
    updated_by: userId,
  };

  try {
    const row = await tablesDB.updateRow({ databaseId, tableId: HUB_TABLES.adBudgets, rowId, data });
    return toPlain<HubAdBudget>(row);
  } catch (error) {
    if (!isNotFound(error)) throw error;
    const row = await tablesDB.createRow({ databaseId, tableId: HUB_TABLES.adBudgets, rowId, data });
    return toPlain<HubAdBudget>(row);
  }
}
