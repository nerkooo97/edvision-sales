import { HUB_TABLES, PROJECT_CODE_COUNTER_ID, PROJECT_CODE_PREFIX } from '../config';
import { getHubDb } from './db';

/** Atomically increments the counter in the database, so two simultaneous projects never share a code. */
export async function nextProjectCode(): Promise<string> {
  const { tablesDB, databaseId } = await getHubDb();
  const row = await tablesDB.incrementRowColumn({
    databaseId,
    tableId: HUB_TABLES.counters,
    rowId: PROJECT_CODE_COUNTER_ID,
    column: 'value',
    value: 1,
  });
  return `${PROJECT_CODE_PREFIX}-${Number(row.value)}`;
}
