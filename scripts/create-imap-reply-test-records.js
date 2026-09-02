const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const endpoint = (process.env.APPWRITE_ENDPOINT || '').replace(/\/+$/, '');
const projectId = process.env.APPWRITE_PROJECT_ID || '';
const databaseId = process.env.APPWRITE_DATABASE_ID || '';
const apiKey = process.env.APPWRITE_API_KEY || '';
const testRecipient = 'kenan@ed-vision.com';

if (!endpoint || !projectId || !databaseId || !apiKey) {
  throw new Error('Missing Appwrite configuration in .env.local.');
}

const headers = {
  'Content-Type': 'application/json',
  'X-Appwrite-Project': projectId,
  'X-Appwrite-Key': apiKey,
};

async function create(collectionId, data) {
  const response = await fetch(
    `${endpoint}/databases/${databaseId}/collections/${collectionId}/documents`,
    { method: 'POST', headers, body: JSON.stringify({ documentId: 'unique()', data }) }
  );
  if (!response.ok) throw new Error(`Could not create ${collectionId}: HTTP ${response.status}`);
  return response.json();
}

async function main() {
  const timestamp = new Date().toISOString();
  const company = await create('companies', {
    company_name: 'TEST — IMAP Reply Verification (Kenan)',
    email: testRecipient,
    source: 'TEST — remove after n8n reply verification',
    industry: 'Internal testing',
  });

  const lead = await create('leads', {
    company: company.$id,
    has_web: false,
    has_email: true,
    has_phone: false,
    status: 'Kontaktiran',
    analysis: ['TEST — n8n IMAP reply verification'],
    contact_history: [],
  });

  const log = await create('contact_logs', {
    company: company.$id,
    lead: lead.$id,
    channel: 'Email',
    recipient: testRecipient,
    subject: 'TEST — n8n IMAP reply verification',
    content: 'Temporary test record. Do not use for sales outreach.',
    status: 'Poslano',
    outcome: 'TEST — awaiting reply from kenan@ed-vision.com',
    contacted_at: timestamp,
  });

  const manifestPath = path.join(__dirname, '..', 'n8n', 'backups', 'imap-reply-test-records.local.json');
  fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
  fs.writeFileSync(
    manifestPath,
    `${JSON.stringify({ createdAt: timestamp, companyId: company.$id, leadId: lead.$id, contactLogId: log.$id }, null, 2)}\n`,
    { flag: 'wx' }
  );
  console.log(`TEST_RECORDS_CREATED recipient=${testRecipient} manifest=n8n/backups/imap-reply-test-records.local.json`);
}

main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
