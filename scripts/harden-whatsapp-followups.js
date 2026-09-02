const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const n8nBaseUrl = (process.env.N8N_BASE_URL || '').replace(/\/+$/, '');
const n8nApiKey = process.env.N8N_API_KEY || '';
const workflowId = process.env.N8N_WORKFLOW_ID || '';
const whatsappApiKey = process.env.WHATSAPP_API_KEY || '';
const localWorkflowPath = path.join(__dirname, '..', 'n8n', 'Kompletan Sales Sistem (ED Vision).local.json');

const names = {
  ready: 'IF: Spreman za WhatsApp (Prošlo 4 dana)?1',
  company: 'Appwrite: Dohvati Firmu za WhatsApp',
  validPhone: 'IF: Validan BiH WhatsApp broj?',
  previousLookup: 'Appwrite: Provjeri postojeći WhatsApp follow-up',
  notSent: 'IF: WhatsApp follow-up nije poslan?',
  candidate: 'Set: Pripremi WhatsApp za slanje',
  send: 'OpenWA: Pošalji WhatsApp Follow-up1',
  log: 'Appwrite: Evidentiraj WhatsApp u Dnevnik1',
  loop: 'Loop Over Obrađene Kontakte1',
};

function assertConfig() {
  const missing = [
    ['N8N_BASE_URL', n8nBaseUrl],
    ['N8N_API_KEY', n8nApiKey],
    ['N8N_WORKFLOW_ID', workflowId],
    ['WHATSAPP_API_KEY', whatsappApiKey],
  ].filter(([, value]) => !value).map(([name]) => name);
  if (missing.length) throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
}

