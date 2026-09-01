const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const baseUrl = (process.env.N8N_BASE_URL || '').replace(/\/+$/, '');
const apiKey = process.env.N8N_API_KEY || '';
const workflowId = process.env.N8N_WORKFLOW_ID || '';
const localPath = path.join(__dirname, '..', 'n8n', 'Kompletan Sales Sistem (ED Vision).local.json');
const updates = [
  ['Appwrite: Ažuriraj Lead -> U pregovorima1', { status: 'U pregovorima' }],
  ['Appwrite: Ažuriraj Dnevnik -> Odgovoreno1', { status: 'Odgovoreno', outcome: 'Zainteresovan / Odgovorio' }],
  ['Appwrite: Ažuriraj Lead -> Greška', { status: 'Greška - Nepostojeći email' }],
  ['Appwrite: Ažuriraj Dnevnik -> Greška', { status: 'Greška', outcome: 'Bounce - Undelivered Mail Returned to Sender' }],
];
const criticalWriteNodes = [
  'Appwrite: Kreiraj Lead u bazi1',
  'Appwrite: Evidentiraj u Dnevnik (contact_logs)1',
  'Appwrite: Evidentiraj WhatsApp u Dnevnik1',
  'Appwrite: Evidentiraj Gresku Emaila (contact_logs)1',
];
const appwriteDocumentsUrl =
  'https://appwrite.ed-vision.com/v1/databases/6a7dd77a002b3913d433/collections';
const imapNodeName = 'IMAP: Povuci nove emailove iz Inboxa1';

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

function apply(workflow) {
  for (const [name, data] of updates) {
    const node = workflow.nodes.find(node => node.name === name);
    if (!node || node.type !== 'n8n-nodes-base.httpRequest') throw new Error(`Missing HTTP node: ${name}`);
    node.parameters.jsonBody = `={{ JSON.stringify({ data: ${JSON.stringify(data)} }) }}`;
    if (node.parameters.options?.response?.response) delete node.parameters.options.response.response.neverError;
    if (name === 'Appwrite: Ažuriraj Lead -> U pregovorima1') {
      node.parameters.url =
        `={{ '${appwriteDocumentsUrl}/leads/documents/' + ($json.log?.lead?.['$id'] || $json.log?.lead || '') }}`;
    }
    if (name === 'Appwrite: Ažuriraj Dnevnik -> Odgovoreno1') {
      node.parameters.url =
        `={{ '${appwriteDocumentsUrl}/contact_logs/documents/' + ($('IF: Da li je klijent odgovorio?1').item.json.log?.['$id'] || '') }}`;
    }
  }
  for (const name of criticalWriteNodes) {
    const node = workflow.nodes.find(node => node.name === name);
    if (!node || node.type !== 'n8n-nodes-base.httpRequest') {
      throw new Error(`Missing critical Appwrite write node: ${name}`);
    }
    if (node.parameters.options?.response?.response) delete node.parameters.options.response.response.neverError;
  }
  const imap = workflow.nodes.find(node => node.name === imapNodeName);
  if (!imap || imap.type !== 'n8n-nodes-base.emailReadImap') throw new Error('IMAP trigger node is missing.');
  imap.parameters.postProcessAction = 'read';
  delete imap.alwaysOutputData;
  delete imap.onError;
}

function verify(workflow) {
  for (const [name, data] of updates) {
    const node = workflow.nodes.find(node => node.name === name);
    const expected = JSON.stringify(data);
    if (
      !node?.parameters?.jsonBody?.includes(`data: ${expected}`) ||
      node.parameters?.options?.response?.response?.neverError === true
    ) throw new Error(`Reply/bounce update verification failed: ${name}`);
  }
  const replyLead = workflow.nodes.find(node => node.name === 'Appwrite: Ažuriraj Lead -> U pregovorima1');
  const replyLog = workflow.nodes.find(node => node.name === 'Appwrite: Ažuriraj Dnevnik -> Odgovoreno1');
  if (!replyLead?.parameters?.url?.includes('$json.log?.lead') || !replyLog?.parameters?.url?.includes("$('IF: Da li je klijent odgovorio?1').item.json.log")) {
    throw new Error('Reply update URLs are not using the current loop item.');
  }
  for (const name of criticalWriteNodes) {
    const node = workflow.nodes.find(node => node.name === name);
    if (node?.parameters?.options?.response?.response?.neverError === true) {
      throw new Error(`Critical Appwrite write still hides errors: ${name}`);
    }
  }
  const imap = workflow.nodes.find(node => node.name === imapNodeName);
  if (imap?.parameters?.postProcessAction !== 'read' || imap.alwaysOutputData === true || imap.onError) {
    throw new Error('IMAP trigger still allows duplicate processing or silent errors.');
  }
}

function payload(workflow) {
  return { name: workflow.name, nodes: workflow.nodes, connections: workflow.connections, settings: workflow.settings || {} };
}

function backup(workflow) {
  const directory = path.join(__dirname, '..', 'n8n', 'backups');
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const file = path.join(directory, `cloud-before-reply-status-fix-${workflowId}-${stamp}.local.json`);
  fs.mkdirSync(directory, { recursive: true });
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
    if (wasActive && (!verified.active || verified.versionId !== verified.activeVersionId)) throw new Error('Active version verification failed.');
    updateLocal();
    console.log('Reply and bounce Appwrite status updates fixed; failures now stop the execution.');
  } catch (error) {
    if (changed) await put(JSON.parse(fs.readFileSync(backupFile, 'utf8')));
    if (wasActive) await setActive(true);
    throw error;
  }
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });
