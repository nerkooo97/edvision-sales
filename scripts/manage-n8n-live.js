const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const N8N_BASE_URL = (process.env.N8N_BASE_URL || 'https://edvision.app.n8n.cloud').replace(/\/+$/, '');
const N8N_API_KEY = process.env.N8N_API_KEY || '';

async function listWorkflows() {
  const res = await fetch(`${N8N_BASE_URL}/api/v1/workflows`, {
    headers: {
      'X-N8N-API-KEY': N8N_API_KEY,
      'Content-Type': 'application/json'
    }
  });

  if (!res.ok) {
    console.error(`Failed to list workflows: ${res.status} ${res.statusText}`);
    const text = await res.text();
    console.error(text);
    return [];
  }

  const data = await res.json();
  const list = data.data || data;
  console.log(`Found ${list.length} workflows in n8n instance:`);
  list.forEach(w => console.log(` - [${w.id}] "${w.name}" (Active: ${w.active})`));
  return list;
}

listWorkflows();
