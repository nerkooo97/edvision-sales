const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || '';

async function testTrigger() {
  if (!N8N_WEBHOOK_URL) {
    throw new Error('N8N_WEBHOOK_URL is required in .env.local');
  }

  console.log('Sending a one-item test request to the configured n8n webhook...');
  const res = await fetch(N8N_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ source: 'manual-test', dailyLimit: 1 })
  });

  console.log(`Webhook HTTP status: ${res.status}`);
  const text = await res.text();
  console.log(`Webhook response: ${text.slice(0, 300)}`);
}

testTrigger();
