const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || '';

async function runViaWebhook() {
  if (!N8N_WEBHOOK_URL) {
    throw new Error('N8N_WEBHOOK_URL is required in .env.local');
  }

  console.log('Triggering the production outreach webhook with a one-item test limit...');

  const response = await fetch(N8N_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      source: 'local_outreach_test_script',
      flowType: 'outreach',
      dailyLimit: 1,
      triggeredAt: new Date().toISOString()
    })
  });

  if (!response.ok) {
    console.error(`Webhook failed: ${response.status}`, await response.text());
    process.exitCode = 1;
    return;
  }

  console.log(`Outreach webhook accepted the request (${response.status}).`);
}

runViaWebhook().catch(error => {
  console.error('Failed to trigger outreach webhook:', error.message);
  process.exitCode = 1;
});
