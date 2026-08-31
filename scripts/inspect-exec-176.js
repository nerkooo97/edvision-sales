const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

async function inspect176() {
  const res = await fetch(`https://edvision.app.n8n.cloud/api/v1/executions/176?includeData=true`, {
    headers: {
      'X-N8N-API-KEY': process.env.N8N_API_KEY,
      'Content-Type': 'application/json'
    }
  });

  const data = await res.json();
  const runData = data.data?.resultData?.runData;
  const companiesNode = runData?.['Appwrite: Uzmi firme (companies)1'];
  const companies = companiesNode?.[0]?.data?.main?.[0]?.[0]?.json?.documents || [];
  console.log(`Fetched ${companies.length} companies in execution #176:`);
  companies.slice(0, 10).forEach(c => console.log(` - ${c.company_name} (${c.$id}) | Email: ${c.email}`));

  const loopNode = runData?.['Loop Over Firme1'];
  console.log(`Loop node executed iterations: ${loopNode?.length}`);
}

inspect176();
