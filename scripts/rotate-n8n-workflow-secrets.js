const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const N8N_BASE_URL = (process.env.N8N_BASE_URL || '').replace(/\/+$/, '');
const N8N_API_KEY = process.env.N8N_API_KEY || '';
const N8N_WORKFLOW_ID = process.env.N8N_WORKFLOW_ID || '';

const requiredSecrets = {
  APPWRITE_API_KEY: process.env.APPWRITE_API_KEY || '',
  WHATSAPP_API_KEY: process.env.WHATSAPP_API_KEY || '',
};

function assertConfiguration() {
  const missing = [];

  if (!N8N_BASE_URL) missing.push('N8N_BASE_URL');
  if (!N8N_API_KEY) missing.push('N8N_API_KEY');
  if (!N8N_WORKFLOW_ID) missing.push('N8N_WORKFLOW_ID');

  for (const [name, value] of Object.entries(requiredSecrets)) {
    if (!value) missing.push(name);
  }

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

function getHeaders() {
  return {
    'X-N8N-API-KEY': N8N_API_KEY,
    'Content-Type': 'application/json',
  };
}

async function request(endpoint, options = {}) {
  const response = await fetch(`${N8N_BASE_URL}${endpoint}`, {
    ...options,
    headers: { ...getHeaders(), ...(options.headers || {}) },
  });

  if (!response.ok) {
    throw new Error(`${options.method || 'GET'} ${endpoint} failed with HTTP ${response.status}`);
  }

  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

function toUpdatePayload(workflow) {
  return {
    name: workflow.name,
    nodes: workflow.nodes,
    connections: workflow.connections,
    settings: workflow.settings || {},
  };
}

function injectSecrets(value, counts) {
  if (Array.isArray(value)) {
    return value.map(item => injectSecrets(item, counts));
  }

  if (!value || typeof value !== 'object') {
    if (
      typeof value === 'string' &&
      process.env.SLACK_WEBHOOK_URL &&
      /^https:\/\/hooks\.slack\.com\/services\//.test(value)
    ) {
      counts.slack += 1;
      return process.env.SLACK_WEBHOOK_URL;
    }

    return value;
  }

  const result = {};
  for (const [key, child] of Object.entries(value)) {
    result[key] = injectSecrets(child, counts);
  }

  const headerName = String(result.name || '').toLowerCase();
  if (headerName === 'x-appwrite-key') {
    result.value = requiredSecrets.APPWRITE_API_KEY;
    counts.appwrite += 1;
  } else if (headerName === 'x-api-key') {
    result.value = requiredSecrets.WHATSAPP_API_KEY;
    counts.whatsapp += 1;
  } else if (headerName === 'authorization' && process.env.OPENAI_API_KEY) {
    result.value = `Bearer ${process.env.OPENAI_API_KEY}`;
    counts.openai += 1;
  }

  return result;
}

function createBackup(workflow) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDirectory = path.join(__dirname, '..', 'n8n', 'backups');
  const backupPath = path.join(
    backupDirectory,
    `cloud-${N8N_WORKFLOW_ID}-${timestamp}.local.json`
  );

  fs.mkdirSync(backupDirectory, { recursive: true });
  fs.writeFileSync(backupPath, `${JSON.stringify(workflow, null, 2)}\n`, {
    encoding: 'utf8',
    flag: 'wx',
  });

  return backupPath;
}

async function setActive(active) {
  return request(`/api/v1/workflows/${N8N_WORKFLOW_ID}/${active ? 'activate' : 'deactivate'}`, {
    method: 'POST',
  });
}

async function updateWorkflow(workflow) {
  return request(`/api/v1/workflows/${N8N_WORKFLOW_ID}`, {
    method: 'PUT',
    body: JSON.stringify(toUpdatePayload(workflow)),
  });
}

async function rollback(originalWorkflow, wasActive) {
  console.error('Update failed. Restoring the Cloud backup...');
  await updateWorkflow(originalWorkflow);

  if (wasActive) {
    await setActive(true);
  }

  console.error('Previous Cloud workflow was restored.');
}

async function rotateWorkflowSecrets() {
  assertConfiguration();

  const originalWorkflow = await request(`/api/v1/workflows/${N8N_WORKFLOW_ID}`);
  const wasActive = Boolean(originalWorkflow.active);
  const backupPath = createBackup(originalWorkflow);
  console.log(`Cloud backup created: ${path.relative(path.join(__dirname, '..'), backupPath)}`);

  const counts = { appwrite: 0, whatsapp: 0, openai: 0, slack: 0 };
  const updatedWorkflow = injectSecrets(originalWorkflow, counts);

  if (counts.appwrite === 0 || counts.whatsapp === 0) {
    throw new Error('Expected Appwrite and WhatsApp headers were not found; Cloud was not changed.');
  }

  console.log(
    `Prepared secret-only update (Appwrite headers: ${counts.appwrite}, WhatsApp headers: ${counts.whatsapp}, OpenAI headers: ${counts.openai}, Slack URLs: ${counts.slack}).`
  );

  let cloudWasChanged = false;

  try {
    if (wasActive) {
      await setActive(false);
      console.log('Workflow deactivated for the controlled update.');
    }

    await updateWorkflow(updatedWorkflow);
    cloudWasChanged = true;
    console.log('Secret-only workflow update uploaded.');

    await setActive(true);
    console.log('Updated workflow activated.');

    const verifiedWorkflow = await request(`/api/v1/workflows/${N8N_WORKFLOW_ID}`);
    const serialized = JSON.stringify(verifiedWorkflow);
    const verified =
      verifiedWorkflow.active === true &&
      serialized.includes(requiredSecrets.APPWRITE_API_KEY) &&
      serialized.includes(requiredSecrets.WHATSAPP_API_KEY);

    if (!verified) {
      throw new Error('Cloud verification did not confirm the active workflow and both new keys.');
    }

    console.log('Cloud verification passed: workflow is active and both rotated keys are present.');
  } catch (error) {
    if (cloudWasChanged) {
      await rollback(originalWorkflow, wasActive);
    } else if (wasActive) {
      try {
        await setActive(true);
      } catch {
        console.error('Automatic reactivation failed; use the saved backup for recovery.');
      }
    }

    throw error;
  }
}

rotateWorkflowSecrets().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
