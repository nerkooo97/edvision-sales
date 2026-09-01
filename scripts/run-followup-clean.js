const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const N8N_BASE_URL = (process.env.N8N_BASE_URL || 'https://edvision.app.n8n.cloud').replace(/\/+$/, '');

async function runViaWebhook() {
  const webhookUrl = `${N8N_BASE_URL}/webhook/pokreni-followup`;
  console.log('Triggering the production follow-up webhook...');

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      source: 'local_followup_script',
      flowType: 'followup',
      triggeredAt: new Date().toISOString()
    })
  });

  if (!response.ok) {
    console.error(`Webhook failed: ${response.status}`, await response.text());
    process.exitCode = 1;
    return;
  }

  console.log(`Follow-up webhook accepted the request (${response.status}).`);
}

runViaWebhook().catch(error => {
  console.error('Failed to trigger follow-up webhook:', error.message);
  process.exitCode = 1;
});
