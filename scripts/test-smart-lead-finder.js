const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

async function testSmartFinder() {
  const headers = {
    'X-Appwrite-Project': process.env.APPWRITE_PROJECT_ID,
    'X-Appwrite-Key': process.env.APPWRITE_API_KEY,
    'Content-Type': 'application/json'
  };

  // Step 1: Get all contacted company IDs from contact_logs (1 fast request)
  const logsRes = await fetch(`https://appwrite.ed-vision.com/v1/databases/${process.env.APPWRITE_DATABASE_ID}/collections/contact_logs/documents?limit=100`, { headers });
  const logsData = await logsRes.json();
  const contactedSet = new Set((logsData.documents || []).map(l => typeof l.company === 'object' ? l.company?.$id : l.company));
  console.log(`Found ${contactedSet.size} contacted companies in contact_logs.`);

  // Step 2: Get companies with email
  const q1 = encodeURIComponent(JSON.stringify({ method: 'isNotNull', attribute: 'email' }));
  const q2 = encodeURIComponent(JSON.stringify({ method: 'limit', values: [100] }));
  const compRes = await fetch(`https://appwrite.ed-vision.com/v1/databases/${process.env.APPWRITE_DATABASE_ID}/collections/companies/documents?queries[0]=${q1}&queries[1]=${q2}`, { headers });
  const compData = await compRes.json();

  const nextCompany = (compData.documents || []).find(c => !contactedSet.has(c.$id));
  if (nextCompany) {
    console.log(`\n🎉 NEXT UNCONTACTED COMPANY FOUND:`);
    console.log(` - ID: ${nextCompany.$id}`);
    console.log(` - Name: ${nextCompany.company_name}`);
    console.log(` - Email: ${nextCompany.email}`);
  } else {
    console.log('No uncontacted company found in first 100, checking offset 100...');
  }
}

testSmartFinder();
