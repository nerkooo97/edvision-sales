/* eslint-disable @typescript-eslint/no-require-imports */
const { loadEnvConfig } = require('@next/env');
const { mkdir, writeFile } = require('node:fs/promises');
const path = require('node:path');

loadEnvConfig(process.cwd());

const baseUrl = (process.env.N8N_BASE_URL || '').replace(/\/+$/, '');
const apiKey = process.env.N8N_API_KEY || '';
const workflowExports = [
  ['upyXzV2Y3X2zTHzZ', 'ED Vision - Email Outreach.local.json'],
  ['bghHYeabIeBsjXlm', 'ED Vision - Email Open Tracking.local.json'],
  ['rrvKU5OREOBU8twq', 'ED Vision - Inbox Processor.local.json'],
];

if (!baseUrl || !apiKey) throw new Error('n8n API konfiguracija nije potpuna.');

(async () => {
  const outputDirectory = path.join(process.cwd(), 'n8n');
  await mkdir(outputDirectory, { recursive: true });

  const results = [];
  for (const [id, filename] of workflowExports) {
    const response = await fetch(`${baseUrl}/api/v1/workflows/${encodeURIComponent(id)}`, {
      headers: { 'X-N8N-API-KEY': apiKey },
      signal: AbortSignal.timeout(30000),
    });
    if (!response.ok) throw new Error(`Export ${id} nije uspio: HTTP ${response.status}`);
    const workflow = await response.json();
    await writeFile(path.join(outputDirectory, filename), `${JSON.stringify(workflow, null, 2)}\n`, {
      encoding: 'utf8',
      mode: 0o600,
    });
    results.push({ id: workflow.id, name: workflow.name, active: workflow.active, nodes: workflow.nodes?.length, filename });
  }

  console.log(JSON.stringify(results, null, 2));
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
