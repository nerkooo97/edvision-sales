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

const IMAP_NODE_TYPE = 'n8n-nodes-base.emailReadImap';
const DIRECT_LOOKUP_NAME = 'Appwrite: Pronađi log za IMAP odgovor';
const LOOKUP_RESULT_NAME = 'IF: Pronađen log za IMAP?';

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

function getNodes(workflow) {
  const imap = workflow.nodes.find(node => node.type === IMAP_NODE_TYPE);
  const fullLookup = workflow.nodes.find(node => node.name.startsWith('Appwrite: Uzmi poslata'));
  const splitOut = workflow.nodes.find(node => node.name.startsWith('Split Out: Pisma'));

  if (!imap || !fullLookup || !splitOut) {
    throw new Error('Could not identify the IMAP, contact-log, or Split Out node.');
  }

  return { imap, fullLookup, splitOut };
}

function makeDirectLookupNode(fullLookup, imap) {
  const node = JSON.parse(JSON.stringify(fullLookup));
  node.id = crypto.randomUUID();
  node.name = DIRECT_LOOKUP_NAME;
  node.position = [imap.position[0] + 300, imap.position[1] - 180];
  node.parameters.queryParameters.parameters = [
    { name: 'queries[0]', value: JSON.stringify({ method: 'equal', attribute: 'channel', values: ['Email'] }) },
    {
      name: 'queries[1]',
      value: JSON.stringify({ method: 'equal', attribute: 'status', values: ['Poslano', 'Otvoreno', 'Otvorena'] }),
    },
    {
      name: 'queries[2]',
      value:
        "={{ (() => { const from = $json.from; const raw = typeof from === 'string' ? from : (from?.text || from?.value?.map(item => item.address || '').join(' ') || ''); const email = (raw.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}/i) || ['__no_sender__'])[0].toLowerCase(); return JSON.stringify({ method: 'equal', attribute: 'recipient', values: [email] }); })() }}",
    },
    { name: 'queries[3]', value: JSON.stringify({ method: 'orderDesc', attribute: '$createdAt' }) },
    { name: 'queries[4]', value: JSON.stringify({ method: 'limit', values: [20] }) },
  ];
  return node;
}

function makeLookupResultNode(directLookup, splitOut) {
  return {
    id: crypto.randomUUID(),
    name: LOOKUP_RESULT_NAME,
    type: 'n8n-nodes-base.if',
    typeVersion: 2.2,
    position: [directLookup.position[0] + 300, directLookup.position[1]],
    parameters: {
      conditions: {
        options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 1 },
        conditions: [
          {
            id: 'imap-direct-lookup-found',
            leftValue: '={{ Number($json.total || 0) }}',
            rightValue: 0,
            operator: { type: 'number', operation: 'gt' },
          },
        ],
        combinator: 'and',
      },
      options: {},
    },
  };
}

function getMainConnections(workflow, sourceName) {
  if (!workflow.connections[sourceName]) {
    workflow.connections[sourceName] = { main: [[]] };
  }
  return workflow.connections[sourceName].main;
}

function setEdges(workflow, sourceName, outputIndex, edges) {
  const main = getMainConnections(workflow, sourceName);
  while (main.length <= outputIndex) main.push([]);
  main[outputIndex] = edges;
}

