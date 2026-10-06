// Writes the prepared clients and contacts (importi/prepared/*.json) into Appwrite.
//
// Usage (dry run is the default and only reads):
//   npm run hub:import-clients            -> checks the tables and shows what would be written
//   npm run hub:import-clients -- --apply -> writes
//
// Built for an unstable server: rows get fixed ids ("client-<old id>", "contact-<old id>") and are
// upserted in small batches, each retried with back-off on server errors. If the run breaks half way,
// start it again: rows already written are simply overwritten with the same data, nothing is doubled.

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client, Query, TablesDB } from 'node-appwrite';

const apply = process.argv.includes('--apply');

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const PREPARED_DIR = path.join(ROOT, 'importi', 'prepared');
const CLIENTS = 'hub_clients';
const CONTACTS = 'hub_client_contacts';
// Small batches with a pause between them, so the server never gets a burst of writes.
const BATCH = 25;
const PAUSE_BETWEEN_BATCHES_MS = 1000;
const PAGE = 500;
const MAX_ATTEMPTS = 6;
const FIRST_RETRY_MS = 2000;

const CLIENT_COLUMNS = ['name', 'name_key', 'email', 'phone', 'address', 'postal_code', 'city', 'region', 'country', 'tax_id', 'vat_registered', 'website', 'notes', 'is_active'];
const CONTACT_COLUMNS = ['client_id', 'first_name', 'last_name', 'email', 'phone', 'position', 'is_primary', 'is_active'];
const REQUIRED_INDEXES = { [CLIENTS]: ['uq_name_key'], [CONTACTS]: ['idx_client_id'] };

const endpoint = process.env.APPWRITE_ENDPOINT;
const projectId = process.env.APPWRITE_PROJECT_ID;
const databaseId = process.env.APPWRITE_DATABASE_ID;
const apiKey = process.env.APPWRITE_API_KEY;
if (!endpoint || !projectId || !databaseId || !apiKey) {
  console.error('Missing Appwrite settings. Run through npm so .env.local is loaded: npm run hub:import-clients');
  process.exit(1);
}

const tablesDB = new TablesDB(new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey));
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Same rule as clientNameKey() in lib/hub/client-name.ts; keep the two in step.
const clientNameKey = (name) =>
  name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

const clientRowId = (legacyId) => `client-${legacyId}`;
const contactRowId = (legacyId) => `contact-${legacyId}`;

function fail(message) {
  console.error(`\nStopped: ${message}`);
  process.exit(1);
}

// Server errors (5xx, timeouts, the Redis outages seen on this host) are retried; a 4xx means bad data.
async function withRetry(label, request) {
  for (let attempt = 1; ; attempt++) {
    try {
      return await request();
    } catch (error) {
      const code = error?.code ?? 0;
      const retriable = code === 0 || code === 429 || code >= 500;
      if (!retriable || attempt === MAX_ATTEMPTS) throw new Error(`${label}: ${error?.message ?? error}`);
      const wait = FIRST_RETRY_MS * 2 ** (attempt - 1);
      console.warn(`  ${label}: ${error?.message ?? error} (code ${code}); retry ${attempt}/${MAX_ATTEMPTS - 1} in ${wait / 1000}s`);
      await sleep(wait);
    }
  }
}

async function loadPrepared() {
  const read = async (name) => JSON.parse(await readFile(path.join(PREPARED_DIR, name), 'utf8'));
  const [clients, contacts] = await Promise.all([read('clients.json'), read('contacts.json')]);

  const clientRows = clients.map((client) => ({
    $id: clientRowId(client.legacy_id),
    ...Object.fromEntries(CLIENT_COLUMNS.map((key) => [key, client[key] ?? null])),
    name_key: clientNameKey(client.name),
  }));
  const contactRows = contacts.map((contact) => ({
    $id: contactRowId(contact.legacy_id),
    ...Object.fromEntries(CONTACT_COLUMNS.map((key) => [key, contact[key] ?? null])),
    client_id: clientRowId(contact.client_legacy_id),
  }));
  return { clientRows, contactRows };
}

