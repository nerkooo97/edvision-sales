/* eslint-disable @typescript-eslint/no-require-imports */
const { loadEnvConfig } = require('@next/env');
const { Client, TablesDB } = require('node-appwrite');

loadEnvConfig(process.cwd());

const databaseId = process.env.APPWRITE_DATABASE_ID || process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;
const endpoint = process.env.APPWRITE_ENDPOINT || process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const projectId = process.env.APPWRITE_PROJECT_ID || process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
const apiKey = process.env.APPWRITE_API_KEY;

if (!databaseId || !endpoint || !projectId || !apiKey) {
  throw new Error('Appwrite konfiguracija nije potpuna.');
}

const tables = new TablesDB(
  new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey)
);
const tableId = 'automation_settings';
const rowId = 'outreach';

async function main() {
  try {
    await tables.getTable({ databaseId, tableId });
  } catch (error) {
    if (error?.code !== 404) throw error;
    await tables.createTable({
      databaseId,
      tableId,
      name: 'Automation Settings',
      rowSecurity: false,
      enabled: true,
      columns: [
        { key: 'daily_limit', type: 'integer', required: true, min: 1, max: 50 },
        { key: 'delay_minutes', type: 'integer', required: true, min: 10, max: 60 },
      ],
    });
  }

  for (let attempt = 0; attempt < 30; attempt += 1) {
    const table = await tables.getTable({ databaseId, tableId });
    if (table.columns.length >= 2 && table.columns.every((column) => column.status === 'available')) break;
    if (attempt === 29) throw new Error('Kolone automation_settings nisu postale dostupne.');
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  try {
    await tables.getRow({ databaseId, tableId, rowId });
  } catch (error) {
    if (error?.code !== 404) throw error;
    await tables.createRow({
      databaseId,
      tableId,
      rowId,
      data: { daily_limit: 50, delay_minutes: 15 },
    });
  }

  const row = await tables.getRow({ databaseId, tableId, rowId });
  process.stdout.write(JSON.stringify({
    tableId,
    rowId,
    dailyLimit: row.daily_limit,
    delayMinutes: row.delay_minutes,
  }));
}

main().catch((error) => {
  console.error(error?.message || error);
  process.exitCode = 1;
});
