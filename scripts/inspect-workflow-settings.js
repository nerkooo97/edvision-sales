const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

async function inspectWorkflowSettings() {
  const res = await fetch(`https://edvision.app.n8n.cloud/api/v1/workflows/H8QDF031rHcFtBYA`, {
    headers: {
      'X-N8N-API-KEY': process.env.N8N_API_KEY,
      'Content-Type': 'application/json'
    }
  });

  const wf = await res.json();
  console.log('Workflow Settings:', JSON.stringify(wf.settings, null, 2));

  // Also check all nodes of type scheduleTrigger
  const scheduleNodes = (wf.nodes || []).filter(n => n.type === 'n8n-nodes-base.scheduleTrigger');
  console.log('Schedule Nodes:', JSON.stringify(scheduleNodes, null, 2));

  // Check recent executions on n8n
  const execRes = await fetch(`https://edvision.app.n8n.cloud/api/v1/executions?limit=10`, {
    headers: {
      'X-N8N-API-KEY': process.env.N8N_API_KEY,
      'Content-Type': 'application/json'
    }
  });
  const execData = await execRes.json();
  console.log('\nRecent Executions on n8n:');
  (execData.data || []).forEach(e => console.log(` - ID: ${e.id} | Mode: ${e.mode} | Status: ${e.status} | Started: ${e.startedAt}`));
}

inspectWorkflowSettings();
