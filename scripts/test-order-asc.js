const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

async function testAsc() {
  const headers = {
    'X-Appwrite-Project': process.env.APPWRITE_PROJECT_ID,
    'X-Appwrite-Key': process.env.APPWRITE_API_KEY,
    'Content-Type': 'application/json'
  };

  const q1 = encodeURIComponent(JSON.stringify({ method: 'isNotNull', attribute: 'email' }));
  const q2 = encodeURIComponent(JSON.stringify({ method: 'orderAsc', attribute: '$createdAt' }));
  
  const compRes = await fetch(`https://appwrite.ed-vision.com/v1/databases/${process.env.APPWRITE_DATABASE_ID}/collections/companies/documents?queries[0]=${q1}&queries[1]=${q2}&limit=10`, { headers });
  const compData = await compRes.json();

  console.log(`Top 10 companies sorted with orderAsc:`);
  for (const c of compData.documents || []) {
    const q = encodeURIComponent(JSON.stringify({ method: 'equal', attribute: 'company', values: [c.$id] }));
    const lRes = await fetch(`https://appwrite.ed-vision.com/v1/databases/${process.env.APPWRITE_DATABASE_ID}/collections/leads/documents?queries[0]=${q}`, { headers });
    const lData = await lRes.json();
    console.log(` - "${c.company_name}" | Email: ${c.email} | Leads found: ${lData.total}`);
  }
}

testAsc();
