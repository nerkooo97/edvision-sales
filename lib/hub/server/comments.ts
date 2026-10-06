import { ID, Query } from 'node-appwrite';
import { HUB_TABLES } from '../config';
import type { HubComment, HubPage } from '../types';
import { getHubDb, isNotFound, toPlain } from './db';

const PAGE_SIZE = 30;

/**
 * The newest page of a project's comments, returned oldest first (reading order). `before` is the id of
 * the oldest comment already shown; one row more than the page tells whether older comments exist.
 */
export async function listComments(projectId: string, before?: string): Promise<HubPage<HubComment>> {
  const { tablesDB, databaseId } = await getHubDb();
  const { rows } = await tablesDB.listRows({
    databaseId,
    total: false,
    tableId: HUB_TABLES.comments,
    queries: [
      Query.equal('project_id', projectId),
      Query.orderDesc('$createdAt'),
      Query.limit(PAGE_SIZE + 1),
      ...(before ? [Query.cursorAfter(before)] : []),
    ],
  });
  const items = toPlain<HubComment[]>(rows.slice(0, PAGE_SIZE)).reverse();
  return { items, hasMore: rows.length > PAGE_SIZE };
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
