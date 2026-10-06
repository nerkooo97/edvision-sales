// Empties hub_clients before the fresh import and drops the column the new schema no longer has.
//
// Usage (dry run is the default and only reads):
//   npm run hub:reset-clients            -> shows what would happen
//   npm run hub:reset-clients -- --apply -> backs up, deletes, drops the column
//
// Safety: refuses to run while any project or contract still points at a client, and writes every
// client row to importi/backup/ before deleting anything. Run it BEFORE `npm run hub:tables -- --apply`:
// Appwrite adds required columns reliably only to an empty table.

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client, Query, TablesDB } from 'node-appwrite';

const apply = process.argv.includes('--apply');

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const BACKUP_DIR = path.join(ROOT, 'importi', 'backup');
const CLIENTS = 'hub_clients';
const REFERENCING_TABLES = ['hub_projects', 'hub_marketing_contracts', 'hub_maintenance_contracts'];
const DROPPED_COLUMNS = ['contact_person'];
const PAGE = 100;
const POLL_INTERVAL_MS = 1000;
const POLL_TIMEOUT_MS = 60_000;

const endpoint = process.env.APPWRITE_ENDPOINT;
const projectId = process.env.APPWRITE_PROJECT_ID;
const databaseId = process.env.APPWRITE_DATABASE_ID;
const apiKey = process.env.APPWRITE_API_KEY;
if (!endpoint || !projectId || !databaseId || !apiKey) {
  console.error('Missing Appwrite settings. Run through npm so .env.local is loaded: npm run hub:reset-clients');
  process.exit(1);
}

const tablesDB = new TablesDB(new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey));
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function readAllClients() {
  const rows = [];
  let cursor = null;
  for (;;) {
    const queries = [Query.orderAsc('$id'), Query.limit(PAGE), ...(cursor ? [Query.cursorAfter(cursor)] : [])];
    const page = await tablesDB.listRows({ databaseId, tableId: CLIENTS, queries });
    rows.push(...page.rows);
    if (page.rows.length < PAGE) return rows;
    cursor = page.rows.at(-1).$id;
  }
}

async function countReferences() {
  const counts = await Promise.all(
    REFERENCING_TABLES.map(async (tableId) => {
      const { total } = await tablesDB.listRows({
        databaseId,
        tableId,
        queries: [Query.isNotNull('client_id'), Query.limit(1)],
      });
      return [tableId, total];
    })
  );
  return counts.filter(([, total]) => total > 0);
}

async function existingColumns() {
  const { columns } = await tablesDB.listColumns({ databaseId, tableId: CLIENTS, queries: [Query.limit(100)] });
  return new Set(columns.map((column) => column.key));
}

async function waitUntilDropped(key) {
  const started = Date.now();
  while (Date.now() - started < POLL_TIMEOUT_MS) {
    if (!(await existingColumns()).has(key)) return;
    await sleep(POLL_INTERVAL_MS);
  }
  throw new Error(`Column "${key}" is still being deleted after ${POLL_TIMEOUT_MS / 1000}s; check the console.`);
}

console.log(`\nTarget: ${new URL(endpoint).host} / database ${databaseId}`);
console.log(`Mode: ${apply ? 'APPLY' : 'dry run (read-only). Add --apply to change the database.'}\n`);

const references = await countReferences();
if (references.length) {
  for (const [tableId, total] of references) console.error(`${tableId}: ${total} row(s) still linked to a client`);
  console.error('\nStopped: remove or unlink those rows first.');
  process.exit(1);
}
console.log('No project or contract points at a client.');

const clients = await readAllClients();
const columns = await existingColumns();
const toDrop = DROPPED_COLUMNS.filter((key) => columns.has(key));
console.log(`${CLIENTS}: ${clients.length} row(s) to delete`);
console.log(`${CLIENTS}: column(s) to drop: ${toDrop.length ? toDrop.join(', ') : 'none'}`);

if (!apply) {
  console.log('\nDry run finished, nothing was changed.');
  process.exit(0);
}

await mkdir(BACKUP_DIR, { recursive: true });
const backupFile = path.join(BACKUP_DIR, `hub_clients-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
await writeFile(backupFile, `${JSON.stringify(clients, null, 2)}\n`, 'utf8');
console.log(`\nBackup: ${path.relative(ROOT, backupFile)} (${clients.length} rows)`);

for (const [index, client] of clients.entries()) {
  await tablesDB.deleteRow({ databaseId, tableId: CLIENTS, rowId: client.$id });
  process.stdout.write(`\rDeleted ${index + 1}/${clients.length}`);
}
if (clients.length) process.stdout.write('\n');

for (const key of toDrop) {
  await tablesDB.deleteColumn({ databaseId, tableId: CLIENTS, key });
  await waitUntilDropped(key);
  console.log(`Dropped column ${key}`);
}

const left = await tablesDB.listRows({ databaseId, tableId: CLIENTS, queries: [Query.limit(1)] });
console.log(`\nDone. ${CLIENTS} now has ${left.total} row(s). Next: npm run hub:tables -- --apply`);
