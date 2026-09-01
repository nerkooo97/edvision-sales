const fs = require('fs');
const path = require('path');

const localPath = path.join(__dirname, '..', 'n8n', 'Kompletan Sales Sistem (ED Vision).local.json');
const gitPath = path.join(__dirname, '..', 'n8n', 'Kompletan Sales Sistem (ED Vision).json');

const SECRET_REPLACEMENTS = {
  APPWRITE_API_KEY: 'standard_appwrite_key_here',
  OPENAI_API_KEY: 'api_key_here',
  SLACK_WEBHOOK_URL: 'https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK',
  WHATSAPP_API_KEY: 'WHATSAPP_API_KEY_HERE',
};

function sanitizeHeader(header) {
  const name = String(header?.name || '').toLowerCase();

  if (name === 'x-appwrite-key') {
    return { ...header, value: 'standard_appwrite_key_here' };
  }

  if (name === 'authorization') {
    return { ...header, value: 'Bearer api_key_here' };
  }

  if (name === 'x-api-key') {
    return { ...header, value: 'WHATSAPP_API_KEY_HERE' };
  }

  return header;
}

function sanitizeObject(value) {
  if (Array.isArray(value)) {
    return value.map(sanitizeObject);
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  const sanitized = {};
  for (const [key, child] of Object.entries(value)) {
    if (key === 'parameters' && Array.isArray(child)) {
      sanitized[key] = child.map(item => sanitizeObject(sanitizeHeader(item)));
    } else {
      sanitized[key] = sanitizeObject(child);
    }
  }

  return sanitized;
}

function replaceKnownSecretValues(content) {
  let sanitized = content;

  for (const [envName, placeholder] of Object.entries(SECRET_REPLACEMENTS)) {
    const secret = process.env[envName];
    if (secret) {
      sanitized = sanitized.split(secret).join(placeholder);
    }
  }

  return sanitized;
}

function sanitizeWorkflow() {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

  const workflow = JSON.parse(fs.readFileSync(localPath, 'utf-8'));
  const sanitizedWorkflow = sanitizeObject(workflow);
  let content = JSON.stringify(sanitizedWorkflow, null, 2);

  content = replaceKnownSecretValues(content)
    .replace(/Bearer sk-[a-zA-Z0-9_\-]+/g, 'Bearer api_key_here')
    .replace(
      /https:\/\/hooks\.slack\.com\/services\/[A-Za-z0-9_\/\-]+/g,
      'https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK'
    );

  JSON.parse(content);
  fs.writeFileSync(gitPath, `${content}\n`, 'utf-8');
  console.log('Successfully sanitized and updated n8n/Kompletan Sales Sistem (ED Vision).json for GitHub!');
}

sanitizeWorkflow();
