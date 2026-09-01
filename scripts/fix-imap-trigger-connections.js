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

function toUpdatePayload(workflow) {
  return {
    name: workflow.name,
    nodes: workflow.nodes,
    connections: workflow.connections,
    settings: workflow.settings || {},
  };
}

function getFixTargets(workflow) {
  const imap = workflow.nodes.find(node => node.type === 'n8n-nodes-base.emailReadImap');
  const sentLogs = workflow.nodes.find(node => node.name.startsWith('Appwrite: Uzmi poslata'));

  if (!imap || !sentLogs) {
    throw new Error('Could not identify the IMAP trigger or sent-log node.');
  }

  return { imapName: imap.name, sentLogsName: sentLogs.name };
}

function redirectFollowupTriggers(workflow) {
  const { imapName, sentLogsName } = getFixTargets(workflow);
  let redirected = 0;

  for (const [sourceName, connection] of Object.entries(workflow.connections || {})) {
    const sourceNode = workflow.nodes.find(node => node.name === sourceName);
    const isScheduleOrWebhook =
      sourceNode?.type === 'n8n-nodes-base.scheduleTrigger' ||
      sourceNode?.type === 'n8n-nodes-base.webhook';

    if (!isScheduleOrWebhook) continue;

    for (const branch of connection.main || []) {
      for (const edge of branch || []) {
        if (edge.node === imapName) {
          edge.node = sentLogsName;
          redirected += 1;
        }
      }
    }
  }

  const incomingImapEdges = [];
  for (const [sourceName, connection] of Object.entries(workflow.connections || {})) {
    for (const branch of connection.main || []) {
      for (const edge of branch || []) {
        if (edge.node === imapName) incomingImapEdges.push(sourceName);
      }
    }
  }

  if (redirected !== 2 || incomingImapEdges.length !== 0) {
    throw new Error(
      `Expected to redirect exactly two follow-up edges and leave IMAP without inputs; redirected=${redirected}, remainingInputs=${incomingImapEdges.length}.`
    );
  }

  return { redirected, imapName, sentLogsName };
}

function createCloudBackup(workflow) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDirectory = path.join(__dirname, '..', 'n8n', 'backups');
  const backupPath = path.join(
    backupDirectory,
    `cloud-before-imap-trigger-fix-${N8N_WORKFLOW_ID}-${timestamp}.local.json`
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
  const result = redirectFollowupTriggers(localWorkflow);
  fs.writeFileSync(localWorkflowPath, `${JSON.stringify(localWorkflow, null, 2)}\n`, 'utf8');
  execFileSync(process.execPath, [path.join(__dirname, 'sanitize-github-workflow.js')], {
    stdio: 'inherit',
  });
  return result;
}

async function fixImapTriggerConnections() {
  assertConfiguration();

  const cloudWorkflow = await request(`/api/v1/workflows/${N8N_WORKFLOW_ID}`);
  const wasActive = Boolean(cloudWorkflow.active);
  const backupPath = createCloudBackup(cloudWorkflow);
  console.log(`Cloud backup created: ${path.relative(path.join(__dirname, '..'), backupPath)}`);

  const cloudResult = redirectFollowupTriggers(cloudWorkflow);
  let cloudChanged = false;

  try {
    if (wasActive) {
      await setCloudWorkflowActive(false);
    }

    await updateCloudWorkflow(cloudWorkflow);
    cloudChanged = true;

    await setCloudWorkflowActive(true);

    const verified = await request(`/api/v1/workflows/${N8N_WORKFLOW_ID}`);
    const verifiedResult = getFixTargets(verified.activeVersion || verified);
    const hasIncomingImap = Object.values((verified.activeVersion || verified).connections || {}).some(
      connection =>
        (connection.main || []).some(branch =>
          (branch || []).some(edge => edge.node === verifiedResult.imapName)
        )
    );

    if (
      !verified.active ||
      verified.versionId !== verified.activeVersionId ||
      hasIncomingImap
    ) {
      throw new Error('Cloud verification failed after updating the IMAP trigger connections.');
    }

    const localResult = updateLocalWorkflow();
    console.log(
      `IMAP fix completed (Cloud redirects: ${cloudResult.redirected}, local redirects: ${localResult.redirected}).`
    );
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

fixImapTriggerConnections().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
