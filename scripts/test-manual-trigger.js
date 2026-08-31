const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const N8N_BASE_URL = (process.env.N8N_BASE_URL || 'https://edvision.app.n8n.cloud').replace(/\/+$/, '');
const N8N_API_KEY = process.env.N8N_API_KEY || '';

async function testTrigger() {
  console.log(`Sending webhook request to n8n: https://edvision.app.n8n.cloud/webhook/pokreni-sales...`);
  const res = await fetch(`https://edvision.app.n8n.cloud/webhook/pokreni-sales`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ source: 'manual-test', dailyLimit: 1 })
  });

  console.log(`Webhook HTTP status: ${res.status}`);
  const text = await res.text();
  console.log(`Webhook response: ${text.slice(0, 300)}`);
}

testTrigger();
