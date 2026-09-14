/* eslint-disable @typescript-eslint/no-require-imports */
const { loadEnvConfig } = require('@next/env');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

loadEnvConfig(process.cwd());
const baseUrl = process.env.N8N_BASE_URL;
const apiKey = process.env.N8N_API_KEY;
const workflowId = 'rrvKU5OREOBU8twq';
const apply = process.argv.includes('--apply');
if (!baseUrl || !apiKey) throw new Error('Nedostaje n8n konfiguracija.');

async function request(route, options = {}) {
  const response = await fetch(`${baseUrl}${route}`, {
    ...options,
    headers: { 'X-N8N-API-KEY': apiKey, 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  if (!response.ok) throw new Error(`${options.method || 'GET'} ${route}: ${response.status} ${await response.text()}`);
  return response.json();
}

const queryExpression = `={{ (() => {
  const email = $json || {};
  const raw = [email.from, email.subject, email.textPlain, email.text, email.textHtml, email.html, email.body, email.message, email.metadata]
    .filter((value) => value !== undefined && value !== null)
    .join(' ');
  const preferred = Array.from(raw.matchAll(/(?:final-recipient|original-recipient)\\s*[:;][^\\r\\n]*?([A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,})/gi))
    .map((match) => match[1].toLowerCase());
  const addresses = Array.from(raw.matchAll(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}/gi))
    .map((match) => match[0].toLowerCase());
  const ignored = new Set(['edin.fejzic@ed-vision.net']);
  const candidates = [...new Set([...preferred, ...addresses])]
    .filter((address) => !ignored.has(address) && !address.startsWith('mailer-daemon@') && !address.startsWith('postmaster@'));
  return JSON.stringify({ method: 'equal', attribute: 'recipient', values: candidates.length ? candidates : ['__no_matching_recipient__'] });
})() }}`;

const bounceExpression = `={{ (() => {
  const email = $('IMAP: Povuci nove emailove iz Inboxa1').item.json || {};
  const raw = JSON.stringify(email);
  return /mailer-daemon|postmaster|undelivered(?: mail)?|returned to sender|delivery (?:has )?failed|delivery status notification|failure notice|final-recipient:|original-recipient:|diagnostic-code:/i.test(raw);
})() }}`;

(async () => {
  const current = await request(`/api/v1/workflows/${workflowId}`);
  const workflow = structuredClone(current);
  const lookup = workflow.nodes.find((node) => node.name === 'Appwrite: Pronađi jedan kontakt log');
  const bounce = workflow.nodes.find((node) => node.name === 'IF: Bounce poruka');
  if (!lookup || !bounce) throw new Error('Bounce nodes nisu pronađeni.');
  const query = lookup.parameters.queryParameters.parameters.find((item) => item.name === 'queries[2]');
  if (!query) throw new Error('Recipient query nije pronađen.');
  query.value = queryExpression;
  bounce.parameters.conditions.conditions[0].leftValue = bounceExpression;

  if (!apply) {
    console.log(JSON.stringify({ mode: 'dry-run', workflowId, active: current.active, validation: 'passed' }, null, 2));
    return;
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backup = path.join(process.cwd(), 'n8n', 'backups', `cloud-before-inbox-bounce-hardening-${workflowId}-${stamp}.local.json`);
  fs.writeFileSync(backup, JSON.stringify(current, null, 2));
  let updated = await request(`/api/v1/workflows/${workflowId}`, {
    method: 'PUT',
    body: JSON.stringify({ name: workflow.name, nodes: workflow.nodes, connections: workflow.connections, settings: workflow.settings }),
  });
  if (current.active && !updated.active) {
    updated = await request(`/api/v1/workflows/${workflowId}/activate`, { method: 'POST' });
  }
  const verified = await request(`/api/v1/workflows/${workflowId}`);
  if (current.active && !verified.active) throw new Error('Inbox Processor nije ostao aktivan.');
  const local = path.join(process.cwd(), 'n8n', 'ED Vision - Inbox Processor.local.json');
  fs.writeFileSync(local, JSON.stringify(verified, null, 2));
  console.log(JSON.stringify({ mode: 'applied', workflowId, active: verified.active, backup: path.relative(process.cwd(), backup), validation: 'passed' }, null, 2));
})().catch((error) => { console.error(error?.message || error); process.exitCode = 1; });
