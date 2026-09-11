/* eslint-disable @typescript-eslint/no-require-imports */
const { loadEnvConfig } = require('@next/env');
const { randomUUID } = require('node:crypto');

loadEnvConfig(process.cwd());

const baseUrl = (process.env.N8N_BASE_URL || '').replace(/\/+$/, '');
const apiKey = process.env.N8N_API_KEY || '';
const workflowId = 'y8uMlQoxGAgSB4XX';
const headers = { 'Content-Type': 'application/json', 'X-N8N-API-KEY': apiKey };

if (!baseUrl || !apiKey) throw new Error('n8n API konfiguracija nije potpuna.');

async function api(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: { ...headers, ...(options.headers || {}) },
    signal: AbortSignal.timeout(30000),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`${path} HTTP ${response.status}: ${text.slice(0, 500)}`);
  return text ? JSON.parse(text) : {};
}

function findNode(workflow, name) {
  const node = workflow.nodes.find((item) => item.name === name);
  if (!node) throw new Error(`Nedostaje node: ${name}`);
  return node;
}

(async () => {
  const workflow = await api(`/api/v1/workflows/${workflowId}`);
  if (workflow.active) throw new Error('WhatsApp DRAFT workflow mora ostati ugašen.');

  const valid = findNode(workflow, 'IF: Validan BiH WhatsApp broj?');
  const existingCheck = findNode(workflow, 'Appwrite: Provjeri postojeći WhatsApp follow-up');
  const prepare = findNode(workflow, 'Set: Pripremi WhatsApp za slanje');
  const send = findNode(workflow, 'OpenWA: Pošalji WhatsApp Follow-up1');
  const loop = findNode(workflow, 'Loop Over Obrađene Kontakte1');

  const checkName = 'OpenWA: Provjeri WhatsApp broj';
  const existsName = 'IF: WhatsApp broj postoji?';
  const existingCheckNode = workflow.nodes.find((node) => node.name === checkName);
  const existingExistsNode = workflow.nodes.find((node) => node.name === existsName);
  if (existingCheckNode || existingExistsNode) {
    console.log(JSON.stringify({ mode: 'already-configured', active: workflow.active, nodes: workflow.nodes.length }, null, 2));
    return;
  }

  const openWaBaseUrl = send.parameters.url.split('/messages/send-text')[0];
  const check = structuredClone(send);
  check.id = randomUUID();
  check.name = checkName;
  check.position = [-37700, 20640];
  check.parameters.method = 'GET';
  check.parameters.url = `={{ (() => {
  const company = $('Appwrite: Dohvati Firmu za WhatsApp').item.json || {};
  const phones = Array.isArray(company.phones) ? company.phones : (typeof company.phones === 'string' ? company.phones.split(/[,;\\s\\/]+/) : []);
  let digits = '';
  for (const phone of phones) {
    let value = String(phone || '').replace(/\\D/g, '');
    if (value.startsWith('0')) value = '387' + value.slice(1);
    if (/^3876\\d{7}$/.test(value)) { digits = value; break; }
  }
  return '${openWaBaseUrl}/contacts/check/' + digits;
})() }}`;
  delete check.parameters.sendBody;
  delete check.parameters.specifyBody;
  delete check.parameters.jsonBody;
  check.parameters.options = { timeout: 30000, response: { response: { neverError: true } } };

  const exists = {
    id: randomUUID(),
    name: existsName,
    type: 'n8n-nodes-base.if',
    typeVersion: 2.2,
    position: [-37400, 20640],
    parameters: {
      conditions: {
        options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 2 },
        conditions: [{ id: randomUUID(), leftValue: '={{ Boolean($json.exists) }}', rightValue: true, operator: { type: 'boolean', operation: 'equals' } }],
        combinator: 'and',
      },
      options: {},
    },
  };

  const body = prepare.parameters.jsonOutput;
  const oldChatId = "chatId: digits + '@c.us'";
  const newChatId = "chatId: $('OpenWA: Provjeri WhatsApp broj').item.json.whatsappId || (digits + '@c.us')";
  if (typeof body !== 'string' || !body.includes(oldChatId)) throw new Error('Chat ID expression nije pronađen.');
  prepare.parameters.jsonOutput = body.replace(oldChatId, newChatId);

  workflow.nodes.push(check, exists);
  workflow.connections[valid.name] = {
    main: [[{ node: check.name, type: 'main', index: 0 }], [{ node: loop.name, type: 'main', index: 0 }]],
  };
  workflow.connections[check.name] = { main: [[{ node: exists.name, type: 'main', index: 0 }]] };
  workflow.connections[exists.name] = {
    main: [[{ node: existingCheck.name, type: 'main', index: 0 }], [{ node: loop.name, type: 'main', index: 0 }]],
  };

  await api(`/api/v1/workflows/${workflowId}`, {
    method: 'PUT',
    body: JSON.stringify({ name: workflow.name, nodes: workflow.nodes, connections: workflow.connections, settings: workflow.settings }),
  });

  const verified = await api(`/api/v1/workflows/${workflowId}`);
  const verifiedPrepare = findNode(verified, 'Set: Pripremi WhatsApp za slanje');
  console.log(JSON.stringify({
    mode: 'applied',
    active: verified.active,
    nodes: verified.nodes.length,
    addedNodes: [checkName, existsName],
    resolvesWhatsappId: verifiedPrepare.parameters.jsonOutput.includes('whatsappId'),
  }, null, 2));
})().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
