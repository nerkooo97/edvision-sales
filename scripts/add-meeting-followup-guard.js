const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');

require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const n8nBaseUrl = (process.env.N8N_BASE_URL || '').replace(/\/+$/, '');
const n8nApiKey = process.env.N8N_API_KEY || '';
const workflowId = process.env.N8N_WORKFLOW_ID || '';
const localWorkflowPath = path.join(
  __dirname,
  '..',
  'n8n',
  'Kompletan Sales Sistem (ED Vision).local.json'
);

const names = {
  company: 'Appwrite: Dohvati Firmu za WhatsApp',
  meetingLookup: 'Appwrite: Provjeri aktivni sastanak',
  noMeeting: 'IF: Nema aktivnog sastanka?',
  blockedLeadLookup: 'Appwrite: Provjeri blokirajući lead status',
  leadAllowsFollowup: 'IF: Lead dozvoljava follow-up?',
  validPhone: 'IF: Validan BiH WhatsApp broj?',
  loop: 'Loop Over Obrađene Kontakte1',
};

function assertConfiguration() {
  const missing = [
    ['N8N_BASE_URL', n8nBaseUrl],
    ['N8N_API_KEY', n8nApiKey],
    ['N8N_WORKFLOW_ID', workflowId],
  ]
    .filter(([, value]) => !value)
    .map(([name]) => name);

  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

async function request(endpoint, options = {}) {
  const response = await fetch(`${n8nBaseUrl}${endpoint}`, {
    ...options,
    headers: {
      'X-N8N-API-KEY': n8nApiKey,
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

function getNode(workflow, name) {
  const node = workflow.nodes.find((candidate) => candidate.name === name);
  if (!node) throw new Error(`Missing workflow node: ${name}`);
  return node;
}

function upsertNode(workflow, name, create) {
  const existing = workflow.nodes.find((node) => node.name === name);
  const replacement = create(existing?.id || randomUUID());

  if (existing) {
    Object.assign(existing, replacement);
    return existing;
  }

  workflow.nodes.push(replacement);
  return replacement;
}

function setMainEdges(workflow, source, output, edges) {
  workflow.connections[source] ||= { main: [] };
  workflow.connections[source].main ||= [];
  while (workflow.connections[source].main.length <= output) {
    workflow.connections[source].main.push([]);
  }
  workflow.connections[source].main[output] = edges;
}

function getAppwriteDatabaseBase(companyNode) {
  const match = String(companyNode.parameters?.url || '').match(
    /https:\/\/[^']+\/v1\/databases\/[^/]+/
  );
  if (!match) throw new Error('Could not derive the Appwrite database URL.');
  return match[0];
}

function cloneAppwriteHeaders(companyNode) {
  const headers = companyNode.parameters?.headerParameters?.parameters;
  if (!Array.isArray(headers) || !headers.length) {
    throw new Error('Could not reuse Appwrite authentication headers.');
  }
  return JSON.parse(JSON.stringify(headers));
}

function applyGuard(workflow) {
  const company = getNode(workflow, names.company);
  const validPhone = getNode(workflow, names.validPhone);
  const loop = getNode(workflow, names.loop);
  const appwriteBase = getAppwriteDatabaseBase(company);
  const headers = cloneAppwriteHeaders(company);

  const meetingLookup = upsertNode(workflow, names.meetingLookup, (id) => ({
    id,
    name: names.meetingLookup,
    type: 'n8n-nodes-base.httpRequest',
    typeVersion: 4.2,
    position: [company.position[0] + 224, company.position[1] + 224],
    parameters: {
      url: `${appwriteBase}/collections/meetings/documents`,
      sendQuery: true,
      queryParameters: {
        parameters: [
          {
            name: 'queries[0]',
            value:
              "={{ (() => { const company = $json?.['$id'] || ''; return JSON.stringify({ method: 'equal', attribute: 'company_id', values: [company || '__no_company__'] }); })() }}",
          },
          {
            name: 'queries[1]',
            value: JSON.stringify({
              method: 'equal',
              attribute: 'status',
              values: ['Zakazan', 'Potvrđen', 'Odgođen'],
            }),
          },
          {
            name: 'queries[2]',
            value: JSON.stringify({ method: 'limit', values: [1] }),
          },
        ],
      },
      sendHeaders: true,
      headerParameters: { parameters: headers },
      options: {},
    },
  }));

  const noMeeting = upsertNode(workflow, names.noMeeting, (id) => ({
    id,
    name: names.noMeeting,
    type: 'n8n-nodes-base.if',
    typeVersion: 2.2,
    position: [company.position[0] + 448, company.position[1] + 224],
    parameters: {
      conditions: {
        options: {
          caseSensitive: true,
          leftValue: '',
          typeValidation: 'strict',
          version: 2,
        },
        conditions: [
          {
            id: 'no-active-meeting',
            leftValue: '={{ Number($json.total || 0) }}',
            rightValue: 0,
            operator: { type: 'number', operation: 'equals' },
          },
        ],
        combinator: 'and',
      },
      options: {},
    },
  }));

  const blockedLeadLookup = upsertNode(workflow, names.blockedLeadLookup, (id) => ({
    id,
    name: names.blockedLeadLookup,
    type: 'n8n-nodes-base.httpRequest',
    typeVersion: 4.2,
    position: [company.position[0] + 672, company.position[1] + 224],
    parameters: {
      url: `${appwriteBase}/collections/leads/documents`,
      sendQuery: true,
      queryParameters: {
        parameters: [
          {
            name: 'queries[0]',
            value:
              "={{ (() => { const company = $('Appwrite: Dohvati Firmu za WhatsApp').item.json?.['$id'] || ''; return JSON.stringify({ method: 'equal', attribute: 'company', values: [company || '__no_company__'] }); })() }}",
          },
          {
            name: 'queries[1]',
            value: JSON.stringify({
              method: 'equal',
              attribute: 'status',
              values: [
                'U pregovorima',
                'Kvalifikovan',
                'Zaključeno - Dobijeno',
                'Odbijeno',
                'Greška - Nepostojeći email',
              ],
            }),
          },
          {
            name: 'queries[2]',
            value: JSON.stringify({ method: 'limit', values: [1] }),
          },
        ],
      },
      sendHeaders: true,
      headerParameters: { parameters: cloneAppwriteHeaders(company) },
      options: {},
    },
  }));

  const leadAllowsFollowup = upsertNode(workflow, names.leadAllowsFollowup, (id) => ({
    id,
    name: names.leadAllowsFollowup,
    type: 'n8n-nodes-base.if',
    typeVersion: 2.2,
    position: [company.position[0] + 896, company.position[1] + 224],
    parameters: {
      conditions: {
        options: {
          caseSensitive: true,
          leftValue: '',
          typeValidation: 'strict',
          version: 2,
        },
        conditions: [
          {
            id: 'no-blocking-lead-status',
            leftValue: '={{ Number($json.total || 0) }}',
            rightValue: 0,
            operator: { type: 'number', operation: 'equals' },
          },
        ],
        combinator: 'and',
      },
      options: {},
    },
  }));

  setMainEdges(workflow, company.name, 0, [
    { node: meetingLookup.name, type: 'main', index: 0 },
  ]);
  setMainEdges(workflow, meetingLookup.name, 0, [
    { node: noMeeting.name, type: 'main', index: 0 },
  ]);
  setMainEdges(workflow, noMeeting.name, 0, [
    { node: blockedLeadLookup.name, type: 'main', index: 0 },
  ]);
  setMainEdges(workflow, noMeeting.name, 1, [
    { node: loop.name, type: 'main', index: 0 },
  ]);
  setMainEdges(workflow, blockedLeadLookup.name, 0, [
    { node: leadAllowsFollowup.name, type: 'main', index: 0 },
  ]);
  setMainEdges(workflow, leadAllowsFollowup.name, 0, [
    { node: validPhone.name, type: 'main', index: 0 },
  ]);
  setMainEdges(workflow, leadAllowsFollowup.name, 1, [
    { node: loop.name, type: 'main', index: 0 },
  ]);
}

function verifyGuard(workflow) {
  const meetingLookup = getNode(workflow, names.meetingLookup);
  getNode(workflow, names.noMeeting);
  const blockedLeadLookup = getNode(workflow, names.blockedLeadLookup);
  getNode(workflow, names.leadAllowsFollowup);

  const queryParameters = meetingLookup.parameters?.queryParameters?.parameters || [];
  const statusQuery = queryParameters.find((parameter) => parameter.name === 'queries[1]');
  const parsedStatusQuery = JSON.parse(statusQuery?.value || '{}');

  if (
    !String(meetingLookup.parameters?.url || '').endsWith('/collections/meetings/documents') ||
    parsedStatusQuery.attribute !== 'status' ||
    !parsedStatusQuery.values?.includes('Zakazan') ||
    !parsedStatusQuery.values?.includes('Potvrđen') ||
    !parsedStatusQuery.values?.includes('Odgođen')
  ) {
    throw new Error('The active-meeting Appwrite query is invalid.');
  }

  const leadQueryParameters = blockedLeadLookup.parameters?.queryParameters?.parameters || [];
  const blockedStatusQuery = leadQueryParameters.find(
    (parameter) => parameter.name === 'queries[1]'
  );
  const parsedBlockedStatusQuery = JSON.parse(blockedStatusQuery?.value || '{}');
  if (
    !String(blockedLeadLookup.parameters?.url || '').endsWith('/collections/leads/documents') ||
    parsedBlockedStatusQuery.attribute !== 'status' ||
    !parsedBlockedStatusQuery.values?.includes('U pregovorima') ||
    !parsedBlockedStatusQuery.values?.includes('Odbijeno')
  ) {
    throw new Error('The blocking lead-status Appwrite query is invalid.');
  }

  const expectedEdges = [
    [names.company, 0, names.meetingLookup],
    [names.meetingLookup, 0, names.noMeeting],
    [names.noMeeting, 0, names.blockedLeadLookup],
    [names.noMeeting, 1, names.loop],
    [names.blockedLeadLookup, 0, names.leadAllowsFollowup],
    [names.leadAllowsFollowup, 0, names.validPhone],
    [names.leadAllowsFollowup, 1, names.loop],
  ];

  for (const [source, output, target] of expectedEdges) {
    const targets = (workflow.connections[source]?.main?.[output] || []).map((edge) => edge.node);
    if (!targets.includes(target)) {
      throw new Error(`Missing workflow connection: ${source} -> ${target}`);
    }
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

function createBackup(workflow) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const directory = path.join(__dirname, '..', 'n8n', 'backups');
  const backupPath = path.join(
    directory,
    `cloud-before-meeting-followup-guard-${workflowId}-${timestamp}.local.json`
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

async function updateCloud(workflow) {
  return request(`/api/v1/workflows/${workflowId}`, {
    method: 'PUT',
    body: JSON.stringify(updatePayload(workflow)),
  });
}

async function main() {
  assertConfiguration();
  const original = await request(`/api/v1/workflows/${workflowId}`);
  const wasActive = Boolean(original.active);
  const backupPath = createBackup(original);
  const updated = JSON.parse(JSON.stringify(original));

  applyGuard(updated);
  verifyGuard(updated);

  let cloudChanged = false;
  try {
    if (wasActive) await setActive(false);
    await updateCloud(updated);
    cloudChanged = true;
    if (wasActive) await setActive(true);

    const verified = await request(`/api/v1/workflows/${workflowId}`);
    verifyGuard(verified.activeVersion || verified);
    if (wasActive && (!verified.active || verified.versionId !== verified.activeVersionId)) {
      throw new Error('The updated workflow version is not active.');
    }

    fs.writeFileSync(localWorkflowPath, `${JSON.stringify(verified, null, 2)}\n`, 'utf8');
    console.log(`Cloud backup created: ${path.relative(path.join(__dirname, '..'), backupPath)}`);
    console.log('Active-meeting WhatsApp guard deployed and verified on n8n Cloud.');
  } catch (error) {
    if (cloudChanged) await updateCloud(original);
    if (wasActive) await setActive(true);
    throw error;
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
