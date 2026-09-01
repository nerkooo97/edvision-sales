const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const APPWRITE_ENDPOINT = (process.env.APPWRITE_ENDPOINT || '').replace(/\/+$/, '');
const APPWRITE_PROJECT_ID = process.env.APPWRITE_PROJECT_ID || '';
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY || '';
const APPWRITE_DATABASE_ID = process.env.APPWRITE_DATABASE_ID || '';

if (!APPWRITE_ENDPOINT || !APPWRITE_PROJECT_ID || !APPWRITE_API_KEY || !APPWRITE_DATABASE_ID) {
  throw new Error('Appwrite environment variables are required in .env.local');
}

const headers = {
  'X-Appwrite-Project': APPWRITE_PROJECT_ID,
  'X-Appwrite-Key': APPWRITE_API_KEY
};

async function cleanFalseErrors() {
  console.log('Fetching false error logs created around 11:10 (execution 190)...');
  
  const res = await fetch(`${APPWRITE_ENDPOINT}/databases/${APPWRITE_DATABASE_ID}/collections/contact_logs/documents?queries[]=%7B%22method%22%3A%22equal%22%2C%22attribute%22%3A%22status%22%2C%22values%22%3A%5B%22Gre%C5%A1ka%22%5D%7D&queries[]=%7B%22method%22%3A%22orderDesc%22%2C%22attribute%22%3A%22%24createdAt%22%7D&queries[]=%7B%22method%22%3A%22limit%22%2C%22values%22%3A%5B40%5D%7D`, { headers });
  const data = await res.json();

  // False errors were created after 11:09:00 (2026-08-31T09:09:00Z)
  const falseLogs = data.documents.filter(doc => {
    const created = new Date(doc.$createdAt).getTime();
    const cutoff = new Date('2026-08-31T09:08:00Z').getTime();
    return created > cutoff;
  });

  console.log(`Found ${falseLogs.length} false error logs to clean up.`);

  for (const log of falseLogs) {
    // Delete contact log
    await fetch(`${APPWRITE_ENDPOINT}/databases/${APPWRITE_DATABASE_ID}/collections/contact_logs/documents/${log.$id}`, {
      method: 'DELETE',
      headers
    });
    console.log(`Deleted false log for ${log.recipient}`);

    // Delete associated lead if lead was created in execution 190
    if (log.lead) {
      const leadId = typeof log.lead === 'string' ? log.lead : log.lead.$id;
      if (leadId && leadId !== 'nepoznato') {
        try {
          await fetch(`${APPWRITE_ENDPOINT}/databases/${APPWRITE_DATABASE_ID}/collections/leads/documents/${leadId}`, {
            method: 'DELETE',
            headers
          });
          console.log(`Deleted associated lead ${leadId}`);
        } catch (e) {}
      }
    }
  }

  console.log('✅ Successfully cleaned false errors and reset leads!');
}

cleanFalseErrors();
