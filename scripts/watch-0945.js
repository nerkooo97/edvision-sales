const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

async function check0945() {
  const res = await fetch(`https://edvision.app.n8n.cloud/api/v1/executions?limit=5`, {
    headers: {
      'X-N8N-API-KEY': process.env.N8N_API_KEY,
      'Content-Type': 'application/json'
    }
  });
  const execData = await res.json();
  console.log('Recent Executions:');
  (execData.data || []).forEach(e => console.log(` - ID: ${e.id} | Mode: ${e.mode} | Status: ${e.status} | Started: ${e.startedAt}`));
}

check0945();
