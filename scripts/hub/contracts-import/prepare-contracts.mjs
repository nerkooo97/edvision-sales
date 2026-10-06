// Turns the contracts spreadsheet (importi/ugovori-2026.xlsx) into import-ready files. Local only: no database.
//
// Usage: npm run hub:prepare-contracts
// Needs importi/prepared/clients.json (from hub:prepare-clients) to resolve clients, and the git-ignored
// importi/contracts-decisions.mjs (client name mapping, year, status of stopped rows).
// Output in importi/prepared/: maintenance-contracts.json, marketing-contracts.json, contracts-report.md.

import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { excelDate, readWorkbook } from './xlsx.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const IMPORT_DIR = path.join(ROOT, 'importi');
const OUTPUT_DIR = path.join(IMPORT_DIR, 'prepared');
const WORKBOOK = path.join(IMPORT_DIR, 'ugovori-2026.xlsx');
const DECISIONS = path.join(IMPORT_DIR, 'contracts-decisions.mjs');

const MAINTENANCE_SHEET = 'Održavanje web stranica';
const MARKETING_SHEET = 'Digitalni marketing';
// Excel's built-in "Bad" style: the spreadsheet marks clients whose work stopped with it.
const STOPPED_FILL = 'FFFFC7CE';
const NO_CONTRACT_TEXT = /nema.*treba/i;

const CATEGORY_BY_SECTION = {
  'Facebook i Instagram': 'facebook_instagram',
  'Google Ads': 'google_ads',
  'Facebook/Instagram + Google Ads': 'facebook_google',
  'Ostali digitalni marketing': 'other',
};
const CATEGORY_LABELS = {
  facebook_instagram: 'Facebook i Instagram',
  google_ads: 'Google Ads',
  facebook_google: 'Facebook i Instagram + Google Ads',
  other: 'Ostali digitalni marketing',
};
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'maj', 'jun', 'jul', 'avg', 'sep', 'okt', 'nov', 'dec'];

// Spelling fixes in service names (typos and missing letters in the spreadsheet).
const SERVICE_FIXES = [
  [/^Odrzavanje\b/, 'Održavanje'],
  [/^WebSHop\b/, 'WebShop'],
  [/markting/, 'marketing'],
];

if (!existsSync(DECISIONS)) throw new Error(`Missing ${path.relative(ROOT, DECISIONS)}`);
const { YEAR, EXCLUDED, STOPPED_STATUS, CLIENTS, MAINTENANCE_OVERRIDES = {} } = await import(pathToFileURL(DECISIONS).href);
const clients = new Map(JSON.parse(await readFile(path.join(OUTPUT_DIR, 'clients.json'), 'utf8')).map((c) => [c.legacy_id, c]));
const sheets = readWorkbook(WORKBOOK);

const notes = [];
const note = (message) => notes.push(message);
const text = (cell) => (typeof cell?.value === 'string' ? cell.value : cell?.value == null ? null : String(cell.value));
const fixService = (value) => SERVICE_FIXES.reduce((result, [pattern, fix]) => result.replace(pattern, fix), value);
const storedDate = (serial) => `${excelDate(serial)}T00:00:00.000+00:00`;

function resolveClient(name, where) {
  const legacyId = CLIENTS[name];
  const client = legacyId === undefined ? undefined : clients.get(legacyId);
  if (!client) note(`${where}: "${name}" nema klijenta u mapiranju; red je izostavljen`);
  return client;
}

function prepareMaintenance() {
  const rows = [];
  for (const { number, cells } of sheets[MAINTENANCE_SHEET]) {
    if (typeof cells.A?.value !== 'number') continue; // header and empty rows
    const name = text(cells.C);
    const where = `Održavanje, red ${number}`;
    if (EXCLUDED.includes(name)) continue;
    const client = resolveClient(name, where);
    if (!client) continue;

    let domain = text(cells.D);
    if (domain && !domain.includes('.')) {
      note(`${where} (${name}): u koloni Domena piše "${domain}", što nije domena; ostavljeno prazno`);
      domain = null;
    }
    const service = fixService(text(cells.E) ?? 'Održavanje web stranice');
    if (typeof cells.F?.value !== 'number' || typeof cells.G?.value !== 'number') {
      note(`${where} (${name}): nedostaje datum; red je izostavljen`);
      continue;
    }
    const override = MAINTENANCE_OVERRIDES[name] ?? {};
    const start = override.start_date ? `${override.start_date}T00:00:00.000+00:00` : storedDate(cells.F.value);
    const end = override.end_date ? `${override.end_date}T00:00:00.000+00:00` : storedDate(cells.G.value);
    if (override.start_date || override.end_date) {
      note(`${where} (${name}): datum ispravljen po odluci (${override.start_date ?? excelDate(cells.F.value)} – ${override.end_date ?? excelDate(cells.G.value)})`);
    }
    if (end < start) note(`${where} (${name}): kraj ugovora je prije početka`);

    rows.push({
      row_id: `mnt-${client.legacy_id}-${start.slice(0, 10).replace(/-/g, '')}`,
      sheet_row: number,
      client_legacy_id: client.legacy_id,
      client_name: client.name,
      domain,
      service,
      start_date: start,
      end_date: end,
    });
  }
  return rows;
}