function checkData({ clientRows, contactRows }) {
  const keys = new Map();
  for (const row of clientRows) {
    if (keys.has(row.name_key)) fail(`two clients share the name "${row.name}" (${keys.get(row.name_key)}, ${row.$id})`);
    keys.set(row.name_key, row.$id);
  }
  const clientIds = new Set(clientRows.map((row) => row.$id));
  const orphan = contactRows.find((row) => !clientIds.has(row.client_id));
  if (orphan) fail(`contact ${orphan.$id} points at missing client ${orphan.client_id}`);
}

async function checkTable(tableId, columnKeys) {
  try {
    await tablesDB.getTable({ databaseId, tableId });
  } catch (error) {
    if (error?.code === 404) fail(`table ${tableId} does not exist; run: npm run hub:tables -- --apply`);
    throw error;
  }
  const [{ columns }, { indexes }] = await Promise.all([
    tablesDB.listColumns({ databaseId, tableId, queries: [Query.limit(100)] }),
    tablesDB.listIndexes({ databaseId, tableId, queries: [Query.limit(100)] }),
  ]);
  const status = new Map([...columns, ...indexes].map((item) => [item.key, item.status]));
  for (const key of [...columnKeys, ...REQUIRED_INDEXES[tableId]]) {
    if (!status.has(key)) fail(`${tableId}.${key} is missing; run: npm run hub:tables -- --apply`);
    if (status.get(key) !== 'available') fail(`${tableId}.${key} is "${status.get(key)}", not available; fix it in the console`);
  }
  if (status.has('contact_person')) fail(`${tableId} still has contact_person; run: npm run hub:reset-clients -- --apply`);
}

async function readIds(tableId) {
  const ids = [];
  let cursor = null;
  for (;;) {
    const queries = [Query.select(['$id']), Query.orderAsc('$id'), Query.limit(PAGE), ...(cursor ? [Query.cursorAfter(cursor)] : [])];
    const page = await withRetry(`read ${tableId}`, () => tablesDB.listRows({ databaseId, tableId, queries }));
    ids.push(...page.rows.map((row) => row.$id));
    if (page.rows.length < PAGE) return ids;
    cursor = page.rows.at(-1).$id;
  }
}

async function upsertAll(tableId, rows) {
  for (let start = 0; start < rows.length; start += BATCH) {
    const batch = rows.slice(start, start + BATCH);
    await withRetry(`${tableId} rows ${start + 1}-${start + batch.length}`, () =>
      tablesDB.upsertRows({ databaseId, tableId, rows: batch })
    );
    process.stdout.write(`\r${tableId}: ${start + batch.length}/${rows.length}`);
    if (start + BATCH < rows.length) await sleep(PAUSE_BETWEEN_BATCHES_MS);
  }
  process.stdout.write('\n');
}

console.log(`\nTarget: ${new URL(endpoint).host} / database ${databaseId}`);
console.log(`Mode: ${apply ? 'APPLY' : 'dry run (read-only). Add --apply to write.'}\n`);

const prepared = await loadPrepared();
checkData(prepared);
await checkTable(CLIENTS, CLIENT_COLUMNS);
await checkTable(CONTACTS, CONTACT_COLUMNS);
console.log('Tables, columns and indexes are ready.');

const plan = [
  [CLIENTS, prepared.clientRows],
  [CONTACTS, prepared.contactRows],
];
for (const [tableId, rows] of plan) {
  const existing = await readIds(tableId);
  const wanted = new Set(rows.map((row) => row.$id));
  const foreign = existing.filter((id) => !wanted.has(id));
  if (foreign.length) {
    fail(`${tableId} has ${foreign.length} row(s) that are not part of this import (e.g. ${foreign[0]}); run: npm run hub:reset-clients -- --apply`);
  }
  console.log(`${tableId}: ${rows.length - existing.length} to create, ${existing.length} to overwrite`);
}

if (!apply) {
  console.log('\nDry run finished, nothing was written.');
  process.exit(0);
}

console.log('');
for (const [tableId, rows] of plan) await upsertAll(tableId, rows);

for (const [tableId, rows] of plan) {
  const { total } = await withRetry(`count ${tableId}`, () =>
    tablesDB.listRows({ databaseId, tableId, queries: [Query.select(['$id']), Query.limit(1)] })
  );
  const ok = total === rows.length;
  console.log(`${ok ? 'OK ' : 'MISMATCH'} ${tableId}: ${total} in the database, ${rows.length} expected`);
  if (!ok) process.exitCode = 1;
}
