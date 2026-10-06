// Writes the prepared contracts (importi/prepared/*-contracts.json) into Appwrite.
//
// Usage (dry run is the default and only reads):
//   npm run hub:import-contracts            -> checks tables and clients, shows what would be written
//   npm run hub:import-contracts -- --apply -> writes
//
// Same safety as the client import: fixed row ids (re-running overwrites instead of doubling), small
// upsert batches with a pause, retries with back-off on server errors, a field-by-field check at the end.

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client, Query, TablesDB } from 'node-appwrite';

const apply = process.argv.includes('--apply');

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const PREPARED_DIR = path.join(ROOT, 'importi', 'prepared');
const BATCH = 25;
const PAUSE_BETWEEN_BATCHES_MS = 1000;
const MAX_ATTEMPTS = 6;
const FIRST_RETRY_MS = 2000;

const TABLES = [
  {
    tableId: 'hub_maintenance_contracts',
    file: 'maintenance-contracts.json',
    columns: ['client_id', 'domain', 'service', 'start_date', 'end_date'],
    indexes: ['idx_client_id'],
  },
  {
    tableId: 'hub_marketing_contracts',
    file: 'marketing-contracts.json',
    columns: ['client_id', 'category', 'service', 'contract_status', 'contract_start', 'contract_end', 'year', 'months'],
    indexes: ['idx_year', 'idx_client_id'],
  },
];

const endpoint = process.env.APPWRITE_ENDPOINT;
const databaseId = process.env.APPWRITE_DATABASE_ID;
if (!endpoint || !process.env.APPWRITE_PROJECT_ID || !databaseId || !process.env.APPWRITE_API_KEY) {
  console.error('Missing Appwrite settings. Run through npm so .env.local is loaded: npm run hub:import-contracts');
  process.exit(1);
}
const tablesDB = new TablesDB(
  new Client().setEndpoint(endpoint).setProject(process.env.APPWRITE_PROJECT_ID).setKey(process.env.APPWRITE_API_KEY)
);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function fail(message) {
  console.error(`\nStopped: ${message}`);
  process.exit(1);
}

async function withRetry(label, request) {
  for (let attempt = 1; ; attempt++) {
    try {
      return await request();
    } catch (error) {
      const code = error?.code ?? 0;
      if (!(code === 0 || code === 429 || code >= 500) || attempt === MAX_ATTEMPTS) {
        throw new Error(`${label}: ${error?.message ?? error}`);
      }
      const wait = FIRST_RETRY_MS * 2 ** (attempt - 1);
      console.warn(`  ${label}: ${error?.message ?? error} (code ${code}); retry ${attempt}/${MAX_ATTEMPTS - 1} in ${wait / 1000}s`);
      await sleep(wait);
    }
  }
}

async function readAll(tableId, select) {
  const rows = [];
  let cursor = null;
  for (;;) {
    const queries = [Query.select(select), Query.orderAsc('$id'), Query.limit(500), ...(cursor ? [Query.cursorAfter(cursor)] : [])];
    const page = await withRetry(`read ${tableId}`, () => tablesDB.listRows({ databaseId, tableId, queries, total: false }));
    rows.push(...page.rows);
    if (page.rows.length < 500) return rows;
    cursor = page.rows.at(-1).$id;
  }
}

async function checkTable({ tableId, columns, indexes }) {
  const [{ columns: existing }, { indexes: existingIndexes }] = await Promise.all([
    tablesDB.listColumns({ databaseId, tableId, queries: [Query.limit(100)] }),
    tablesDB.listIndexes({ databaseId, tableId, queries: [Query.limit(100)] }),
  ]);
  const status = new Map([...existing, ...existingIndexes].map((item) => [item.key, item.status]));
  for (const key of [...columns, ...indexes]) {
    if (status.get(key) !== 'available') fail(`${tableId}.${key} is ${status.get(key) ?? 'missing'}; run: npm run hub:tables -- --apply`);
  }
}

const plan = await Promise.all(
  TABLES.map(async (table) => {
    const prepared = JSON.parse(await readFile(path.join(PREPARED_DIR, table.file), 'utf8'));
    const rows = prepared.map((row) => ({
      $id: row.row_id,
      ...Object.fromEntries(table.columns.filter((c) => c !== 'client_id').map((c) => [c, row[c] ?? null])),
      client_id: `client-${row.client_legacy_id}`,
    }));
    return { ...table, rows };
  })
);

console.log(`\nTarget: ${new URL(endpoint).host} / database ${databaseId}`);
console.log(`Mode: ${apply ? 'APPLY' : 'dry run (read-only). Add --apply to write.'}\n`);

for (const table of plan) await checkTable(table);
console.log('Tables, columns and indexes are ready.');

const clientIds = new Set((await readAll('hub_clients', ['$id'])).map((row) => row.$id));
for (const { tableId, rows } of plan) {
  const missing = rows.filter((row) => !clientIds.has(row.client_id));
  if (missing.length) fail(`${tableId}: ${missing.length} row(s) point at a client that is not in hub_clients (e.g. ${missing[0].client_id})`);
}
console.log('Every contract points at an existing client.');

for (const { tableId, rows } of plan) {
  const wanted = new Set(rows.map((row) => row.$id));
  const existing = (await readAll(tableId, ['$id'])).map((row) => row.$id);
  const foreign = existing.filter((id) => !wanted.has(id));
  if (foreign.length) fail(`${tableId} already has ${foreign.length} row(s) not from this import (e.g. ${foreign[0]}); check them first`);
  console.log(`${tableId}: ${rows.length - existing.length} to create, ${existing.length} to overwrite`);
}

if (!apply) {
  console.log('\nDry run finished, nothing was written.');
  process.exit(0);
}

console.log('');
for (const { tableId, rows } of plan) {
  for (let start = 0; start < rows.length; start += BATCH) {
    const batch = rows.slice(start, start + BATCH);
    await withRetry(`${tableId} rows ${start + 1}-${start + batch.length}`, () => tablesDB.upsertRows({ databaseId, tableId, rows: batch }));
    console.log(`${tableId}: ${start + batch.length}/${rows.length}`);
    if (start + BATCH < rows.length) await sleep(PAUSE_BETWEEN_BATCHES_MS);
  }
}

// Field-by-field check against what was meant to be written.
for (const { tableId, rows, columns } of plan) {
  const stored = new Map((await readAll(tableId, ['$id', ...columns])).map((row) => [row.$id, row]));
  const differences = rows.filter((row) => columns.some((c) => (stored.get(row.$id)?.[c] ?? null) !== row[c]));
  const ok = stored.size === rows.length && differences.length === 0;
  console.log(`${ok ? 'OK ' : 'MISMATCH'} ${tableId}: ${stored.size} in the database, ${rows.length} expected, ${differences.length} with differences`);
  if (!ok) process.exitCode = 1;
}
