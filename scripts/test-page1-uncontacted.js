const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

async function testPage1() {
  const headers = {
    'X-Appwrite-Project': process.env.APPWRITE_PROJECT_ID,
    'X-Appwrite-Key': process.env.APPWRITE_API_KEY,
    'Content-Type': 'application/json'
  };

  // Get all contacted IDs
  const logsRes = await fetch(`https://appwrite.ed-vision.com/v1/databases/${process.env.APPWRITE_DATABASE_ID}/collections/contact_logs/documents?limit=100`, { headers });
  const logsData = await logsRes.json();
  const contactedSet = new Set((logsData.documents || []).map(l => typeof l.company === 'object' ? l.company?.$id : l.company));

  // Query Page 1 with orderDesc
  const q1 = encodeURIComponent(JSON.stringify({ method: 'isNotNull', attribute: 'email' }));
  const q2 = encodeURIComponent(JSON.stringify({ method: 'orderDesc', attribute: '$createdAt' }));
  const q3 = encodeURIComponent(JSON.stringify({ method: 'limit', values: [100] }));

  const compRes = await fetch(`https://appwrite.ed-vision.com/v1/databases/${process.env.APPWRITE_DATABASE_ID}/collections/companies/documents?queries[0]=${q1}&queries[1]=${q2}&queries[2]=${q3}`, { headers });
  const compData = await compRes.json();

  const uncontacted = (compData.documents || []).filter(c => !contactedSet.has(c.$id));
  console.log(`Page 1 (orderDesc) contains ${compData.documents?.length} companies with email.`);
  console.log(`Of which ${uncontacted.length} are UNCONTACTED:`);
  uncontacted.slice(0, 10).forEach(c => console.log(` - ${c.company_name} | Email: ${c.email}`));
}

testPage1();
