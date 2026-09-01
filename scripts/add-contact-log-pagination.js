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

function headers() {
  return { 'X-N8N-API-KEY': N8N_API_KEY, 'Content-Type': 'application/json' };
}

async function request(endpoint, options = {}) {
  const response = await fetch(`${N8N_BASE_URL}${endpoint}`, {
    ...options,
    headers: { ...headers(), ...(options.headers || {}) },
  });
  if (!response.ok) {
    throw new Error(`${options.method || 'GET'} ${endpoint} failed with HTTP ${response.status}`);
  }
  const body = await response.text();
  return body ? JSON.parse(body) : null;
}

function getFullLookup(workflow) {
  const node = workflow.nodes.find(node => node.name.startsWith('Appwrite: Uzmi poslata'));
  if (!node) throw new Error('Could not identify the fallback contact-log Appwrite node.');
  return node;
}

function addPagination(workflow) {
  const node = getFullLookup(workflow);
  const queryParameters = node.parameters?.queryParameters?.parameters;
  if (!Array.isArray(queryParameters)) {
    throw new Error('The fallback contact-log node has an unexpected query parameter structure.');
  }

  const limit = queryParameters.find(parameter => {
    try {
      const query = JSON.parse(parameter.value);
      return query.method === 'limit' && query.values?.[0] === 100;
    } catch {
      return false;
    }
  });
  if (!limit) throw new Error('The required Appwrite limit(100) query is missing.');

  node.parameters.options = node.parameters.options || {};
  node.parameters.options.pagination = {
    pagination: {
      paginationMode: 'updateAParameterInEachRequest',
      parameters: {
        parameters: [
          {
            type: 'qs',
            name: 'queries[4]',
            value:
              "={{ JSON.stringify({ method: 'cursorAfter', values: [$response.body.documents[$response.body.documents.length - 1].$id] }) }}",
          },
        ],
      },
      paginationCompleteWhen: 'other',
      completeExpression: '={{ $response.body.documents.length < 100 }}',
      limitPagesFetched: true,
      maxRequests: 10,
      requestInterval: 0,
    },
  };
}

function verifyPagination(workflow) {
  const node = getFullLookup(workflow);
  const pagination = node.parameters?.options?.pagination?.pagination;
  const entry = pagination?.parameters?.parameters?.[0];
  if (
    pagination?.paginationMode !== 'updateAParameterInEachRequest' ||
    entry?.type !== 'qs' ||
    entry?.name !== 'queries[4]' ||
    !entry.value.includes("method: 'cursorAfter'") ||
    pagination.paginationCompleteWhen !== 'other' ||
    pagination.completeExpression !== '={{ $response.body.documents.length < 100 }}' ||
    pagination.limitPagesFetched !== true ||
    pagination.maxRequests !== 10
  ) {
    throw new Error('Contact-log pagination configuration could not be verified.');
  }
}

function updatePayload(workflow) {
  return {
    name: workflow.name,
    nodes: workflow.nodes,
    connections: workflow.connections,
    settings: workflow.settings || {},
  };
}

function createCloudBackup(workflow) {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const directory = path.join(__dirname, '..', 'n8n', 'backups');
  const backupPath = path.join(
    directory,
    `cloud-before-contact-log-pagination-${N8N_WORKFLOW_ID}-${stamp}.local.json`
  );
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(backupPath, `${JSON.stringify(workflow, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' });
  return backupPath;
}

async function setActive(active) {
  return request(`/api/v1/workflows/${N8N_WORKFLOW_ID}/${active ? 'activate' : 'deactivate'}`, {
    method: 'POST',
  });
}

async function updateCloud(workflow) {
  return request(`/api/v1/workflows/${N8N_WORKFLOW_ID}`, {
    method: 'PUT',
    body: JSON.stringify(updatePayload(workflow)),
  });
}

function updateLocalWorkflow() {
  const localWorkflow = JSON.parse(fs.readFileSync(localWorkflowPath, 'utf8'));
  addPagination(localWorkflow);
  verifyPagination(localWorkflow);
  fs.writeFileSync(localWorkflowPath, `${JSON.stringify(localWorkflow, null, 2)}\n`, 'utf8');
  execFileSync(process.execPath, [path.join(__dirname, 'sanitize-github-workflow.js')], {
    stdio: 'inherit',
  });
}

async function main() {
  assertConfiguration();
  const workflow = await request(`/api/v1/workflows/${N8N_WORKFLOW_ID}`);
  const wasActive = Boolean(workflow.active);
  const backupPath = createCloudBackup(workflow);
  console.log(`Cloud backup created: ${path.relative(path.join(__dirname, '..'), backupPath)}`);

  addPagination(workflow);
  verifyPagination(workflow);
  let cloudChanged = false;
  try {
    if (wasActive) await setActive(false);
    await updateCloud(workflow);
    cloudChanged = true;
    if (wasActive) await setActive(true);

    const verified = await request(`/api/v1/workflows/${N8N_WORKFLOW_ID}`);
    const activeVersion = verified.activeVersion || verified;
    verifyPagination(activeVersion);
    if (wasActive && (!verified.active || verified.versionId !== verified.activeVersionId)) {
      throw new Error('Cloud version verification failed after adding pagination.');
    }
    updateLocalWorkflow();
    console.log('Fallback contact-log pagination enabled (maximum 10 pages of 100 logs).');
  } catch (error) {
    if (cloudChanged) {
      console.error('Cloud update failed; restoring the backup.');
      await updateCloud(JSON.parse(fs.readFileSync(backupPath, 'utf8')));
    }
    if (wasActive) {
      try {
        await setActive(true);
      } catch {
        console.error('Automatic reactivation failed; use the saved backup for recovery.');
      }
    }
    throw error;
  }
}

main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
