const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT || 'https://appwrite.ed-vision.com/v1';
const APPWRITE_PROJECT_ID = process.env.APPWRITE_PROJECT_ID || '6a7dd764002484e4cc47';
const APPWRITE_DATABASE_ID = process.env.APPWRITE_DATABASE_ID || '6a7dd77a002b3913d433';
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY || '';

async function checkDatabase() {
  const headers = {
    'X-Appwrite-Project': APPWRITE_PROJECT_ID,
    'X-Appwrite-Key': APPWRITE_API_KEY,
    'Content-Type': 'application/json'
  };

  // 1. Get companies
  const compRes = await fetch(`${APPWRITE_ENDPOINT}/databases/${APPWRITE_DATABASE_ID}/collections/companies/documents?limit=10&queries[]={"method":"orderDesc","attribute":"$createdAt"}`, { headers });
  const compData = await compRes.json();
  console.log(`Total companies in DB: ${compData.total}`);
  console.log(`Top 5 companies:`);
  (compData.documents || []).slice(0, 5).forEach(c => console.log(` - ID: ${c.$id} | Name: ${c.company_name} | Email: ${c.email}`));

  // 2. Get leads
  const leadsRes = await fetch(`${APPWRITE_ENDPOINT}/databases/${APPWRITE_DATABASE_ID}/collections/leads/documents?limit=100`, { headers });
  const leadsData = await leadsRes.json();
  console.log(`\nTotal leads in DB: ${leadsData.total}`);
  const leadCompanyIds = new Set((leadsData.documents || []).map(l => typeof l.company === 'object' ? l.company?.$id : l.company));
  
  // Check which top companies have leads
  console.log(`\nChecking which top companies have leads:`);
  (compData.documents || []).forEach(c => {
    const hasLead = leadCompanyIds.has(c.$id);
    console.log(` - ${c.company_name} (${c.$id}): Has Lead? ${hasLead}`);
  });
}

checkDatabase();
