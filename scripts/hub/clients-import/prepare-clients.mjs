// Cleans the exported clients and contacts (importi/*.csv) into import-ready files. Local only: no database access.
//
// Usage: npm run hub:prepare-clients
// Output in importi/prepared/: clients.json, contacts.json (for the import), clients.csv, contacts.csv (for review
// in Excel) and report.md (what was changed and what needs a human look).

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildImport } from './build.mjs';
import { parseCsv, toCsv } from './csv.mjs';
import { buildReport } from './report.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const INPUT_DIR = path.join(ROOT, 'importi');
const OUTPUT_DIR = path.join(INPUT_DIR, 'prepared');

const CLIENT_COLUMNS = [
  'legacy_id', 'name', 'tax_id', 'vat_registered', 'address', 'postal_code', 'city', 'region', 'country',
  'phone', 'email', 'website', 'is_active', 'notes',
];
const CONTACT_COLUMNS = [
  'legacy_id', 'client_legacy_id', 'first_name', 'last_name', 'email', 'phone', 'position', 'is_primary', 'is_active',
];

const readCsv = async (name) => parseCsv(await readFile(path.join(INPUT_DIR, name), 'utf8'));

const clientRows = await readCsv('klijenti.csv');
const contactRows = await readCsv('kontakti.csv');
const result = buildImport(clientRows, contactRows);
const { clients, contacts, journal } = result;

await mkdir(OUTPUT_DIR, { recursive: true });
const write = (name, content) => writeFile(path.join(OUTPUT_DIR, name), content, 'utf8');
await Promise.all([
  write('clients.json', `${JSON.stringify(clients, null, 2)}\n`),
  write('contacts.json', `${JSON.stringify(contacts, null, 2)}\n`),
  write('clients.csv', toCsv(clients, CLIENT_COLUMNS)),
  write('contacts.csv', toCsv(contacts, CONTACT_COLUMNS)),
  write('report.md', buildReport({ input: { clients: clientRows.length, contacts: contactRows.length }, ...result })),
]);

console.log(`Clients: ${clientRows.length} in, ${clients.length} prepared`);
console.log(`Contacts: ${contactRows.length} in, ${contacts.length} prepared`);
console.log(`Review notes: ${journal.warnings.length}`);
console.log(`Written to ${path.relative(ROOT, OUTPUT_DIR)}`);
