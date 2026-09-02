const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const baseUrl = (process.env.N8N_BASE_URL || '').replace(/\/+$/, '');
const apiKey = process.env.N8N_API_KEY || '';
const workflowId = process.env.N8N_WORKFLOW_ID || '';
const localWorkflowPath = path.join(
  __dirname,
  '..',
  'n8n',
  'Kompletan Sales Sistem (ED Vision).local.json'
);

if (!baseUrl || !apiKey || !workflowId) {
  throw new Error('Missing n8n configuration in .env.local.');
}

async function request(endpoint, options = {}) {
  const response = await fetch(`${baseUrl}${endpoint}`, {
    ...options,
    headers: {
      'X-N8N-API-KEY': apiKey,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  if (!response.ok) {
    throw new Error(`${options.method || 'GET'} ${endpoint} failed with HTTP ${response.status}`);
  }
  const body = await response.text();
  return body ? JSON.parse(body) : null;
}

function getImapNode(workflow) {
  const node = workflow.nodes.find(
    (candidate) => candidate.type === 'n8n-nodes-base.emailReadImap'
  );
  if (!node) throw new Error('Email Trigger (IMAP) node is missing.');
  return node;
}

function applyImapSettings(workflow) {
  const imap = getImapNode(workflow);
  imap.parameters ||= {};
  imap.parameters.postProcessAction = 'read';
  imap.parameters.options = {
    ...(imap.parameters.options || {}),
    downloadAttachments: false,
    forceReconnect: 30,
    trackLastMessageId: true,
  };
  delete imap.alwaysOutputData;
  delete imap.onError;
}

function verifyImapSettings(workflow) {
  const imap = getImapNode(workflow);
  const options = imap.parameters?.options || {};
  if (
    imap.disabled === true ||
    imap.parameters?.postProcessAction !== 'read' ||
    options.downloadAttachments !== false ||
    options.forceReconnect !== 30 ||
    options.trackLastMessageId !== true ||
    imap.alwaysOutputData === true ||
    imap.onError
  ) {
    throw new Error('IMAP trigger settings verification failed.');
  }
}

function payload(workflow) {
  return {
    name: workflow.name,
    nodes: workflow.nodes,
    connections: workflow.connections,
    settings: workflow.settings || {},
  };
}

function createBackup(workflow) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const directory = path.join(__dirname, '..', 'n8n', 'backups');
  const backupPath = path.join(
    directory,
    `cloud-before-imap-stabilization-${workflowId}-${timestamp}.local.json`
  );
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(backupPath, `${JSON.stringify(workflow, null, 2)}\n`, {
    encoding: 'utf8',
    flag: 'wx',
  });
  return backupPath;
}

async function setActive(active) {
  return request(`/api/v1/workflows/${workflowId}/${active ? 'activate' : 'deactivate'}`, {
    method: 'POST',
  });
}

async function put(workflow) {
  return request(`/api/v1/workflows/${workflowId}`, {
    method: 'PUT',
    body: JSON.stringify(payload(workflow)),
  });
}

async function main() {
  const original = await request(`/api/v1/workflows/${workflowId}`);
  const wasActive = Boolean(original.active);
  const updated = JSON.parse(JSON.stringify(original));
  const backupPath = createBackup(original);
  applyImapSettings(updated);
  verifyImapSettings(updated);

  let cloudChanged = false;
  try {
    if (wasActive) await setActive(false);
    await put(updated);
    cloudChanged = true;
    if (wasActive) await setActive(true);

    const verified = await request(`/api/v1/workflows/${workflowId}`);
    verifyImapSettings(verified.activeVersion || verified);
    if (wasActive && (!verified.active || verified.versionId !== verified.activeVersionId)) {
      throw new Error('The stabilized workflow version is not active.');
    }

    fs.writeFileSync(localWorkflowPath, `${JSON.stringify(verified, null, 2)}\n`, 'utf8');
    console.log(`Cloud backup created: ${path.relative(path.join(__dirname, '..'), backupPath)}`);
    console.log('IMAP trigger stabilized, re-registered, and verified active.');
  } catch (error) {
    if (cloudChanged) await put(original);
    if (wasActive) await setActive(true);
    throw error;
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
