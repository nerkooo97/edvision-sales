const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

async function checkAllCompanies() {
  const headers = {
    'X-Appwrite-Project': process.env.APPWRITE_PROJECT_ID,
    'X-Appwrite-Key': process.env.APPWRITE_API_KEY,
    'Content-Type': 'application/json'
  };

  // Get ALL leads
  let allLeads = [];
  let offset = 0;
  while (true) {
    const res = await fetch(`https://appwrite.ed-vision.com/v1/databases/${process.env.APPWRITE_DATABASE_ID}/collections/leads/documents?limit=100&offset=${offset}`, { headers });
    const data = await res.json();
    allLeads.push(...(data.documents || []));
    if (allLeads.length >= data.total || (data.documents || []).length === 0) break;
    offset += 100;
  }
  console.log(`Total leads in DB: ${allLeads.length}`);
  const leadCompanyIds = new Set(allLeads.map(l => typeof l.company === 'object' ? l.company?.$id : l.company));

  // Get ALL companies
  let allCompanies = [];
  offset = 0;
  while (true) {
    const res = await fetch(`https://appwrite.ed-vision.com/v1/databases/${process.env.APPWRITE_DATABASE_ID}/collections/companies/documents?limit=100&offset=${offset}`, { headers });
    const data = await res.json();
    allCompanies.push(...(data.documents || []));
    if (allCompanies.length >= data.total || (data.documents || []).length === 0) break;
    offset += 100;
  }

  const uncontactedWithEmail = allCompanies.filter(c => c.email && c.email.trim() && !leadCompanyIds.has(c.$id));
  console.log(`Total companies in DB: ${allCompanies.length}`);
  console.log(`Companies with email that DO NOT have a lead: ${uncontactedWithEmail.length}`);
  
  console.log(`\nList of uncontacted companies with email:`);
  uncontactedWithEmail.forEach(c => {
    console.log(` - ID: ${c.$id} | Name: "${c.company_name}" | Email: ${c.email}`);
  });
}

checkAllCompanies();