function parseMonths(value, where) {
  let mask = 0;
  for (const part of (value ?? '').split(',').map((m) => m.trim().toLowerCase()).filter(Boolean)) {
    const month = MONTHS.indexOf(part.slice(0, 3));
    if (month < 0) note(`${where}: nepoznat mjesec "${part}"`);
    else mask |= 1 << month;
  }
  return mask;
}

function prepareMarketing() {
  const rows = [];
  let category = null;
  for (const { number, cells } of sheets[MARKETING_SHEET]) {
    const first = text(cells.A);
    if (!first || number <= 4) continue; // title and header
    if (CATEGORY_BY_SECTION[first] && !text(cells.B)) {
      category = CATEGORY_BY_SECTION[first];
      continue;
    }
    const where = `Marketing, red ${number}`;
    if (EXCLUDED.includes(first)) continue;
    const client = resolveClient(first, where);
    if (!client) continue;

    let service = text(cells.B);
    if (!service) {
      service = CATEGORY_LABELS[category];
      note(`${where} (${first}): usluga je prazna u Excelu; upisano "${service}" prema kategoriji`);
    }
    const hasDates = typeof cells.C?.value === 'number' && typeof cells.D?.value === 'number';
    const stopped = cells.A.fill === STOPPED_FILL;
    let status;
    if (hasDates) status = 'signed';
    else if (NO_CONTRACT_TEXT.test(text(cells.C) ?? '')) status = 'to_create';
    else if (stopped) status = STOPPED_STATUS;
    else {
      status = 'to_create';
      note(`${where} (${first}): nema datuma ni oznake; stavljeno "Treba napraviti"`);
    }
    if (stopped) note(`${where} (${first}): crveni red u Excelu (rad prekinut), status "${status}"`);

    rows.push({
      row_id: `mkt-${YEAR}-${client.legacy_id}`,
      sheet_row: number,
      client_legacy_id: client.legacy_id,
      client_name: client.name,
      category,
      service: fixService(service),
      contract_status: status,
      contract_start: hasDates ? storedDate(cells.C.value) : null,
      contract_end: hasDates ? storedDate(cells.D.value) : null,
      year: YEAR,
      months: parseMonths(text(cells.E), where),
    });
  }
  return rows;
}

const maintenance = prepareMaintenance();
const marketing = prepareMarketing();

for (const [label, rows] of [['Održavanje', maintenance], ['Marketing', marketing]]) {
  const seen = new Set();
  for (const row of rows) {
    if (seen.has(row.row_id)) note(`${label}: dva reda za istog klijenta i datum (${row.client_name}); drugi bi prepisao prvi`);
    seen.add(row.row_id);
  }
}

const month = (mask) => MONTHS.filter((_, i) => mask & (1 << i)).join(', ');
const day = (iso) => (iso ? iso.slice(0, 10) : '—');
const report = [
  '# Priprema ugovora za import',
  '',
  `- Održavanje web stranica: ${maintenance.length} ugovora`,
  `- Digitalni marketing (${YEAR}): ${marketing.length} redova`,
  `- Izostavljeno po odluci: ${EXCLUDED.join(', ') || 'ništa'}`,
  '',
  '## Napomene',
  '',
  ...notes.map((message) => `- ${message}`),
  '',
  '## Održavanje web stranica',
  '',
  '| Red | Klijent u bazi | Domena | Usluga | Od | Do |',
  '|---:|---|---|---|---|---|',
  ...maintenance.map((r) => `| ${r.sheet_row} | ${r.client_name} | ${r.domain ?? '—'} | ${r.service} | ${day(r.start_date)} | ${day(r.end_date)} |`),
  '',
  '## Digitalni marketing',
  '',
  '| Red | Klijent u bazi | Kategorija | Usluga | Status | Od | Do | Mjeseci |',
  '|---:|---|---|---|---|---|---|---|',
  ...marketing.map(
    (r) =>
      `| ${r.sheet_row} | ${r.client_name} | ${r.category} | ${r.service} | ${r.contract_status} | ${day(r.contract_start)} | ${day(r.contract_end)} | ${month(r.months)} |`
  ),
  '',
].join('\n');

await Promise.all([
  writeFile(path.join(OUTPUT_DIR, 'maintenance-contracts.json'), `${JSON.stringify(maintenance, null, 2)}\n`),
  writeFile(path.join(OUTPUT_DIR, 'marketing-contracts.json'), `${JSON.stringify(marketing, null, 2)}\n`),
  writeFile(path.join(OUTPUT_DIR, 'contracts-report.md'), report),
]);
console.log(`Maintenance: ${maintenance.length}, marketing: ${marketing.length}, notes: ${notes.length}`);
console.log(`Written to ${path.relative(ROOT, OUTPUT_DIR)}`);
