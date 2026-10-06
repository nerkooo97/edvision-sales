import { ID, Query } from 'node-appwrite';
import { HUB_TABLES } from '../config';
import type { CreateTaskInput, UpdateTaskInput } from '../schemas';
import { revisionStats } from '../revisions';
import type { HubTask } from '../types';
import { getHubDb, isNotFound, toPlain } from './db';
import { adjustTaskCounters } from './projects';

const PROJECT_TASKS_LIMIT = 500;
const OPEN_TASKS_LIMIT = 100;

export async function listTasks(projectId: string): Promise<HubTask[]> {
  const { tablesDB, databaseId } = await getHubDb();
  const { rows } = await tablesDB.listRows({
    databaseId,
    total: false,
    tableId: HUB_TABLES.tasks,
    queries: [Query.equal('project_id', projectId), Query.orderAsc('$createdAt'), Query.limit(PROJECT_TASKS_LIMIT)],
  });
  return toPlain<HubTask[]>(rows);
}

/** Unfinished tasks assigned to a user, soonest deadline first ("my tasks"). */
export async function listOpenTasksForAssignee(userId: string): Promise<HubTask[]> {
  const { tablesDB, databaseId } = await getHubDb();
  const { rows } = await tablesDB.listRows({
    databaseId,
    total: false,
    tableId: HUB_TABLES.tasks,
    queries: [
      Query.equal('assignee_id', userId),
      Query.notEqual('status', 'done'),
      Query.orderAsc('deadline'),
      Query.limit(OPEN_TASKS_LIMIT),
    ],
  });
  return toPlain<HubTask[]>(rows);
}

export async function getTask(taskId: string): Promise<HubTask | null> {
  const { tablesDB, databaseId } = await getHubDb();
  try {
    const row = await tablesDB.getRow({ databaseId, tableId: HUB_TABLES.tasks, rowId: taskId });
    return toPlain<HubTask>(row);
  } catch (error) {
    if (isNotFound(error)) return null;
    throw error;
  }
}

/**
 * Keeps the revision count and total time on the project in step with its tasks. Written as absolute numbers
 * (not increments), so a missed update corrects itself the next time. A failure here must not undo the task
 * change that already succeeded.
 */
async function recountRevisions(projectId: string): Promise<void> {
  try {
    const stats = revisionStats(await listTasks(projectId));
    const { tablesDB, databaseId } = await getHubDb();
    await tablesDB.updateRow({
      databaseId,
      tableId: HUB_TABLES.projects,
      rowId: projectId,
      data: { revisions_count: stats.count, revisions_minutes: stats.minutes },
    });
  } catch (error) {
    console.error('Hub: revision stats update failed', error);
  }
}

export async function createTask(projectId: string, input: CreateTaskInput, createdBy: string): Promise<HubTask> {
  const { tablesDB, databaseId } = await getHubDb();
  const row = await tablesDB.createRow({
    databaseId,
    tableId: HUB_TABLES.tasks,
    rowId: ID.unique(),
    data: { ...input, project_id: projectId, created_by: createdBy },
  });
  await adjustTaskCounters(projectId, { total: 1, done: input.status === 'done' ? 1 : 0 });
  if (input.is_revision) await recountRevisions(projectId);
  return toPlain<HubTask>(row);
}

export async function updateTask(existing: HubTask, patch: UpdateTaskInput): Promise<HubTask> {
  const { tablesDB, databaseId } = await getHubDb();
  const row = await tablesDB.updateRow({
    databaseId,
    tableId: HUB_TABLES.tasks,
    rowId: existing.$id,
    data: patch,
  });

  if (patch.status && patch.status !== existing.status) {
    const done = (patch.status === 'done' ? 1 : 0) - (existing.status === 'done' ? 1 : 0);
    await adjustTaskCounters(existing.project_id, { done });
  }
  if (existing.is_revision || patch.is_revision) await recountRevisions(existing.project_id);
  return toPlain<HubTask>(row);
}

export async function deleteTask(existing: HubTask): Promise<void> {
  const { tablesDB, databaseId } = await getHubDb();
  await tablesDB.deleteRow({ databaseId, tableId: HUB_TABLES.tasks, rowId: existing.$id });
  await adjustTaskCounters(existing.project_id, { total: -1, done: existing.status === 'done' ? -1 : 0 });
  if (existing.is_revision) await recountRevisions(existing.project_id);
}
