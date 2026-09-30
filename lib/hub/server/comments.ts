import { ID, Query } from 'node-appwrite';
import { HUB_TABLES } from '../config';
import type { HubComment } from '../types';
import { getHubDb, isNotFound, toPlain } from './db';

const DEFAULT_LIMIT = 200;

export async function listComments(projectId: string, limit = DEFAULT_LIMIT): Promise<HubComment[]> {
  const { tablesDB, databaseId } = await getHubDb();
  const { rows } = await tablesDB.listRows({
    databaseId,
    tableId: HUB_TABLES.comments,
    queries: [Query.equal('project_id', projectId), Query.orderAsc('$createdAt'), Query.limit(limit)],
  });
  return toPlain<HubComment[]>(rows);
}

export async function getComment(commentId: string): Promise<HubComment | null> {
  const { tablesDB, databaseId } = await getHubDb();
  try {
    const row = await tablesDB.getRow({ databaseId, tableId: HUB_TABLES.comments, rowId: commentId });
    return toPlain<HubComment>(row);
  } catch (error) {
    if (isNotFound(error)) return null;
    throw error;
  }
}

export async function createComment(data: {
  projectId: string;
  authorId: string;
  text: string;
}): Promise<HubComment> {
  const { tablesDB, databaseId } = await getHubDb();
  const row = await tablesDB.createRow({
    databaseId,
    tableId: HUB_TABLES.comments,
    rowId: ID.unique(),
    data: { project_id: data.projectId, author_id: data.authorId, text: data.text },
  });
  return toPlain<HubComment>(row);
}

export async function deleteComment(commentId: string): Promise<void> {
  const { tablesDB, databaseId } = await getHubDb();
  await tablesDB.deleteRow({ databaseId, tableId: HUB_TABLES.comments, rowId: commentId });
}
