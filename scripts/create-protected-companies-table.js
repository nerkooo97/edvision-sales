const { Client, TablesDB } = require('node-appwrite');
require('dotenv').config({ path: '.env.local' });

const endpoint = process.env.APPWRITE_ENDPOINT || process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://appwrite.ed-vision.com/v1';
const projectId = process.env.APPWRITE_PROJECT_ID || process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || '6a7dd764002484e4cc47';
const databaseId = process.env.APPWRITE_DATABASE_ID || process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || '6a7dd77a002b3913d433';
const apiKey = process.env.APPWRITE_API_KEY;
const tableId = 'protected_companies';

if (!apiKey) throw new Error('APPWRITE_API_KEY is required in .env.local.');

const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
const tablesDB = new TablesDB(client);

async function main() {
  let tableExists = false;
  try {
    await tablesDB.getTable({ databaseId, tableId });
    tableExists = true;
  } catch (error) {
    if (error.code !== 404) throw error;
  }

  if (!tableExists) await tablesDB.createTable({
    databaseId,
    tableId,
    name: 'Zaštićene kompanije',
    columns: [
      { key: 'company_name', type: 'string', size: 255, required: true },
      { key: 'normalized_name', type: 'string', size: 255, required: true },
      { key: 'aliases', type: 'string', size: 255, required: false, array: true },
      { key: 'domains', type: 'string', size: 255, required: false, array: true },
      { key: 'emails', type: 'string', size: 255, required: false, array: true },
      { key: 'phones', type: 'string', size: 64, required: false, array: true },
      { key: 'tax_id', type: 'string', size: 64, required: false },
      { key: 'status', type: 'string', size: 64, required: false, default: 'active_client' },
      { key: 'notes', type: 'string', size: 1000, required: false }
    ],
    indexes: [
      { key: 'protected_normalized_name', type: 'key', attributes: ['normalized_name'] }
    ]
  });

  const columns = await tablesDB.listColumns({ databaseId, tableId });
  if (!columns.columns.some((column) => column.key === 'tax_id')) {
    await tablesDB.createStringColumn({ databaseId, tableId, key: 'tax_id', size: 64, required: false });
  }

  console.log(tableExists ? `${tableId} already exists and is up to date.` : `${tableId} created.`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
