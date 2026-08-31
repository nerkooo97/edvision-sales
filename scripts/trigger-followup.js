require('dotenv').config({ path: '.env.local' });

async function triggerFollowup() {
  const loginRes = await fetch('https://edvision.app.n8n.cloud/rest/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: process.env.N8N_EMAIL, password: process.env.N8N_PASSWORD })
  });

  const loginData = await loginRes.json();
  const authCookie = loginRes.headers.get('set-cookie');

  console.log('Logged in successfully! Triggering follow-up...');
  const wfId = 'H8QDF031rHcFtBYA';
  
  const runRes = await fetch(`https://edvision.app.n8n.cloud/api/v1/workflows/${wfId}/run`, {
    method: 'POST',
    headers: {
      'Cookie': authCookie,
      'X-N8N-API-KEY': process.env.N8N_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ triggerNode: 'Webhook: Ručni Follow-up1' })
  });
  
  const runData = await runRes.json();
  console.log('Follow-up Execution ID:', runData.data?.executionId);
}

triggerFollowup();
