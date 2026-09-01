const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const N8N_BASE_URL = (process.env.N8N_BASE_URL || 'https://edvision.app.n8n.cloud').replace(/\/+$/, '');

async function runFollowup() {
  const response = await fetch(`${N8N_BASE_URL}/webhook/pokreni-followup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      source: 'local_followup_test_script',
      flowType: 'followup',
      triggeredAt: new Date().toISOString()
    })
  });

  if (!response.ok) {
    console.error(`Follow-up webhook failed: ${response.status}`, await response.text());
    process.exitCode = 1;
    return;
  }

  console.log(`Follow-up webhook accepted the test request (${response.status}).`);
}

runFollowup().catch(error => {
  console.error('Failed to test follow-up webhook:', error.message);
  process.exitCode = 1;
});
