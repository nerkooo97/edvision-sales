const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const endpoint = (process.env.APPWRITE_ENDPOINT || '').replace(/\/+$/, '');
const projectId = process.env.APPWRITE_PROJECT_ID || '';
const databaseId = process.env.APPWRITE_DATABASE_ID || '';
const apiKey = process.env.APPWRITE_API_KEY || '';

const failedWindows = [
  ['2026-09-01T15:00:00.000Z', '2026-09-01T15:10:00.000Z'],
  ['2026-09-02T05:30:00.000Z', '2026-09-02T05:40:00.000Z'],
];
const expectedCount = 52;

if (!endpoint || !projectId || !databaseId || !apiKey) {
  throw new Error('Missing Appwrite configuration in .env.local.');
}

const baseUrl = `${endpoint}/databases/${databaseId}/collections/contact_logs/documents`;
const headers = {
  'Content-Type': 'application/json',
  'X-Appwrite-Project': projectId,
  'X-Appwrite-Key': apiKey,
};

function makeListUrl(from, to) {
  const queries = [
    { method: 'equal', attribute: 'channel', values: ['WhatsApp'] },
    { method: 'equal', attribute: 'status', values: ['Poslano'] },
    { method: 'greaterThanEqual', attribute: 'contacted_at', values: [from] },
    { method: 'lessThan', attribute: 'contacted_at', values: [to] },
    { method: 'limit', values: [100] },
  ];
  const params = new URLSearchParams();
  queries.forEach((query, index) => params.set(`queries[${index}]`, JSON.stringify(query)));
  return `${baseUrl}?${params}`;
}

async function listFailedLogs(enforceExpectedCount = true) {
  const documents = [];
  for (const [from, to] of failedWindows) {
    const response = await fetch(makeListUrl(from, to), { headers });
    if (!response.ok) throw new Error(`Could not list failed WhatsApp logs: HTTP ${response.status}`);
    const page = await response.json();
    documents.push(...page.documents);
  }
  if (enforceExpectedCount && documents.length !== expectedCount) {
    throw new Error(`Safety check failed: expected ${expectedCount} false-send logs, found ${documents.length}.`);
  }
  return documents;
}

async function updateLog(id, data) {
  const response = await fetch(`${baseUrl}/${id}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ data }),
  });
  if (!response.ok) throw new Error(`Could not update WhatsApp log ${id}: HTTP ${response.status}`);
  return response.json();
}

function createBackup(documents) {
  const directory = path.join(__dirname, '..', 'n8n', 'backups');
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(directory, `failed-whatsapp-logs-before-correction-${stamp}.local.json`);
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(backupPath, `${JSON.stringify(documents, null, 2)}\n`, { flag: 'wx' });
  return backupPath;
}

async function main() {
  const logs = await listFailedLogs();
  const backupPath = createBackup(logs);
  const changed = [];
  const correction = {
    status: 'Greška',
    outcome: 'Nije poslano: OpenWA sesija nije bila aktivna (HTTP 400)',
  };

  try {
    for (const log of logs) {
      await updateLog(log.$id, correction);
      changed.push(log);
    }

    const stillMarkedSent = await listFailedLogs(false);
    if (stillMarkedSent.length !== 0) throw new Error('Verification failed: some false-send logs remain marked Poslano.');
    console.log(`FALSE_WHATSAPP_LOGS_CORRECTED count=${changed.length} backup=${path.relative(path.join(__dirname, '..'), backupPath)}`);
  } catch (error) {
    for (const log of changed.reverse()) {
      try {
        await updateLog(log.$id, { status: log.status, outcome: log.outcome });
      } catch {
        console.error(`Rollback failed for one WhatsApp log; use ${backupPath} for recovery.`);
      }
    }
    throw error;
  }
}

main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
