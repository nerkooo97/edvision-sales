const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const endpoint = (process.env.APPWRITE_ENDPOINT || '').replace(/\/+$/, '');
const projectId = process.env.APPWRITE_PROJECT_ID || '';
const databaseId = process.env.APPWRITE_DATABASE_ID || '';
const apiKey = process.env.APPWRITE_API_KEY || '';

if (!endpoint || !projectId || !databaseId || !apiKey) {
  throw new Error('Missing Appwrite configuration in .env.local.');
}

const baseUrl = `${endpoint}/databases/${databaseId}/collections/contact_logs/documents`;
const baseQueries = [
  { method: 'equal', attribute: 'channel', values: ['Email'] },
  { method: 'equal', attribute: 'status', values: ['Poslano', 'Otvoreno', 'Otvorena'] },
  { method: 'orderDesc', attribute: '$createdAt' },
  { method: 'limit', values: [100] },
];

function queryUrl(cursor) {
  const params = new URLSearchParams();
  baseQueries.forEach((query, index) => params.set(`queries[${index}]`, JSON.stringify(query)));
  if (cursor) {
    params.set('queries[4]', JSON.stringify({ method: 'cursorAfter', values: [cursor] }));
  }
  return `${baseUrl}?${params}`;
}

async function fetchPage(cursor) {
  const response = await fetch(queryUrl(cursor), {
    headers: {
      'X-Appwrite-Project': projectId,
      'X-Appwrite-Key': apiKey,
    },
  });
  if (!response.ok) throw new Error(`Appwrite returned HTTP ${response.status}.`);
  return response.json();
}

async function main() {
  let cursor;
  let expectedTotal;
  const ids = new Set();
  let pages = 0;

  while (pages < 10) {
    const page = await fetchPage(cursor);
    expectedTotal ??= page.total;
    const documents = page.documents || [];
    documents.forEach(document => ids.add(document.$id));
    pages += 1;

    if (documents.length < 100) break;
    cursor = documents.at(-1)?.$id;
    if (!cursor) throw new Error('A full page did not contain a cursor document ID.');
  }

  if (ids.size !== expectedTotal) {
    throw new Error(`Pagination incomplete: read ${ids.size} of ${expectedTotal} matching contact logs.`);
  }
  console.log(`PAGINATION_READ_OK pages=${pages} logs=${ids.size}`);
}

main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
