const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT || 'https://appwrite.ed-vision.com/v1';
const APPWRITE_PROJECT_ID = process.env.APPWRITE_PROJECT_ID || '6a7dd764002484e4cc47';
const APPWRITE_DATABASE_ID = process.env.APPWRITE_DATABASE_ID || '6a7dd77a002b3913d433';
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY || '';

async function findUncontactedCompanies() {
  const headers = {
    'X-Appwrite-Project': APPWRITE_PROJECT_ID,
    'X-Appwrite-Key': APPWRITE_API_KEY,
    'Content-Type': 'application/json'
  };

  // Get all leads
  const leadsRes = await fetch(`${APPWRITE_ENDPOINT}/databases/${APPWRITE_DATABASE_ID}/collections/leads/documents?limit=200`, { headers });
  const leadsData = await leadsRes.json();
  const leadCompanyIds = new Set((leadsData.documents || []).map(l => typeof l.company === 'object' ? l.company?.$id : l.company));

  // Get all companies with email
  const q1 = encodeURIComponent(JSON.stringify({ method: 'isNotNull', attribute: 'email' }));
  const q2 = encodeURIComponent(JSON.stringify({ method: 'orderDesc', attribute: '$createdAt' }));
  
  const compRes = await fetch(`${APPWRITE_ENDPOINT}/databases/${APPWRITE_DATABASE_ID}/collections/companies/documents?queries[0]=${q1}&queries[1]=${q2}&limit=100`, { headers });
  const compData = await compRes.json();

  const uncontacted = (compData.documents || []).filter(c => !leadCompanyIds.has(c.$id));
  console.log(`Found ${uncontacted.length} companies with email that DO NOT have a lead yet (out of 100 checked):`);
  uncontacted.slice(0, 10).forEach(c => console.log(` - ID: ${c.$id} | Name: "${c.company_name}" | Email: ${c.email}`));
}

findUncontactedCompanies();
