// Creates the Project Hub tables in Appwrite. Idempotent: existing tables/columns/indexes are skipped.
//
// Usage (dry run is the default and only reads):
//   npm run hub:tables            -> shows what would be created
//   npm run hub:tables -- --apply -> creates it
//
// Credentials come only from the environment (.env.local, which is git-ignored).
// Nothing secret is printed and nothing secret is written to disk by this script.

import { Client, Query, TablesDB } from 'node-appwrite';
import { HUB_TABLES, TABLE_PREFIX } from './schema.mjs';

const apply = process.argv.includes('--apply');

const endpoint = process.env.APPWRITE_ENDPOINT || process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const projectId = process.env.APPWRITE_PROJECT_ID || process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
const databaseId = process.env.APPWRITE_DATABASE_ID || process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;
const apiKey = process.env.APPWRITE_API_KEY;

if (!endpoint || !projectId || !databaseId || !apiKey) {
  console.error(
    'Missing APPWRITE_ENDPOINT / APPWRITE_PROJECT_ID / APPWRITE_DATABASE_ID / APPWRITE_API_KEY.\n' +
      'Run through npm so .env.local is loaded: npm run hub:tables'
  );
  process.exit(1);
}

const tablesDB = new TablesDB(new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey));

const POLL_INTERVAL_MS = 1000;
const POLL_TIMEOUT_MS = 90_000;
// Appwrite lists only 25 items by default; tables here have more columns than that.
const LIST_LIMIT = 100;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const errorMessage = (error) => (error instanceof Error ? error.message : String(error));

async function tableExists(tableId) {
  try {
    await tablesDB.getTable({ databaseId, tableId });
    return true;
  } catch (error) {
    if (error?.code === 404) return false;
    throw error;
  }
}

async function listKeys(tableId, kind) {
  if (kind === 'columns') {
    const { columns } = await tablesDB.listColumns({ databaseId, tableId, queries: [Query.limit(LIST_LIMIT)] });
    return columns;
  }
  const { indexes } = await tablesDB.listIndexes({ databaseId, tableId, queries: [Query.limit(LIST_LIMIT)] });
  return indexes;
}

// Columns and indexes are created asynchronously by Appwrite; wait until they are usable.
async function waitUntilAvailable(tableId, kind) {
  const started = Date.now();
  while (Date.now() - started < POLL_TIMEOUT_MS) {
    const items = await listKeys(tableId, kind);
    const failed = items.find((item) => item.status === 'failed');
    if (failed) throw new Error(`${tableId}: ${kind} "${failed.key}" failed to build`);
    if (items.every((item) => item.status === 'available')) return;
    await sleep(POLL_INTERVAL_MS);
  }
  throw new Error(`${tableId}: timed out waiting for ${kind} to become available`);
}

function createColumn(tableId, column) {
  const base = { databaseId, tableId, key: column.key, required: column.required };
  const withArray = { ...base, array: Boolean(column.array) };

  switch (column.type) {
    case 'string':
      return tablesDB.createStringColumn({ ...withArray, size: column.size, xdefault: column.default ?? undefined });
    case 'integer':
      return tablesDB.createIntegerColumn({
        ...withArray,
        min: column.min,
        max: column.max,
        xdefault: column.default ?? undefined,
      });
    case 'float':
      return tablesDB.createFloatColumn({ ...withArray, min: column.min, max: column.max });
    case 'boolean':
      return tablesDB.createBooleanColumn({ ...base, xdefault: column.default ?? undefined, array: false });
    case 'datetime':
      return tablesDB.createDatetimeColumn(withArray);
    default:
      throw new Error(`Unsupported column type: ${column.type}`);
  }
}

async function ensureTable(table) {
  if (!table.id.startsWith(TABLE_PREFIX)) {
    throw new Error(`Refusing to touch "${table.id}": only ${TABLE_PREFIX}* tables are allowed`);
  }

  const exists = await tableExists(table.id);
  const existingColumns = exists ? new Set((await listKeys(table.id, 'columns')).map((c) => c.key)) : new Set();
  const existingIndexes = exists ? new Set((await listKeys(table.id, 'indexes')).map((i) => i.key)) : new Set();

  const missingColumns = table.columns.filter((c) => !existingColumns.has(c.key));
  const missingIndexes = table.indexes.filter((i) => !existingIndexes.has(i.key));

  console.log(
    `${table.id}: ${exists ? 'exists' : 'NEW'}, ` +
      `${missingColumns.length} column(s) to add, ${missingIndexes.length} index(es) to add`
  );

  if (!apply) return;

  if (!exists) {
    // Empty permissions + no row security: access only through the server API key, like the sales tables.
    await tablesDB.createTable({
      databaseId,
      tableId: table.id,
      name: table.name,
      permissions: [],
      rowSecurity: false,
      enabled: true,
    });
  }

  for (const column of missingColumns) {
    await createColumn(table.id, column);
  }
  if (missingColumns.length > 0) await waitUntilAvailable(table.id, 'columns');

  for (const index of missingIndexes) {
    await tablesDB.createIndex({
      databaseId,
      tableId: table.id,
      key: index.key,
      type: index.type,
      columns: index.columns,
    });
  }
  if (missingIndexes.length > 0) await waitUntilAvailable(table.id, 'indexes');
}

async function seedProjectCounter() {
  const tableId = 'hub_counters';
  const rowId = 'project_code';
  try {
    await tablesDB.getRow({ databaseId, tableId, rowId });
    console.log(`${tableId}: counter row "${rowId}" exists`);
  } catch (error) {
    if (error?.code !== 404) throw error;
    if (!apply) {
      console.log(`${tableId}: counter row "${rowId}" would be created (value 100)`);
      return;
    }
    // Starts at 100 so the first project gets PRJ-101.
    await tablesDB.createRow({ databaseId, tableId, rowId, data: { key: rowId, value: 100 } });
    console.log(`${tableId}: counter row "${rowId}" created`);
  }
}

async function main() {
  const host = new URL(endpoint).host;
  console.log(`Target: ${host} / project ${projectId} / database ${databaseId}`);
  console.log(apply ? 'Mode: APPLY (writes to the database)\n' : 'Mode: dry run (read-only). Add --apply to create.\n');

  for (const table of HUB_TABLES) {
    await ensureTable(table);
  }

  // The counter row can only be seeded once the table exists (in a dry run it may not).
  if (apply || (await tableExists('hub_counters'))) {
    await seedProjectCounter();
  } else {
    console.log('hub_counters: counter row would be created after the table (value 100)');
  }

  console.log('\nDone.');
}

main().catch((error) => {
  console.error(`Failed: ${errorMessage(error)}`);
  process.exit(1);
});
