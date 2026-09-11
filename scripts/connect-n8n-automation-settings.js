/* eslint-disable @typescript-eslint/no-require-imports */
const { loadEnvConfig } = require('@next/env');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

loadEnvConfig(process.cwd());

const baseUrl = process.env.N8N_BASE_URL;
const apiKey = process.env.N8N_API_KEY;
const workflowId = process.env.N8N_WORKFLOW_ID;
const appwriteEndpoint = process.env.APPWRITE_ENDPOINT || process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const databaseId = process.env.APPWRITE_DATABASE_ID || process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;
const apply = process.argv.includes('--apply');

if (!baseUrl || !apiKey || !workflowId || !appwriteEndpoint || !databaseId) {
  throw new Error('Nedostaje n8n ili Appwrite konfiguracija.');
}

async function request(route, options = {}) {
  const response = await fetch(`${baseUrl}${route}`, {
    ...options,
    headers: {
      'X-N8N-API-KEY': apiKey,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  if (!response.ok) throw new Error(`${options.method || 'GET'} ${route}: ${response.status} ${await response.text()}`);
  return response.json();
}

function findNode(workflow, name) {
  const result = workflow.nodes.find((node) => node.name === name);
  if (!result) throw new Error(`Nedostaje node: ${name}`);
  return result;
}

function connectTo(workflow, sourceName, targetName) {
  workflow.connections[sourceName] = {
    main: [[{ node: targetName, type: 'main', index: 0 }]],
  };
}

function configure(workflow) {
  const companies = findNode(workflow, 'Appwrite: Uzmi firme (companies)1');
  const wait = findNode(workflow, 'Wait (15m Pauza)');
  const settingsName = 'Appwrite: Učitaj automation settings';
  let settings = workflow.nodes.find((node) => node.name === settingsName);

  if (!settings) {
    const headers = structuredClone(companies.parameters.headerParameters);
    settings = {
      id: crypto.randomUUID(),
      name: settingsName,
      type: 'n8n-nodes-base.httpRequest',
      typeVersion: companies.typeVersion || 4.2,
      position: [companies.position[0] - 240, companies.position[1]],
      parameters: {
        url: `${appwriteEndpoint}/databases/${databaseId}/collections/automation_settings/documents/outreach`,
        sendHeaders: true,
        headerParameters: headers,
        options: { timeout: 10000 },
      },
    };
    workflow.nodes.push(settings);
  }

  const limitParameter = companies.parameters.queryParameters.parameters.find(
    (parameter) => parameter.name === 'queries[3]'
  );
  if (!limitParameter) throw new Error('Nedostaje companies limit query.');
  limitParameter.value = "={{ JSON.stringify({ method: 'limit', values: [Math.min(50, Math.max(1, Number((() => { try { return $('Webhook: Ručno Pokretanje1').first().json.body?.dailyLimit; } catch (_) { return null; } })() || $('Appwrite: Učitaj automation settings').first().json.daily_limit || 50)))] }) }}";
  wait.parameters.amount = "={{ Math.min(60, Math.max(10, Number((() => { try { return $('Webhook: Ručno Pokretanje1').first().json.body?.delayMinutes; } catch (_) { return null; } })() || $('Appwrite: Učitaj automation settings').first().json.delay_minutes || 15))) }}";

  connectTo(workflow, 'Schedule Trigger (07:00h dnevno)', settingsName);
  connectTo(workflow, 'Webhook: Ručno Pokretanje1', settingsName);
  connectTo(workflow, settingsName, companies.name);
  return workflow;
}

function validate(workflow) {
  const errors = [];
  const settings = workflow.nodes.find((node) => node.name === 'Appwrite: Učitaj automation settings');
  if (!settings?.parameters?.url?.includes('/automation_settings/documents/outreach')) errors.push('Settings URL nije ispravan.');
  for (const trigger of ['Schedule Trigger (07:00h dnevno)', 'Webhook: Ručno Pokretanje1']) {
    const target = workflow.connections[trigger]?.main?.[0]?.[0]?.node;
    if (target !== settings?.name) errors.push(`${trigger} ne vodi na centralne postavke.`);
  }
  const companyText = JSON.stringify(findNode(workflow, 'Appwrite: Uzmi firme (companies)1').parameters);
  const waitText = JSON.stringify(findNode(workflow, 'Wait (15m Pauza)').parameters);
  if (!companyText.includes('daily_limit')) errors.push('Limit ne čita daily_limit.');
  if (!waitText.includes('delay_minutes')) errors.push('Wait ne čita delay_minutes.');
  return errors;
}

(async () => {
  const current = await request(`/api/v1/workflows/${encodeURIComponent(workflowId)}`);
  const configured = configure(structuredClone(current));
  const errors = validate(configured);
  if (errors.length) throw new Error(errors.join(' '));

  if (!apply) {
    console.log(JSON.stringify({ mode: 'dry-run', workflowId, active: current.active, nodes: configured.nodes.length, validation: 'passed' }, null, 2));
    return;
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(process.cwd(), 'n8n', 'backups', `cloud-before-automation-settings-${workflowId}-${stamp}.local.json`);
  fs.writeFileSync(backupPath, JSON.stringify(current, null, 2));

  let updated = await request(`/api/v1/workflows/${encodeURIComponent(workflowId)}`, {
    method: 'PUT',
    body: JSON.stringify({
      name: configured.name,
      nodes: configured.nodes,
      connections: configured.connections,
      settings: configured.settings,
    }),
  });

  if (current.active && !updated.active) {
    updated = await request(`/api/v1/workflows/${encodeURIComponent(workflowId)}/activate`, { method: 'POST' });
  }

  const verified = await request(`/api/v1/workflows/${encodeURIComponent(workflowId)}`);
  const verifyErrors = validate(verified);
  if (current.active && !verified.active) verifyErrors.push('Workflow nije ostao aktivan.');
  if (verifyErrors.length) throw new Error(verifyErrors.join(' '));

  const localPath = path.join(process.cwd(), 'n8n', 'ED Vision - Email Outreach.local.json');
  fs.writeFileSync(localPath, JSON.stringify(verified, null, 2));
  console.log(JSON.stringify({
    mode: 'applied',
    workflowId,
    active: verified.active,
    nodes: verified.nodes.length,
    backup: path.relative(process.cwd(), backupPath),
    validation: 'passed',
  }, null, 2));
})().catch((error) => {
  console.error(error?.message || error);
  process.exitCode = 1;
});
