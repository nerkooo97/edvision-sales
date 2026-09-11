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

(async () => {
  const workflow = await api(`/api/v1/workflows/${workflowId}`);
  if (workflow.active) throw new Error('DRAFT workflow mora ostati ugašen tokom izmjene.');
  const send = workflow.nodes.find((node) => node.name === 'OpenWA: Pošalji WhatsApp Follow-up1');
  const resolved = workflow.nodes.find((node) => node.name === 'Set: Pripremi WhatsApp test ID');
  if (!send || !resolved) throw new Error('Test ogranak nije pronađen.');

  const testName = 'OpenWA: Pošalji WhatsApp test';
  let testSend = workflow.nodes.find((node) => node.name === testName);
  if (!testSend) {
    testSend = structuredClone(send);
    testSend.id = randomUUID();
    testSend.name = testName;
    testSend.position = [-39400, 21000];
    workflow.nodes.push(testSend);
  }

  workflow.connections[resolved.name] = { main: [[{ node: testSend.name, type: 'main', index: 0 }]] };
  delete workflow.connections[testSend.name];

  await api(`/api/v1/workflows/${workflowId}`, {
    method: 'PUT',
    body: JSON.stringify({ name: workflow.name, nodes: workflow.nodes, connections: workflow.connections, settings: workflow.settings }),
  });
  const verified = await api(`/api/v1/workflows/${workflowId}`);
  console.log(JSON.stringify({
    active: verified.active,
    testSendNode: verified.nodes.some((node) => node.name === testName),
    testEndsAfterSend: !verified.connections[testName],
    productionSendPreserved: Boolean(verified.connections['IF: WhatsApp broj postoji?']),
  }, null, 2));
})().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
