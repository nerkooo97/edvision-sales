const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT || 'https://appwrite.ed-vision.com/v1';
const APPWRITE_PROJECT_ID = process.env.APPWRITE_PROJECT_ID || '6a7dd764002484e4cc47';
const APPWRITE_DATABASE_ID = process.env.APPWRITE_DATABASE_ID || '6a7dd77a002b3913d433';
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY || '';

async function testAppwriteQuery() {
  const headers = {
    'X-Appwrite-Project': APPWRITE_PROJECT_ID,
    'X-Appwrite-Key': APPWRITE_API_KEY,
    'Content-Type': 'application/json'
  };

  // Test isNotNull query for email
  const q1 = encodeURIComponent(JSON.stringify({ method: 'isNotNull', attribute: 'email' }));
  const q2 = encodeURIComponent(JSON.stringify({ method: 'orderDesc', attribute: '$createdAt' }));
  
  const res = await fetch(`${APPWRITE_ENDPOINT}/databases/${APPWRITE_DATABASE_ID}/collections/companies/documents?queries[0]=${q1}&queries[1]=${q2}&limit=10`, { headers });
  
  if (!res.ok) {
    console.error('Query failed:', res.status, await res.text());
    return;
  }

  const data = await res.json();
  console.log(`Found ${data.total} companies with non-null email!`);
  data.documents.forEach(d => console.log(` - ${d.company_name} | Email: ${d.email}`));
}

testAppwriteQuery();
