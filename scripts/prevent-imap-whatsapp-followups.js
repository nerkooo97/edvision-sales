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

function getTargetNodes(workflow) {
  const matcher = workflow.nodes.find(node => node.name.startsWith('Set: Pametno Matchiranje'));
  const whatsappCondition = workflow.nodes.find(node => node.name.startsWith('IF: Spreman za WhatsApp'));

  if (!matcher || !whatsappCondition) {
    throw new Error('Could not identify the reply-matching or WhatsApp condition node.');
  }

  return { matcher, whatsappCondition };
}

function applyImapGuard(workflow) {
  const { matcher, whatsappCondition } = getTargetNodes(workflow);
  const output = matcher.parameters?.jsonOutput;

  if (typeof output !== 'string') {
    throw new Error('Reply-matching node does not have a raw JSON expression.');
  }

  if (!output.includes('is_imap_event')) {
    matcher.parameters.jsonOutput = output.replace(
      '  is_ready_for_whatsapp: sentDate ? (sentDate <= fourDaysAgo) : false,',
      '  is_ready_for_whatsapp: sentDate ? (sentDate <= fourDaysAgo) : false,\n  is_imap_event: incomingEmails.length > 0,'
    );

    if (!matcher.parameters.jsonOutput.includes('is_imap_event')) {
      throw new Error('Could not add the IMAP-event marker to the reply-matching node.');
    }
  }

  const conditions = whatsappCondition.parameters?.conditions?.conditions;
  if (!Array.isArray(conditions)) {
    throw new Error('WhatsApp condition node has an unexpected structure.');
  }

  const alreadyGuarded = conditions.some(
    condition => String(condition.leftValue || '').includes('is_imap_event')
  );

  if (!alreadyGuarded) {
    conditions.push({
      id: 'wa-not-imap-event',
      leftValue: '={{ Boolean($json.is_imap_event) }}',
      rightValue: false,
      operator: { type: 'boolean', operation: 'equals' },
    });
  }

  return { matcherName: matcher.name, whatsappConditionName: whatsappCondition.name };
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
    `cloud-before-imap-whatsapp-guard-${N8N_WORKFLOW_ID}-${timestamp}.local.json`
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
  applyImapGuard(localWorkflow);
  fs.writeFileSync(localWorkflowPath, `${JSON.stringify(localWorkflow, null, 2)}\n`, 'utf8');
  execFileSync(process.execPath, [path.join(__dirname, 'sanitize-github-workflow.js')], {
    stdio: 'inherit',
  });
}

async function preventImapWhatsappFollowups() {
  assertConfiguration();

  const cloudWorkflow = await request(`/api/v1/workflows/${N8N_WORKFLOW_ID}`);
  const wasActive = Boolean(cloudWorkflow.active);
  const backupPath = createCloudBackup(cloudWorkflow);
  console.log(`Cloud backup created: ${path.relative(path.join(__dirname, '..'), backupPath)}`);

  applyImapGuard(cloudWorkflow);
  let cloudChanged = false;

  try {
    if (wasActive) await setCloudWorkflowActive(false);
    await updateCloudWorkflow(cloudWorkflow);
    cloudChanged = true;
    await setCloudWorkflowActive(true);

    const verified = await request(`/api/v1/workflows/${N8N_WORKFLOW_ID}`);
    const activeVersion = verified.activeVersion || verified;
    const { matcher, whatsappCondition } = getTargetNodes(activeVersion);
    const conditionValues = whatsappCondition.parameters.conditions.conditions.map(
      condition => String(condition.leftValue || '')
    );

    if (
      !verified.active ||
      verified.versionId !== verified.activeVersionId ||
      !matcher.parameters.jsonOutput.includes('is_imap_event') ||
      !conditionValues.some(value => value.includes('is_imap_event'))
    ) {
      throw new Error('Cloud verification failed after adding the IMAP WhatsApp guard.');
    }

    updateLocalWorkflow();
    console.log('IMAP WhatsApp guard completed.');
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

preventImapWhatsappFollowups().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
