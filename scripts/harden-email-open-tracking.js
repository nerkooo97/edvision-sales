const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const baseUrl = (process.env.N8N_BASE_URL || '').replace(/\/+$/, '');
const apiKey = process.env.N8N_API_KEY || '';
const workflowId = process.env.N8N_WORKFLOW_ID || '';
const localPath = path.join(__dirname, '..', 'n8n', 'Kompletan Sales Sistem (ED Vision).local.json');

const names = {
  lookup: 'Appwrite: Pronadji Log za Otvaranje',
  guard: 'IF: Email je i dalje samo otvoren',
  update: 'Appwrite: Azuriraj Status na Otvoreno',
};
const allowedStatuses = ['Poslano', 'Otvoreno', 'Otvorena'];

if (!baseUrl || !apiKey || !workflowId) throw new Error('Missing n8n configuration in .env.local.');

async function request(endpoint, options = {}) {
  const response = await fetch(`${baseUrl}${endpoint}`, {
    ...options,
    headers: { 'X-N8N-API-KEY': apiKey, 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  if (!response.ok) throw new Error(`${options.method || 'GET'} ${endpoint} failed with HTTP ${response.status}`);
  const body = await response.text();
  return body ? JSON.parse(body) : null;
}

function getNode(workflow, name) {
  const node = workflow.nodes.find((item) => item.name === name);
  if (!node) throw new Error(`Missing workflow node: ${name}`);
  return node;
}

function setMainEdges(workflow, source, index, edges) {
  workflow.connections[source] ||= { main: [[]] };
  workflow.connections[source].main ||= [[]];
  while (workflow.connections[source].main.length <= index) workflow.connections[source].main.push([]);
  workflow.connections[source].main[index] = edges;
}

function ensureGuard(workflow, lookup) {
  let guard = workflow.nodes.find((item) => item.name === names.guard);
  if (!guard) {
    guard = {
      id: crypto.randomUUID(),
      name: names.guard,
      type: 'n8n-nodes-base.if',
      typeVersion: 2.2,
      position: [lookup.position[0] + 320, lookup.position[1]],
      parameters: {},
    };
    workflow.nodes.push(guard);
  }
  guard.parameters = {
    conditions: {
      options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 2 },
      conditions: [{
        id: 'email-open-log-found',
        leftValue: '={{ Number($json.total || 0) }}',
        rightValue: 0,
        operator: { type: 'number', operation: 'larger' },
      }],
      combinator: 'and',
    },
    options: {},
  };
  return guard;
}

function apply(workflow) {
  const lookup = getNode(workflow, names.lookup);
  const update = getNode(workflow, names.update);
  const parameters = lookup.parameters?.queryParameters?.parameters;
  if (!Array.isArray(parameters)) throw new Error('Opening-log lookup does not have query parameters.');

  const statusQuery = JSON.stringify({ method: 'equal', attribute: 'status', values: allowedStatuses });
  const existing = parameters.find((item) => item.name === 'queries[3]');
  if (existing) existing.value = statusQuery;
  else parameters.push({ name: 'queries[3]', value: statusQuery });

  const guard = ensureGuard(workflow, lookup);
  setMainEdges(workflow, lookup.name, 0, [{ node: guard.name, type: 'main', index: 0 }]);
  setMainEdges(workflow, guard.name, 0, [{ node: update.name, type: 'main', index: 0 }]);
  setMainEdges(workflow, guard.name, 1, []);
}

function verify(workflow) {
  const lookup = getNode(workflow, names.lookup);
  const guard = getNode(workflow, names.guard);
  const update = getNode(workflow, names.update);
  const query = lookup.parameters?.queryParameters?.parameters?.find((item) => item.name === 'queries[3]')?.value || '';
  if (!allowedStatuses.every((status) => query.includes(status))) {
    throw new Error('Opening lookup is not restricted to non-terminal email statuses.');
  }
  if (!guard.parameters?.conditions?.conditions?.some((condition) => condition.id === 'email-open-log-found')) {
    throw new Error('No guard prevents updates when an eligible log was not found.');
  }
  const lookupTargets = (workflow.connections[lookup.name]?.main?.[0] || []).map((edge) => edge.node);
  const guardTargets = (workflow.connections[guard.name]?.main?.[0] || []).map((edge) => edge.node);
  if (!lookupTargets.includes(guard.name) || !guardTargets.includes(update.name)) {
    throw new Error('Opening tracking connections are not correctly guarded.');
  }
}

function payload(workflow) {
  return { name: workflow.name, nodes: workflow.nodes, connections: workflow.connections, settings: workflow.settings || {} };
}

function backup(workflow) {
  const directory = path.join(__dirname, '..', 'n8n', 'backups');
  fs.mkdirSync(directory, { recursive: true });
  const file = path.join(directory, `cloud-before-email-open-tracking-hardening-${workflowId}-${new Date().toISOString().replace(/[:.]/g, '-')}.local.json`);
  fs.writeFileSync(file, `${JSON.stringify(workflow, null, 2)}\n`, { flag: 'wx' });
  return file;
}

async function setActive(active) {
  return request(`/api/v1/workflows/${workflowId}/${active ? 'activate' : 'deactivate'}`, { method: 'POST' });
}

async function put(workflow) {
  return request(`/api/v1/workflows/${workflowId}`, { method: 'PUT', body: JSON.stringify(payload(workflow)) });
}

function updateLocal() {
  if (!fs.existsSync(localPath)) return;
  const local = JSON.parse(fs.readFileSync(localPath, 'utf8'));
  apply(local);
  verify(local);
  fs.writeFileSync(localPath, `${JSON.stringify(local, null, 2)}\n`);
  execFileSync(process.execPath, [path.join(__dirname, 'sanitize-github-workflow.js')], { stdio: 'inherit' });
}

async function main() {
  const workflow = await request(`/api/v1/workflows/${workflowId}`);
  const wasActive = Boolean(workflow.active);
  const backupFile = backup(workflow);
  console.log(`Cloud backup created: ${path.relative(path.join(__dirname, '..'), backupFile)}`);
  apply(workflow);
  verify(workflow);

  let changed = false;
  try {
    if (wasActive) await setActive(false);
    await put(workflow);
    changed = true;
    if (wasActive) await setActive(true);
    const verified = await request(`/api/v1/workflows/${workflowId}`);
    verify(verified.activeVersion || verified);
    if (wasActive && (!verified.active || verified.versionId !== verified.activeVersionId)) {
      throw new Error('Active n8n version verification failed.');
    }
    updateLocal();
    console.log('Email open tracking is now guarded against overwriting reply statuses.');
  } catch (error) {
    if (changed) await put(JSON.parse(fs.readFileSync(backupFile, 'utf8')));
    if (wasActive) await setActive(true);
    throw error;
  }
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
