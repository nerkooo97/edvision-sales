const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const N8N_BASE_URL = (process.env.N8N_BASE_URL || 'https://edvision.app.n8n.cloud').replace(/\/+$/, '');
const N8N_API_KEY = process.env.N8N_API_KEY || '';
const N8N_WORKFLOW_ID = process.env.N8N_WORKFLOW_ID || 'H8QDF031rHcFtBYA';

const localPath = path.join(__dirname, '..', 'n8n', 'Kompletan Sales Sistem (ED Vision).local.json');

async function syncAndActivateWorkflow() {
  console.log(`Starting synchronization with n8n Cloud: ${N8N_BASE_URL}...`);

  const localContent = fs.readFileSync(localPath, 'utf-8');
  const localWf = JSON.parse(localContent);

  // 1. First, deactivate the workflow to clear any lock or active polling
  console.log(`Deactivating workflow ${N8N_WORKFLOW_ID} before update...`);
  try {
    const deactRes = await fetch(`${N8N_BASE_URL}/api/v1/workflows/${N8N_WORKFLOW_ID}/deactivate`, {
      method: 'POST',
      headers: {
        'X-N8N-API-KEY': N8N_API_KEY,
        'Content-Type': 'application/json'
      }
    });
    console.log(`Deactivation status: ${deactRes.status}`);
  } catch (e) {
    console.warn(`Deactivate warning:`, e.message);
  }

  // 2. Update workflow body
  console.log(`Uploading latest nodes, connections, and settings to n8n...`);
  const updatePayload = {
    name: localWf.name || 'Kompletan Sales Sistem (ED Vision)',
    nodes: localWf.nodes,
    connections: localWf.connections,
    settings: localWf.settings || {}
  };

  const updateRes = await fetch(`${N8N_BASE_URL}/api/v1/workflows/${N8N_WORKFLOW_ID}`, {
    method: 'PUT',
    headers: {
      'X-N8N-API-KEY': N8N_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(updatePayload)
  });

  if (!updateRes.ok) {
    const errText = await updateRes.text();
    console.error(`Failed to update workflow: ${updateRes.status} ${updateRes.statusText}`);
    console.error(errText);
    return;
  }

  const updatedData = await updateRes.json();
  console.log(`✅ Workflow successfully updated on n8n! (Nodes: ${updatedData.nodes?.length || localWf.nodes.length})`);

  // 3. Activate the workflow
  console.log(`Activating workflow ${N8N_WORKFLOW_ID}...`);
  const actRes = await fetch(`${N8N_BASE_URL}/api/v1/workflows/${N8N_WORKFLOW_ID}/activate`, {
    method: 'POST',
    headers: {
      'X-N8N-API-KEY': N8N_API_KEY,
      'Content-Type': 'application/json'
    }
  });

  if (!actRes.ok) {
    const actErr = await actRes.text();
    console.error(`Activation error: ${actRes.status}`);
    console.error(actErr);
  } else {
    const actData = await actRes.json();
    console.log(`🎉 WORKFLOW IS NOW FULLY ACTIVE AND LIVE ON N8N CLOUD!`);
    console.log(`Status: Active = ${actData.active}`);
  }
}

syncAndActivateWorkflow();
