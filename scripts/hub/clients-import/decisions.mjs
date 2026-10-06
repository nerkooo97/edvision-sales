// Manual decisions for the client import, keyed by the old system's ids (column "id" in the CSV files).
//
// The decisions name real clients (and people), so they live next to the data in importi/decisions.mjs,
// which is git-ignored. Without that file the import runs with no manual decisions. Its shape:
//
//   export const EXCLUDED_CLIENTS = { 140: 'reason' };                  // rows that are not clients
//   export const CLIENT_MERGES = [{ from: 307, into: 310, reason: '' }]; // duplicates folded into `into`
//   export const CLIENT_OVERRIDES = { 83: { country: 'DE', city: '' } }; // final values per client
//   export const CONTACT_OVERRIDES = { 188: { first_name: '' } };        // final values per contact

import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const LOCAL_FILE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../importi/decisions.mjs');
const local = existsSync(LOCAL_FILE) ? await import(pathToFileURL(LOCAL_FILE).href) : {};

export const EXCLUDED_CLIENTS = local.EXCLUDED_CLIENTS ?? {};
export const CLIENT_MERGES = local.CLIENT_MERGES ?? [];
export const CLIENT_OVERRIDES = local.CLIENT_OVERRIDES ?? {};
export const CONTACT_OVERRIDES = local.CONTACT_OVERRIDES ?? {};
