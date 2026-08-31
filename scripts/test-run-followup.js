const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

async function runFollowup() {
  const loginRes = await fetch('https://edvision.app.n8n.cloud/rest/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: process.env.N8N_EMAIL, password: process.env.N8N_PASSWORD })
  });

  const loginData = await loginRes.json();
  const authCookie = loginRes.headers.get('set-cookie');

  console.log('Logging in to n8n REST API...');
  if (loginData.data && loginData.data.id) {
    console.log('Logged in successfully! Triggering follow-up...');
    const wfId = 'H8QDF031rHcFtBYA';
    
    // Webhook: Ručni Follow-up1
    const runRes = await fetch(`https://edvision.app.n8n.cloud/api/v1/workflows/${wfId}/run`, {
      method: 'POST',
      headers: {
        'Cookie': authCookie,
        'X-N8N-API-KEY': process.env.N8N_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ triggerNode: 'Webhook: Ručni Follow-up1' })
    });
    
    console.log('Status:', runRes.status);
    const runData = await runRes.json();
    console.log('Execution ID:', runData.data?.executionId);
  }
}

runFollowup();
