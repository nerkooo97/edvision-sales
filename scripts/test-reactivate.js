const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

async function checkNextTrigger() {
  const headers = {
    'X-N8N-API-KEY': process.env.N8N_API_KEY,
    'Content-Type': 'application/json'
  };

  // Get workflow details
  const res = await fetch(`https://edvision.app.n8n.cloud/api/v1/workflows/H8QDF031rHcFtBYA`, { headers });
  const wf = await res.json();
  console.log(`Workflow Active: ${wf.active}`);
  console.log(`Timezone: ${wf.settings?.timezone}`);

  // Let's test deactivating and reactivating properly
  console.log(`Re-activating workflow to force scheduler reload...`);
  await fetch(`https://edvision.app.n8n.cloud/api/v1/workflows/H8QDF031rHcFtBYA/deactivate`, { method: 'POST', headers });
  const actRes = await fetch(`https://edvision.app.n8n.cloud/api/v1/workflows/H8QDF031rHcFtBYA/activate`, { method: 'POST', headers });
  console.log(`Re-activation status: ${actRes.status}`);
}

checkNextTrigger();
