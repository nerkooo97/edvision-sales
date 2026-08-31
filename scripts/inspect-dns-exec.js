const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const N8N_BASE_URL = (process.env.N8N_BASE_URL || 'https://edvision.app.n8n.cloud').replace(/\/+$/, '');
const N8N_API_KEY = process.env.N8N_API_KEY || '';

async function inspectExecData(execId) {
  const res = await fetch(`${N8N_BASE_URL}/api/v1/executions/${execId}?includeData=true`, {
    headers: {
      'X-N8N-API-KEY': N8N_API_KEY,
      'Content-Type': 'application/json'
    }
  });

  const data = await res.json();
  const runData = data.data?.resultData?.runData;
  if (!runData) {
    console.log('No runData found');
    return;
  }

  const dnsNodeData = runData['HTTP Request: Provjera Email Domene (DNS MX)1'];
  console.log('DNS Node output:', JSON.stringify(dnsNodeData, null, 2));

  const ifDnsData = runData['IF: Email domena postoji i ima MX?1'];
  console.log('IF DNS output:', JSON.stringify(ifDnsData, null, 2));
}

inspectExecData('174');
