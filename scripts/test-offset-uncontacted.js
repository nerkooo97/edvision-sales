const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

async function testOffset() {
  const headers = {
    'X-Appwrite-Project': process.env.APPWRITE_PROJECT_ID,
    'X-Appwrite-Key': process.env.APPWRITE_API_KEY,
    'Content-Type': 'application/json'
  };

  const q1 = encodeURIComponent(JSON.stringify({ method: 'isNotNull', attribute: 'email' }));
  const q2 = encodeURIComponent(JSON.stringify({ method: 'limit', values: [100] }));
  const q3 = encodeURIComponent(JSON.stringify({ method: 'offset', values: [100] }));

  const res = await fetch(`https://appwrite.ed-vision.com/v1/databases/${process.env.APPWRITE_DATABASE_ID}/collections/companies/documents?queries[0]=${q1}&queries[1]=${q2}&queries[2]=${q3}`, { headers });
  const d = await res.json();
  console.log(`Fetched with offset 100: ${d.documents?.length}`);

  let foundUncontacted = 0;
  for (const c of d.documents || []) {
    const q = encodeURIComponent(JSON.stringify({ method: 'equal', attribute: 'company', values: [c.$id] }));
    const lRes = await fetch(`https://appwrite.ed-vision.com/v1/databases/${process.env.APPWRITE_DATABASE_ID}/collections/leads/documents?queries[0]=${q}`, { headers });
    const lData = await lRes.json();
    if (lData.total === 0) {
      foundUncontacted++;
      console.log(`[UNCONTACTED #${foundUncontacted}] Company: "${c.company_name}" | Email: ${c.email} | Leads found: ${lData.total}`);
    }
  }
}

testOffset();
