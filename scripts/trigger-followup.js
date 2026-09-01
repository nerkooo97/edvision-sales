require('dotenv').config({ path: '.env.local' });

const N8N_BASE_URL = (process.env.N8N_BASE_URL || 'https://edvision.app.n8n.cloud').replace(/\/+$/, '');

async function triggerFollowup() {
  const response = await fetch(`${N8N_BASE_URL}/webhook/pokreni-followup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      source: 'local_followup_trigger_script',
      flowType: 'followup',
      triggeredAt: new Date().toISOString()
    })
  });

  if (!response.ok) {
    console.error(`Follow-up webhook failed: ${response.status}`, await response.text());
    process.exitCode = 1;
    return;
  }

  console.log(`Follow-up webhook accepted the request (${response.status}).`);
}

triggerFollowup().catch(error => {
  console.error('Failed to trigger follow-up webhook:', error.message);
  process.exitCode = 1;
});
