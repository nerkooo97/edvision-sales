const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const N8N_BASE_URL = (process.env.N8N_BASE_URL || '').replace(/\/+$/, '');
const N8N_API_KEY = process.env.N8N_API_KEY || '';
const N8N_WORKFLOW_ID = process.env.N8N_WORKFLOW_ID || '';
const localWorkflowPath = path.join(
  __dirname,
  '..',
  'n8n',
  'Kompletan Sales Sistem (ED Vision).local.json'
);

function assertConfiguration() {
  const missing = [
    ['N8N_BASE_URL', N8N_BASE_URL],
    ['N8N_API_KEY', N8N_API_KEY],
    ['N8N_WORKFLOW_ID', N8N_WORKFLOW_ID],
  ]
    .filter(([, value]) => !value)
    .map(([name]) => name);

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

function getContactLogNode(workflow) {
  const node = workflow.nodes.find(node => node.name.startsWith('Appwrite: Uzmi poslata'));
  if (!node) {
    throw new Error('Could not identify the sent contact-log Appwrite node.');
  }

  return node;
}

function applyCorrectLimitQuery(workflow) {
  const node = getContactLogNode(workflow);
  const parameters = node.parameters?.queryParameters?.parameters;

  if (!Array.isArray(parameters)) {
    throw new Error('The sent contact-log node has an unexpected query parameter structure.');
  }

  const wrongLimitIndex = parameters.findIndex(parameter => parameter.name === 'limit');
  if (wrongLimitIndex !== -1) parameters.splice(wrongLimitIndex, 1);

  const limitQuery = JSON.stringify({ method: 'limit', values: [100] });
  const existingLimit = parameters.find(parameter => {
    if (!/^queries\[\d+\]$/.test(parameter.name)) return false;
    try {
      return JSON.parse(parameter.value).method === 'limit';
    } catch {
      return false;
    }
  });

  if (existingLimit) {
    existingLimit.value = limitQuery;
  } else {
    parameters.push({ name: 'queries[3]', value: limitQuery });
  }

  const verifiedLimit = parameters.find(parameter => {
    try {
      const query = JSON.parse(parameter.value);
      return query.method === 'limit' && query.values?.[0] === 100;
    } catch {
      return false;
    }
  });

  if (!verifiedLimit || parameters.some(parameter => parameter.name === 'limit')) {
    throw new Error('Could not set the Appwrite limit as a query expression.');
  }
}

function toUpdatePayload(workflow) {
  return {
    name: workflow.name,
    nodes: workflow.nodes,
    connections: workflow.connections,
    settings: workflow.settings || {},
  };
}

function createCloudBackup(workflow) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDirectory = path.join(__dirname, '..', 'n8n', 'backups');
  const backupPath = path.join(
    backupDirectory,
    `cloud-before-contact-log-limit-fix-${N8N_WORKFLOW_ID}-${timestamp}.local.json`
  );

  fs.mkdirSync(backupDirectory, { recursive: true });
  fs.writeFileSync(backupPath, `${JSON.stringify(workflow, null, 2)}\n`, {
    encoding: 'utf8',
    flag: 'wx',
  });

  return backupPath;
}

async function updateCloudWorkflow(workflow) {
  return request(`/api/v1/workflows/${N8N_WORKFLOW_ID}`, {
    method: 'PUT',
    body: JSON.stringify(toUpdatePayload(workflow)),
  });
}

async function setCloudWorkflowActive(active) {
  return request(`/api/v1/workflows/${N8N_WORKFLOW_ID}/${active ? 'activate' : 'deactivate'}`, {
    method: 'POST',
  });
}

function updateLocalWorkflow() {
  const localWorkflow = JSON.parse(fs.readFileSync(localWorkflowPath, 'utf8'));
  applyCorrectLimitQuery(localWorkflow);
  fs.writeFileSync(localWorkflowPath, `${JSON.stringify(localWorkflow, null, 2)}\n`, 'utf8');
  execFileSync(process.execPath, [path.join(__dirname, 'sanitize-github-workflow.js')], {
    stdio: 'inherit',
  });
}

async function fixContactLogLimit() {
  assertConfiguration();

  const cloudWorkflow = await request(`/api/v1/workflows/${N8N_WORKFLOW_ID}`);
  const wasActive = Boolean(cloudWorkflow.active);
  const backupPath = createCloudBackup(cloudWorkflow);
  console.log(`Cloud backup created: ${path.relative(path.join(__dirname, '..'), backupPath)}`);

  applyCorrectLimitQuery(cloudWorkflow);
  let cloudChanged = false;

  try {
    if (wasActive) await setCloudWorkflowActive(false);
    await updateCloudWorkflow(cloudWorkflow);
    cloudChanged = true;
    await setCloudWorkflowActive(true);

    const verified = await request(`/api/v1/workflows/${N8N_WORKFLOW_ID}`);
    const activeVersion = verified.activeVersion || verified;
    const parameters = getContactLogNode(activeVersion).parameters.queryParameters.parameters;
    const hasCorrectLimit = parameters.some(parameter => {
      try {
        const query = JSON.parse(parameter.value);
        return query.method === 'limit' && query.values?.[0] === 100;
      } catch {
        return false;
      }
    });

    if (
      !verified.active ||
      verified.versionId !== verified.activeVersionId ||
      !hasCorrectLimit ||
      parameters.some(parameter => parameter.name === 'limit')
    ) {
      throw new Error('Cloud verification failed after fixing the Appwrite contact-log limit.');
    }

    updateLocalWorkflow();
    console.log('Appwrite contact-log limit query fixed.');
  } catch (error) {
    if (cloudChanged) {
      console.error('Cloud update failed; restoring the backup.');
      await updateCloudWorkflow(JSON.parse(fs.readFileSync(backupPath, 'utf8')));
      if (wasActive) await setCloudWorkflowActive(true);
      console.error('Cloud backup restored.');
    } else if (wasActive) {
      try {
        await setCloudWorkflowActive(true);
      } catch {
        console.error('Automatic reactivation failed; use the saved backup for recovery.');
      }
    }

    throw error;
  }
}

fixContactLogLimit().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
