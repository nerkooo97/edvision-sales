const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT || 'https://appwrite.ed-vision.com/v1';
const APPWRITE_PROJECT_ID = process.env.APPWRITE_PROJECT_ID || '6a7dd764002484e4cc47';
const APPWRITE_DATABASE_ID = process.env.APPWRITE_DATABASE_ID || '6a7dd77a002b3913d433';
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY || '';

async function testLeadsPerCompany() {
  const headers = {
    'X-Appwrite-Project': APPWRITE_PROJECT_ID,
    'X-Appwrite-Key': APPWRITE_API_KEY,
    'Content-Type': 'application/json'
  };

  // Get companies with email
  const q1 = encodeURIComponent(JSON.stringify({ method: 'isNotNull', attribute: 'email' }));
  const q2 = encodeURIComponent(JSON.stringify({ method: 'orderDesc', attribute: '$createdAt' }));
  
  const res = await fetch(`${APPWRITE_ENDPOINT}/databases/${APPWRITE_DATABASE_ID}/collections/companies/documents?queries[0]=${q1}&queries[1]=${q2}&limit=25`, { headers });
  const compData = await res.json();

  console.log(`Checking 25 companies with email for existing leads in Appwrite:`);
  for (const c of compData.documents || []) {
    const lRes = await fetch(`${APPWRITE_ENDPOINT}/databases/${APPWRITE_DATABASE_ID}/collections/leads/documents?queries[0]=${encodeURIComponent(JSON.stringify({ method: 'equal', attribute: 'company', values: [c.$id] }))}&limit=1`, { headers });
    const lData = await lRes.json();
    console.log(`Company: "${c.company_name}" (${c.$id}) | Email: ${c.email} | Leads found: ${lData.total}`);
  }
}

testLeadsPerCompany();
