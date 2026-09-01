const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const localPath = path.join(
  __dirname,
  '..',
  'n8n',
  'Kompletan Sales Sistem (ED Vision).local.json'
);

const requiredSecrets = ['APPWRITE_API_KEY'];
for (const name of requiredSecrets) {
  if (!process.env[name]) {
    throw new Error(`${name} is required in .env.local`);
  }
}

function injectHeaderSecret(header) {
  const name = String(header?.name || '').toLowerCase();

  if (name === 'x-appwrite-key') {
    return { ...header, value: process.env.APPWRITE_API_KEY };
  }

  if (name === 'authorization' && process.env.OPENAI_API_KEY) {
    return { ...header, value: `Bearer ${process.env.OPENAI_API_KEY}` };
  }

  if (name === 'x-api-key' && process.env.WHATSAPP_API_KEY) {
    return { ...header, value: process.env.WHATSAPP_API_KEY };
  }

  return header;
}

function injectSecrets(value) {
  if (Array.isArray(value)) {
    return value.map(injectSecrets);
  }

  if (typeof value === 'string') {
    if (value.includes('hooks.slack.com/services/') && process.env.SLACK_WEBHOOK_URL) {
      return process.env.SLACK_WEBHOOK_URL;
    }
    return value;
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  const injected = {};
  for (const [key, child] of Object.entries(value)) {
    if (key === 'parameters' && Array.isArray(child)) {
      injected[key] = child.map(item => injectSecrets(injectHeaderSecret(item)));
    } else {
      injected[key] = injectSecrets(child);
    }
  }

  return injected;
}

const workflow = JSON.parse(fs.readFileSync(localPath, 'utf8'));
const updatedWorkflow = injectSecrets(workflow);
fs.writeFileSync(localPath, `${JSON.stringify(updatedWorkflow, null, 2)}\n`, 'utf8');

require('./sanitize-github-workflow.js');
console.log('Workflow secrets synchronized without printing secret values.');