async function n8nRequest(endpoint, options = {}) {
  const response = await fetch(`${n8nBaseUrl}${endpoint}`, {
    ...options,
    headers: { 'X-N8N-API-KEY': n8nApiKey, 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  if (!response.ok) throw new Error(`${options.method || 'GET'} ${endpoint} failed with HTTP ${response.status}`);
  const body = await response.text();
  return body ? JSON.parse(body) : null;
}

function getNode(workflow, name) {
  const node = workflow.nodes.find(node => node.name === name);
  if (!node) throw new Error(`Missing workflow node: ${name}`);
  return node;
}

function mainConnections(workflow, source) {
  workflow.connections[source] ||= { main: [[]] };
  workflow.connections[source].main ||= [[]];
  return workflow.connections[source].main;
}

function setEdges(workflow, source, index, edges) {
  const main = mainConnections(workflow, source);
  while (main.length <= index) main.push([]);
  main[index] = edges;
}

function addNode(workflow, node) {
  const existing = workflow.nodes.find(item => item.name === node.name);
  if (existing) return existing;
  workflow.nodes.push(node);
  return node;
}

function appwriteBase(workflow) {
  const company = getNode(workflow, names.company);
  const match = String(company.parameters.url).match(/https:\/\/[^']+\/v1\/databases\/[^/]+/);
  if (!match) throw new Error('Could not derive the Appwrite database URL.');
  return match[0];
}

async function getActiveSessionId(workflow) {
  const sendNode = getNode(workflow, names.send);
  const oldUrl = sendNode.parameters.url;
  const match = oldUrl.match(/^(https:\/\/[^/]+)\/api\/sessions\//);
  if (!match) throw new Error('Could not derive the OpenWA API base URL.');
  const response = await fetch(`${match[1]}/api/sessions`, { headers: { 'x-api-key': whatsappApiKey } });
  if (!response.ok) throw new Error(`OpenWA sessions lookup failed with HTTP ${response.status}`);
  const data = await response.json();
  const sessions = Array.isArray(data) ? data : data.sessions || data.data || [];
  const active = sessions.find(session => ['ready', 'active', 'connected'].includes(String(session.status || session.state || '').toLowerCase()));
  if (!active?.id) throw new Error('No active OpenWA session is available. Scan the QR code first.');
  return { apiBase: match[1], sessionId: active.id };
}

function createValidPhoneNode(company) {
  return {
    id: crypto.randomUUID(),
    name: names.validPhone,
    type: 'n8n-nodes-base.if',
    typeVersion: 2.2,
    position: [company.position[0] + 320, company.position[1]],
    parameters: {
      conditions: {
        options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 2 },
        conditions: [{
          id: 'valid-bih-whatsapp-number',
          leftValue: "={{ (() => { const phones = $json.phones; const list = Array.isArray(phones) ? phones : (typeof phones === 'string' ? phones.split(/[,;\\s\\/]+/) : []); return list.some(phone => { let digits = String(phone || '').replace(/\\D/g, ''); if (digits.startsWith('0')) digits = '387' + digits.slice(1); return /^3876\\d{7}$/.test(digits); }); })() }}",
          rightValue: true,
          operator: { type: 'boolean', operation: 'equals' },
        }],
        combinator: 'and',
      },
      options: {},
    },
  };
}

function createPreviousLookupNode(company, base) {
  return {
    id: crypto.randomUUID(),
    name: names.previousLookup,
    type: 'n8n-nodes-base.httpRequest',
    typeVersion: 4.2,
    position: [company.position[0] + 640, company.position[1]],
    parameters: {
      url: `${base}/collections/contact_logs/documents`,
      sendQuery: true,
      queryParameters: {
        parameters: [
          { name: 'queries[0]', value: JSON.stringify({ method: 'equal', attribute: 'channel', values: ['WhatsApp'] }) },
          { name: 'queries[1]', value: "={{ (() => { const log = $('IF: Spreman za WhatsApp (Prošlo 4 dana)?1').item.json.log || {}; const company = log.company?.$id || log.company || ''; return JSON.stringify({ method: 'equal', attribute: 'company', values: [company || '__no_company__'] }); })() }}" },
          { name: 'queries[2]', value: JSON.stringify({ method: 'equal', attribute: 'status', values: ['Poslano'] }) },
          { name: 'queries[3]', value: JSON.stringify({ method: 'limit', values: [1] }) },
        ],
      },
      sendHeaders: true,
      headerParameters: { parameters: JSON.parse(JSON.stringify(company.parameters.headerParameters.parameters)) },
      options: {},
    },
  };
}

function createNotSentNode(previousLookup) {
  return {
    id: crypto.randomUUID(),
    name: names.notSent,
    type: 'n8n-nodes-base.if',
    typeVersion: 2.2,
    position: [previousLookup.position[0] + 320, previousLookup.position[1]],
    parameters: {
      conditions: {
        options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 2 },
        conditions: [{
          id: 'no-successful-whatsapp-followup',
          leftValue: '={{ Number($json.total || 0) }}',
          rightValue: 0,
          operator: { type: 'number', operation: 'equals' },
        }],
        combinator: 'and',
      },
      options: {},
    },
  };
}

function createCandidateNode(notSent) {
  return {
    id: crypto.randomUUID(),
    name: names.candidate,
    type: 'n8n-nodes-base.set',
    typeVersion: 3.4,
    position: [notSent.position[0] + 320, notSent.position[1]],
    parameters: {
      mode: 'raw',
      jsonOutput: "={{ (() => { const log = $('IF: Spreman za WhatsApp (Prošlo 4 dana)?1').item.json.log || {}; const company = $('IF: Validan BiH WhatsApp broj?').item.json || {}; const phones = Array.isArray(company.phones) ? company.phones : (typeof company.phones === 'string' ? company.phones.split(/[,;\\s\\/]+/) : []); let digits = ''; for (const phone of phones) { let value = String(phone || '').replace(/\\D/g, ''); if (value.startsWith('0')) value = '387' + value.slice(1); if (/^3876\\d{7}$/.test(value)) { digits = value; break; } } if (!digits) throw new Error('No valid BiH mobile number is available.'); const companyName = String(company.company_name || 'vašu kompaniju').replace(/[\\[\\]\\(\\){}]/g, '').trim(); const text = `Pozdrav, javljamo se ispred ED Vision tima. Prije par dana smo vam na email poslali kratku analizu i nekoliko ideja kako unaprijediti online prisustvo i broj upita za ${companyName}. Da li biste bili otvoreni za kratak, neobavezujući razgovor ove sedmice da vam ukratko predstavimo smjernice?`; return { log, company, phone: digits, chatId: digits + '@c.us', text }; })() }}",
      options: {},
    },
  };
}

function applyHardening(workflow, session) {
  const ready = getNode(workflow, names.ready);
  const company = getNode(workflow, names.company);
  const send = getNode(workflow, names.send);
  const log = getNode(workflow, names.log);
  const loop = getNode(workflow, names.loop);
  const base = appwriteBase(workflow);

  const conditions = ready.parameters.conditions.conditions;
  const needed = [
    ['wa-no-reply', '={{ Boolean($json.has_replied) }}', false],
    ['wa-no-bounce', '={{ Boolean($json.is_bounced) }}', false],
  ];
  for (const [id, leftValue, rightValue] of needed) {
    if (!conditions.some(condition => condition.id === id)) {
      conditions.push({ id, leftValue, rightValue, operator: { type: 'boolean', operation: 'equals' } });
    }
  }

  delete company.onError;
  if (company.parameters.options?.response?.response) delete company.parameters.options.response.response.neverError;
  delete send.onError;
  send.parameters.options = {};
  send.parameters.url = `${session.apiBase}/api/sessions/${session.sessionId}/messages/send-text`;

  const validPhone = addNode(workflow, createValidPhoneNode(company));
  const previousLookup = addNode(workflow, createPreviousLookupNode(company, base));
  const notSent = addNode(workflow, createNotSentNode(previousLookup));
  const candidate = addNode(workflow, createCandidateNode(notSent));

  send.parameters.jsonBody = '={{ JSON.stringify({ chatId: $json.chatId, text: $json.text }) }}';
  log.parameters.jsonBody = "={{ (() => { const candidate = $('Set: Pripremi WhatsApp za slanje').item.json; const log = candidate.log || {}; const company = candidate.company || {}; return JSON.stringify({ documentId: 'unique()', data: { lead: log.lead?.$id || log.lead || 'nepoznato', company: company.$id || log.company?.$id || log.company || 'nepoznato', channel: 'WhatsApp', recipient: candidate.phone, subject: 'WhatsApp Follow-up podsjetnik', content: candidate.text, status: 'Poslano', outcome: 'Poslat WhatsApp podsjetnik', contacted_at: new Date().toISOString() } }); })() }}";
  if (log.parameters.options?.response?.response) delete log.parameters.options.response.response.neverError;

  setEdges(workflow, ready.name, 0, [{ node: company.name, type: 'main', index: 0 }]);
  setEdges(workflow, company.name, 0, [{ node: validPhone.name, type: 'main', index: 0 }]);
  setEdges(workflow, validPhone.name, 0, [{ node: previousLookup.name, type: 'main', index: 0 }]);
  setEdges(workflow, validPhone.name, 1, [{ node: loop.name, type: 'main', index: 0 }]);
  setEdges(workflow, previousLookup.name, 0, [{ node: notSent.name, type: 'main', index: 0 }]);
  setEdges(workflow, notSent.name, 0, [{ node: candidate.name, type: 'main', index: 0 }]);
  setEdges(workflow, notSent.name, 1, [{ node: loop.name, type: 'main', index: 0 }]);
  setEdges(workflow, candidate.name, 0, [{ node: send.name, type: 'main', index: 0 }]);
  setEdges(workflow, send.name, 0, [{ node: log.name, type: 'main', index: 0 }]);
  setEdges(workflow, log.name, 0, [{ node: loop.name, type: 'main', index: 0 }]);
}

function verify(workflow, session) {
  const ready = getNode(workflow, names.ready);
  const send = getNode(workflow, names.send);
  const conditions = ready.parameters.conditions.conditions;
  if (!conditions.some(condition => condition.id === 'wa-no-reply') || !conditions.some(condition => condition.id === 'wa-no-bounce')) {
    throw new Error('Reply and bounce guards are missing from the WhatsApp condition.');
  }
  for (const name of [names.company, names.send, names.log]) {
    const node = getNode(workflow, name);
    if (node.onError || node.parameters.options?.response?.response?.neverError === true) {
      throw new Error(`Error handling is still unsafe on ${name}.`);
    }
  }
  if (!send.parameters.url.includes(session.sessionId) || send.parameters.jsonBody.includes('38761306774')) {
    throw new Error('OpenWA session or phone fallback verification failed.');
  }
  for (const name of [names.validPhone, names.previousLookup, names.notSent, names.candidate]) getNode(workflow, name);
  const validPhoneTargets = (workflow.connections[names.validPhone]?.main?.[0] || []).map(edge => edge.node);
  const duplicateTargets = (workflow.connections[names.notSent]?.main?.[1] || []).map(edge => edge.node);
  if (!validPhoneTargets.includes(names.previousLookup) || !duplicateTargets.includes(names.loop)) {
    throw new Error('WhatsApp validation/idempotency connections could not be verified.');
  }
}

function payload(workflow) {
  return { name: workflow.name, nodes: workflow.nodes, connections: workflow.connections, settings: workflow.settings || {} };
}

function backup(workflow) {
  const directory = path.join(__dirname, '..', 'n8n', 'backups');
  const file = path.join(directory, `cloud-before-whatsapp-hardening-${workflowId}-${new Date().toISOString().replace(/[:.]/g, '-')}.local.json`);
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(workflow, null, 2)}\n`, { flag: 'wx' });
  return file;
}

async function setActive(active) {
  return n8nRequest(`/api/v1/workflows/${workflowId}/${active ? 'activate' : 'deactivate'}`, { method: 'POST' });
}

async function update(workflow) {
  return n8nRequest(`/api/v1/workflows/${workflowId}`, { method: 'PUT', body: JSON.stringify(payload(workflow)) });
}

function updateLocal(session) {
  const workflow = JSON.parse(fs.readFileSync(localWorkflowPath, 'utf8'));
  applyHardening(workflow, session);
  verify(workflow, session);
  fs.writeFileSync(localWorkflowPath, `${JSON.stringify(workflow, null, 2)}\n`);
  execFileSync(process.execPath, [path.join(__dirname, 'sanitize-github-workflow.js')], { stdio: 'inherit' });
}

async function main() {
  assertConfig();
  const workflow = await n8nRequest(`/api/v1/workflows/${workflowId}`);
  const session = await getActiveSessionId(workflow);
  const wasActive = Boolean(workflow.active);
  const backupFile = backup(workflow);
  console.log(`Cloud backup created: ${path.relative(path.join(__dirname, '..'), backupFile)}`);
  applyHardening(workflow, session);
  verify(workflow, session);
  let changed = false;
  try {
    if (wasActive) await setActive(false);
    await update(workflow);
    changed = true;
    if (wasActive) await setActive(true);
    const verified = await n8nRequest(`/api/v1/workflows/${workflowId}`);
    verify(verified.activeVersion || verified, session);
    if (wasActive && (!verified.active || verified.versionId !== verified.activeVersionId)) throw new Error('Active version verification failed.');
    updateLocal(session);
    console.log('WhatsApp follow-up flow hardened and connected to the active OpenWA session.');
  } catch (error) {
    if (changed) await update(JSON.parse(fs.readFileSync(backupFile, 'utf8')));
    if (wasActive) await setActive(true);
    throw error;
  }
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });
