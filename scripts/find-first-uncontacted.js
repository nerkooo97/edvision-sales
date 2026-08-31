const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

async function findFirst() {
  const headers = {
    'X-Appwrite-Project': process.env.APPWRITE_PROJECT_ID,
    'X-Appwrite-Key': process.env.APPWRITE_API_KEY,
    'Content-Type': 'application/json'
  };

  const q1 = encodeURIComponent(JSON.stringify({ method: 'isNotNull', attribute: 'email' }));
  const q2 = encodeURIComponent(JSON.stringify({ method: 'orderDesc', attribute: '$createdAt' }));
  
  const compRes = await fetch(`https://appwrite.ed-vision.com/v1/databases/${process.env.APPWRITE_DATABASE_ID}/collections/companies/documents?queries[0]=${q1}&queries[1]=${q2}&limit=100`, { headers });
  const compData = await compRes.json();

  let uncontactedCount = 0;
  for (const c of compData.documents || []) {
    const q = encodeURIComponent(JSON.stringify({ method: 'equal', attribute: 'company', values: [c.$id] }));
    const lRes = await fetch(`https://appwrite.ed-vision.com/v1/databases/${process.env.APPWRITE_DATABASE_ID}/collections/leads/documents?queries[0]=${q}`, { headers });
    const lData = await lRes.json();
    
    if (lData.total === 0) {
      uncontactedCount++;
      if (uncontactedCount <= 5) {
        console.log(`[UNCONTACTED #${uncontactedCount}] ${c.company_name} | Email: ${c.email} | ID: ${c.$id}`);
      }
    }
  }
  console.log(`\nTotal uncontacted companies in this batch of 100: ${uncontactedCount}`);
}

findFirst();
