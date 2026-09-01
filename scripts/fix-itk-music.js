const { Client, Databases, Query } = require('node-appwrite');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT || '';
const APPWRITE_PROJECT_ID = process.env.APPWRITE_PROJECT_ID || '';
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY || '';
const APPWRITE_DATABASE_ID = process.env.APPWRITE_DATABASE_ID || '';

if (!APPWRITE_ENDPOINT || !APPWRITE_PROJECT_ID || !APPWRITE_API_KEY || !APPWRITE_DATABASE_ID) {
  throw new Error('Appwrite environment variables are required in .env.local');
}

const client = new Client()
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT_ID)
  .setKey(APPWRITE_API_KEY);

const db = new Databases(client);
const DB_ID = APPWRITE_DATABASE_ID;

async function updateITKMusic() {
  try {
    const logs = await db.listDocuments(DB_ID, 'contact_logs', [
      Query.equal('recipient', 'itkmusic@bih.net.ba')
    ]);

    console.log(`Found ${logs.total} logs for ITK Music`);
    for (const log of logs.documents) {
      console.log(`Updating log ${log.$id} to 'Odgovoreno'...`);
      await db.updateDocument(DB_ID, 'contact_logs', log.$id, {
        status: 'Odgovoreno',
        outcome: 'Klijent odgovorio na email: proslijediće direktoru za sastanak'
      });

      if (log.lead && log.lead !== 'nepoznato') {
        const leadId = typeof log.lead === 'object' ? log.lead.$id : log.lead;
        console.log(`Updating lead ${leadId} to 'U pregovorima'...`);
        try {
          await db.updateDocument(DB_ID, 'leads', leadId, {
            status: 'U pregovorima'
          });
        } catch (leadErr) {
          console.log(`Note updating lead: ${leadErr.message}`);
        }
      }
    }
  } catch (err) {
    console.error('Error updating ITK Music:', err);
  }
}

updateITKMusic();
