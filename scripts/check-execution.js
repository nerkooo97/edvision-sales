const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const N8N_BASE_URL = (process.env.N8N_BASE_URL || 'https://edvision.app.n8n.cloud').replace(/\/+$/, '');
const N8N_API_KEY = process.env.N8N_API_KEY || '';

async function checkExec(execId) {
  const res = await fetch(`${N8N_BASE_URL}/api/v1/executions/${execId}?includeData=true`, {
    headers: {
      'X-N8N-API-KEY': N8N_API_KEY,
      'Content-Type': 'application/json'
    }
  });

  const data = await res.json();
  console.log(`Execution #${execId} Status: ${data.status} | Mode: ${data.mode} | Finished: ${data.finished}`);
  
  if (data.data?.resultData?.runData) {
    const executedNodes = Object.keys(data.data.resultData.runData);
    console.log(`Executed nodes (${executedNodes.length}):`, executedNodes.join(' -> '));
  }
}

checkExec('174');
