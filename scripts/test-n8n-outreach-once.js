/* eslint-disable @typescript-eslint/no-require-imports */
const { loadEnvConfig } = require('@next/env');

loadEnvConfig(process.cwd());

const baseUrl = (process.env.N8N_BASE_URL || '').replace(/\/+$/, '');
const apiKey = process.env.N8N_API_KEY || '';
const workflowId = process.env.N8N_WORKFLOW_ID || '';
const webhookUrl = process.env.N8N_WEBHOOK_URL || '';
const headers = { 'Content-Type': 'application/json', 'X-N8N-API-KEY': apiKey };
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

if (!baseUrl || !apiKey || !workflowId || !webhookUrl) {
  throw new Error('n8n test konfiguracija nije potpuna.');
}

async function api(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: { ...headers, ...(options.headers || {}) },
    signal: AbortSignal.timeout(30000),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`${response.status}: ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : {};
}

async function save(workflow) {
  return api(`/api/v1/workflows/${encodeURIComponent(workflowId)}`, {
    method: 'PUT',
    body: JSON.stringify({
      name: workflow.name,
      nodes: workflow.nodes,
      connections: workflow.connections,
      settings: workflow.settings,
    }),
  });
}

(async () => {
  const original = await api(`/api/v1/workflows/${encodeURIComponent(workflowId)}`);
  if (original.active) throw new Error('Workflow mora biti ugašen prije kontrolisanog testa.');

  const running = await Promise.all(['running', 'waiting'].map((status) =>
    api(`/api/v1/executions?workflowId=${encodeURIComponent(workflowId)}&status=${status}&limit=1`)
  ));
  if (running.some((result) => (result.data || []).length > 0)) {
    throw new Error('Postoji aktivna ili čekajuća egzekucija.');
  }

  const testWorkflow = structuredClone(original);
  const imap = testWorkflow.nodes.find((item) => item.name === 'IMAP: Povuci nove emailove iz Inboxa1');
  if (!imap) throw new Error('IMAP trigger nije pronađen.');
  imap.disabled = true;

  let activated = false;
  try {
    await save(testWorkflow);
    const active = await api(`/api/v1/workflows/${encodeURIComponent(workflowId)}/activate`, { method: 'POST' });
    if (!active.active) throw new Error('Aktivacija nije potvrđena.');
    activated = true;
    await sleep(10000);

    const webhookResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dailyLimit: 1, delayMinutes: 10, source: 'codex-controlled-test' }),
      signal: AbortSignal.timeout(30000),
    });
    const webhookText = await webhookResponse.text();
    if (!webhookResponse.ok) throw new Error(`Webhook ${webhookResponse.status}: ${webhookText.slice(0, 300)}`);
    console.log(JSON.stringify({ webhookStatus: webhookResponse.status, accepted: true }));
  } finally {
    if (activated) {
      await api(`/api/v1/workflows/${encodeURIComponent(workflowId)}/deactivate`, { method: 'POST' });
    }
    await save(original);
    console.log(JSON.stringify({ workflowActive: false, imapRestored: true }));
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
