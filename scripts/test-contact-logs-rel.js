const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

async function testContactLogsRel() {
  const headers = {
    'X-Appwrite-Project': process.env.APPWRITE_PROJECT_ID,
    'X-Appwrite-Key': process.env.APPWRITE_API_KEY,
    'Content-Type': 'application/json'
  };

  // 1. Fetch 5 companies with their relationships
  const res = await fetch(`https://appwrite.ed-vision.com/v1/databases/${process.env.APPWRITE_DATABASE_ID}/collections/companies/documents?limit=5`, { headers });
  const data = await res.json();

  console.log('Sample company doc with relations:');
  console.log(JSON.stringify(data.documents[0], null, 2));

  // 2. Test querying companies with empty contact_logs
  // In Appwrite, relationship queries can use isNull or equal
  try {
    const q1 = encodeURIComponent(JSON.stringify({ method: 'isNull', attribute: 'contact_logs' }));
    const qNullRes = await fetch(`https://appwrite.ed-vision.com/v1/databases/${process.env.APPWRITE_DATABASE_ID}/collections/companies/documents?queries[0]=${q1}&limit=5`, { headers });
    console.log('isNull contact_logs status:', qNullRes.status);
    if (qNullRes.ok) {
      const qNullData = await qNullRes.json();
      console.log(`isNull contact_logs found: ${qNullData.total}`);
    } else {
      console.log('isNull error:', await qNullRes.text());
    }
  } catch (e) {
    console.error(e);
  }
}

testContactLogsRel();