function addDirectLookupPath(workflow) {
  const { imap, fullLookup, splitOut } = getNodes(workflow);
  let directLookup = workflow.nodes.find(node => node.name === DIRECT_LOOKUP_NAME);
  let lookupResult = workflow.nodes.find(node => node.name === LOOKUP_RESULT_NAME);

  if (!directLookup) {
    directLookup = makeDirectLookupNode(fullLookup, imap);
    workflow.nodes.push(directLookup);
  }

  if (!lookupResult) {
    lookupResult = makeLookupResultNode(directLookup, splitOut);
    workflow.nodes.push(lookupResult);
  }

  const imapEdges = getMainConnections(workflow, imap.name);
  let imapRedirected = 0;
  for (const branch of imapEdges) {
    for (const edge of branch) {
      if (edge.node === fullLookup.name) {
        edge.node = directLookup.name;
        imapRedirected += 1;
      }
    }
  }

  if (imapRedirected === 0 && !imapEdges.flat().some(edge => edge.node === directLookup.name)) {
    throw new Error('Could not redirect the IMAP output to the direct lookup node.');
  }

  setEdges(workflow, directLookup.name, 0, [
    { node: lookupResult.name, type: 'main', index: 0 },
  ]);
  setEdges(workflow, lookupResult.name, 0, [
    { node: splitOut.name, type: 'main', index: 0 },
  ]);
  setEdges(workflow, lookupResult.name, 1, [
    { node: fullLookup.name, type: 'main', index: 0 },
  ]);
}

function verifyDirectLookupPath(workflow) {
  const { imap, fullLookup, splitOut } = getNodes(workflow);
  const directLookup = workflow.nodes.find(node => node.name === DIRECT_LOOKUP_NAME);
  const lookupResult = workflow.nodes.find(node => node.name === LOOKUP_RESULT_NAME);

  if (!directLookup || !lookupResult) {
    throw new Error('Direct IMAP lookup nodes are missing.');
  }

  const imapTargets = (workflow.connections[imap.name]?.main || []).flat().map(edge => edge.node);
  const directTargets = (workflow.connections[directLookup.name]?.main || []).flat().map(edge => edge.node);
  const trueTargets = (workflow.connections[lookupResult.name]?.main?.[0] || []).map(edge => edge.node);
  const falseTargets = (workflow.connections[lookupResult.name]?.main?.[1] || []).map(edge => edge.node);

  if (
    !imapTargets.includes(directLookup.name) ||
    imapTargets.includes(fullLookup.name) ||
    !directTargets.includes(lookupResult.name) ||
    !trueTargets.includes(splitOut.name) ||
    !falseTargets.includes(fullLookup.name)
  ) {
    throw new Error('Direct IMAP lookup connections could not be verified.');
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
    `cloud-before-imap-direct-lookup-${N8N_WORKFLOW_ID}-${timestamp}.local.json`
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
  addDirectLookupPath(localWorkflow);
  verifyDirectLookupPath(localWorkflow);
  fs.writeFileSync(localWorkflowPath, `${JSON.stringify(localWorkflow, null, 2)}\n`, 'utf8');
  execFileSync(process.execPath, [path.join(__dirname, 'sanitize-github-workflow.js')], {
    stdio: 'inherit',
  });
}

async function addImapDirectLookup() {
  assertConfiguration();
  const cloudWorkflow = await request(`/api/v1/workflows/${N8N_WORKFLOW_ID}`);
  const wasActive = Boolean(cloudWorkflow.active);
  const backupPath = createCloudBackup(cloudWorkflow);
  console.log(`Cloud backup created: ${path.relative(path.join(__dirname, '..'), backupPath)}`);

  addDirectLookupPath(cloudWorkflow);
  verifyDirectLookupPath(cloudWorkflow);
  let cloudChanged = false;

  try {
    if (wasActive) await setCloudWorkflowActive(false);
    await updateCloudWorkflow(cloudWorkflow);
    cloudChanged = true;
    await setCloudWorkflowActive(true);

    const verified = await request(`/api/v1/workflows/${N8N_WORKFLOW_ID}`);
    const activeVersion = verified.activeVersion || verified;
    verifyDirectLookupPath(activeVersion);

    if (!verified.active || verified.versionId !== verified.activeVersionId) {
      throw new Error('Cloud version verification failed after adding the direct IMAP lookup.');
    }

    updateLocalWorkflow();
    console.log('IMAP direct lookup with fallback completed.');
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

addImapDirectLookup().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
