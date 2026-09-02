const fs = require('fs');
const path = require('path');
const { Client, Query, TablesDB } = require('node-appwrite');

require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const apply = process.argv.includes('--apply');
const recipients = ['sancodoo@bih.net.ba', 'vorbild@bih.net.ba'];
const databaseId =
  process.env.APPWRITE_DATABASE_ID || process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || '';
const endpoint =
  process.env.APPWRITE_ENDPOINT || process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || '';
const projectId =
  process.env.APPWRITE_PROJECT_ID || process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || '';
const apiKey = process.env.APPWRITE_API_KEY || '';

if (!databaseId || !endpoint || !projectId || !apiKey) {
  throw new Error('Missing Appwrite configuration in .env.local.');
}

const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
const tablesDB = new TablesDB(client);

function relationId(value) {
  if (typeof value === 'string') return value;
  return value?.$id || null;
}

async function findLatestLog(recipient) {
  const result = await tablesDB.listRows({
    databaseId,
    tableId: 'contact_logs',
    queries: [
      Query.equal('recipient', recipient),
      Query.orderDesc('$createdAt'),
      Query.limit(1),
    ],
  });
  return result.rows[0] || null;
}

async function main() {
  const logs = (await Promise.all(recipients.map(findLatestLog))).filter(Boolean);
  if (logs.length !== recipients.length) {
    throw new Error(`Expected ${recipients.length} contact logs, found ${logs.length}.`);
  }

  const leads = [];
  for (const log of logs) {
    const leadId = relationId(log.lead);
    if (!leadId || leads.some((lead) => lead.$id === leadId)) continue;
    leads.push(
      await tablesDB.getRow({ databaseId, tableId: 'leads', rowId: leadId })
    );
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDirectory = path.join(__dirname, '..', 'n8n', 'backups');
  const backupPath = path.join(
    backupDirectory,
    `appwrite-before-confirmed-bounce-backfill-${timestamp}.local.json`
  );
  fs.mkdirSync(backupDirectory, { recursive: true });
  fs.writeFileSync(
    backupPath,
    `${JSON.stringify({ recipients, logs, leads }, null, 2)}\n`,
    { encoding: 'utf8', flag: 'wx' }
  );

  if (!apply) {
    console.log(`DRY_RUN logs=${logs.length} leads=${leads.length}`);
    console.log(`Backup created: ${path.relative(path.join(__dirname, '..'), backupPath)}`);
    return;
  }

  for (const log of logs) {
    await tablesDB.updateRow({
      databaseId,
      tableId: 'contact_logs',
      rowId: log.$id,
      data: {
        status: 'Greška',
        outcome: 'Bounce - 554 5.7.1 Rejected for policy reasons',
        follow_up_date: null,
      },
    });
  }

  for (const lead of leads) {
    await tablesDB.updateRow({
      databaseId,
      tableId: 'leads',
      rowId: lead.$id,
      data: { status: 'Greška - Nepostojeći email' },
    });
  }

  const verified = await Promise.all(recipients.map(findLatestLog));
  if (verified.some((log) => log?.status !== 'Greška' || log?.follow_up_date)) {
    throw new Error('Bounce backfill verification failed.');
  }

  console.log(`UPDATED logs=${logs.length} leads=${leads.length}`);
  console.log(`Backup created: ${path.relative(path.join(__dirname, '..'), backupPath)}`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
