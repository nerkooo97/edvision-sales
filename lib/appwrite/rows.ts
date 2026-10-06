// Shared helpers for reading sales tables with as little load on Appwrite as possible.
// Not a 'use server' module: these are plain server-side functions used by the data modules.

import { Query, type TablesDB } from 'node-appwrite';
import { appwriteConfig } from './config';

const DATABASE_ID = appwriteConfig.databaseId;

// Appwrite accepts at most 100 values in one Query.equal.
const MAX_EQUAL_VALUES = 100;

type Row = Record<string, unknown>;

/**
 * With Query.select a relationship column ("company.$id") comes back as an object; without select it
 * is the id string. Turns such objects back into id strings, so the rest of the code sees the same
 * shape either way.
 */
export function flattenRelations<T>(rows: unknown[], keys: string[]): T[] {
  return (rows as Row[]).map((row) => {
    const copy: Row = { ...row };
    for (const key of keys) {
      const value = copy[key];
      if (value && typeof value === 'object' && '$id' in value) copy[key] = (value as { $id: string }).$id;
    }
    return copy as T;
  });
}

/**
 * Reads every row matching `queries`, page by page with a cursor. Appwrite is asked not to count the
 * table (total: false), which it otherwise does on every request.
 */
export async function fetchAllRows(
  tablesDB: TablesDB,
  tableId: string,
  queries: string[],
  { pageSize = 500, maxPages = 40 }: { pageSize?: number; maxPages?: number } = {}
): Promise<Row[]> {
  const all: Row[] = [];
  let cursor: string | undefined;

  for (let page = 0; page < maxPages; page++) {
    const pageQueries = [...queries, Query.limit(pageSize), ...(cursor ? [Query.cursorAfter(cursor)] : [])];
    const res = await tablesDB.listRows({ databaseId: DATABASE_ID, tableId, queries: pageQueries, total: false });
    const rows = (res.rows || []) as unknown as Row[];
    all.push(...rows);

    if (rows.length < pageSize) return all;
    cursor = rows[rows.length - 1].$id as string;
  }

  console.warn(`fetchAllRows(${tableId}): stopped after ${maxPages} pages of ${pageSize} rows`);
  return all;
}

/** Reads the rows with the given ids (in groups of 100), optionally only some columns. Failed groups are skipped. */
export async function fetchRowsByIds(
  tablesDB: TablesDB,
  tableId: string,
  ids: string[],
  select?: string[]
): Promise<Row[]> {
  const unique = [...new Set(ids.filter(Boolean))];
  const groups: string[][] = [];
  for (let i = 0; i < unique.length; i += MAX_EQUAL_VALUES) groups.push(unique.slice(i, i + MAX_EQUAL_VALUES));

  const results = await Promise.all(
    groups.map((group) =>
      tablesDB
        .listRows({
          databaseId: DATABASE_ID,
          tableId,
          queries: [...(select ? [Query.select(select)] : []), Query.equal('$id', group), Query.limit(group.length)],
          total: false,
        })
        .then((res) => (res.rows || []) as unknown as Row[])
        .catch((error) => {
          console.error(`fetchRowsByIds(${tableId}) failed for a group:`, error);
          return [] as Row[];
        })
    )
  );
  return results.flat();
}

/** The id behind a relationship value, whether it is an id string or a loaded row. */
export function relationId(value: unknown): string | undefined {
  if (typeof value === 'string') return value || undefined;
  if (value && typeof value === 'object' && '$id' in value) return (value as { $id?: string }).$id;
  return undefined;
}
