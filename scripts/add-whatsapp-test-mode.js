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

function find(workflow, name) {
  const node = workflow.nodes.find((item) => item.name === name);
  if (!node) throw new Error(`Nedostaje node: ${name}`);
  return node;
}

(async () => {
  const workflow = await api(`/api/v1/workflows/${workflowId}`);
  if (workflow.active) throw new Error('WhatsApp DRAFT mora ostati ugašen tokom konfiguracije.');
  const webhook = find(workflow, 'Webhook: Ručni Follow-up1');
  const query = find(workflow, 'Appwrite: Uzmi poslata pisma za provjeru1');
  const send = find(workflow, 'OpenWA: Pošalji WhatsApp Follow-up1');
  const existingTest = workflow.nodes.find((node) => node.name === 'IF: WhatsApp test mode?');
  if (existingTest) {
    console.log(JSON.stringify({ mode: 'already-configured', active: workflow.active }, null, 2));
    return;
  }

  const optIn = find(workflow, 'IF: WhatsApp opt-in potvrđen');
  const testIf = structuredClone(optIn);
  testIf.id = randomUUID();
  testIf.name = 'IF: WhatsApp test mode?';
  testIf.position = [-40400, 21000];
  testIf.parameters.conditions.conditions[0].id = randomUUID();
  testIf.parameters.conditions.conditions[0].leftValue = '={{ Boolean($json.body?.testMode || $json.testMode) }}';

  const testPayload = {
    id: randomUUID(),
    name: 'Set: Pripremi WhatsApp test',
    type: 'n8n-nodes-base.set',
    typeVersion: 3.4,
    position: [-40150, 21000],
    parameters: {
      mode: 'raw',
      jsonOutput: `={{ (() => {
  const body = $json.body || $json || {};
  let phone = String(body.testPhone || '').replace(/\\D/g, '');
  if (phone.startsWith('0')) phone = '387' + phone.slice(1);
  if (!/^3876\\d{7}$/.test(phone)) throw new Error('testPhone mora biti validan BiH mobilni broj.');
  return {
    test_mode: true,
    phone,
    chatId: phone + '@c.us',
    text: 'Test ED Vision: WhatsApp test mode radi. Ova poruka nije dio automatskog follow-upa.'
  };
})() }}`,
      options: {},
    },
  };

  const sendBase = send.parameters.url.split('/messages/send-text')[0];
  const check = structuredClone(send);
  check.id = randomUUID();
  check.name = 'OpenWA: Provjeri WhatsApp test broj';
  check.position = [-39900, 21000];
  check.parameters.method = 'GET';
  check.parameters.url = `={{ '${sendBase}/contacts/check/' + $('Set: Pripremi WhatsApp test').item.json.phone }}`;
  delete check.parameters.sendBody;
  delete check.parameters.specifyBody;
  delete check.parameters.jsonBody;
  check.parameters.options = { timeout: 30000, response: { response: { neverError: true } } };

  const resolved = {
    id: randomUUID(),
    name: 'Set: Pripremi WhatsApp test ID',
    type: 'n8n-nodes-base.set',
    typeVersion: 3.4,
    position: [-39650, 21000],
    parameters: {
      mode: 'raw',
      jsonOutput: "={{ ({ chatId: $('OpenWA: Provjeri WhatsApp test broj').item.json.whatsappId || $('Set: Pripremi WhatsApp test').item.json.chatId, text: $('Set: Pripremi WhatsApp test').item.json.text }) }}",
      options: {},
    },
  };

  workflow.nodes.push(testIf, testPayload, check, resolved);
  workflow.connections[webhook.name] = { main: [[{ node: testIf.name, type: 'main', index: 0 }]] };
  workflow.connections[testIf.name] = {
    main: [[{ node: testPayload.name, type: 'main', index: 0 }], [{ node: query.name, type: 'main', index: 0 }]],
  };
  workflow.connections[testPayload.name] = { main: [[{ node: check.name, type: 'main', index: 0 }]] };
  workflow.connections[check.name] = { main: [[{ node: resolved.name, type: 'main', index: 0 }]] };
  workflow.connections[resolved.name] = { main: [[{ node: send.name, type: 'main', index: 0 }]] };

  await api(`/api/v1/workflows/${workflowId}`, {
    method: 'PUT',
    body: JSON.stringify({ name: workflow.name, nodes: workflow.nodes, connections: workflow.connections, settings: workflow.settings }),
  });
  const verified = await api(`/api/v1/workflows/${workflowId}`);
  console.log(JSON.stringify({
    mode: 'applied',
    active: verified.active,
    nodes: verified.nodes.length,
    testMode: verified.nodes.some((node) => node.name === testIf.name),
    productionBranchPreserved: Boolean(verified.connections[testIf.name]?.main?.[1]?.[0]?.node === query.name),
  }, null, 2));
})().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
