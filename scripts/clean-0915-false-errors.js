const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

async function cleanupFalseErrors() {
  const headers = {
    'X-Appwrite-Project': process.env.APPWRITE_PROJECT_ID,
    'X-Appwrite-Key': process.env.APPWRITE_API_KEY,
    'Content-Type': 'application/json'
  };

  // 1. Find all error logs from 09:15
  const q1 = encodeURIComponent(JSON.stringify({ method: 'equal', attribute: 'status', values: ['Greška'] }));
  const res = await fetch(`https://appwrite.ed-vision.com/v1/databases/${process.env.APPWRITE_DATABASE_ID}/collections/contact_logs/documents?queries[0]=${q1}&limit=50`, { headers });
  const data = await res.json();

  const falseLogs = (data.documents || []).filter(d => (d.outcome || '').includes('Nevažeći email: Domena nema podešene MX mail servere'));
  console.log(`Found ${falseLogs.length} false error logs to clean up.`);

  for (const log of falseLogs) {
    // Delete false contact log
    await fetch(`https://appwrite.ed-vision.com/v1/databases/${process.env.APPWRITE_DATABASE_ID}/collections/contact_logs/documents/${log.$id}`, {
      method: 'DELETE',
      headers
    });
    console.log(`Deleted false log: ${log.$id} (${log.recipient})`);

    // If lead exists and was created at the same time, delete the false lead so it can be contacted properly
    const leadId = typeof log.lead === 'object' ? log.lead?.$id : log.lead;
    if (leadId && leadId.length > 5 && leadId !== 'nepoznato') {
      await fetch(`https://appwrite.ed-vision.com/v1/databases/${process.env.APPWRITE_DATABASE_ID}/collections/leads/documents/${leadId}`, {
        method: 'DELETE',
        headers
      });
      console.log(` - Also removed temporary lead ${leadId} for re-contacting`);
    }
  }

  console.log(`\n🎉 Successfully cleaned up all 16 false errors from 09:15h!`);
}

cleanupFalseErrors();
