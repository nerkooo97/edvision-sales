const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const baseUrl = (process.env.N8N_BASE_URL || '').replace(/\/+$/, '');
const apiKey = process.env.N8N_API_KEY || '';
const workflowId = process.env.N8N_WORKFLOW_ID || '';
const timeZone = 'Europe/Sarajevo';

if (!baseUrl || !apiKey || !workflowId) {
  throw new Error('Missing n8n configuration in .env.local.');
}

function dateParts(date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  return Object.fromEntries(parts.filter(part => part.type !== 'literal').map(part => [part.type, part.value]));
}

function localDateKey(date) {
  const parts = dateParts(date);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

async function api(endpoint) {
  const response = await fetch(`${baseUrl}${endpoint}`, {
    headers: { 'X-N8N-API-KEY': apiKey },
  });
  if (!response.ok) throw new Error(`n8n API returned HTTP ${response.status}.`);
  return response.json();
}

async function main() {
  const expectedDate = process.argv[2] || localDateKey(new Date());
  if (!/^\d{4}-\d{2}-\d{2}$/.test(expectedDate)) {
    throw new Error('Usage: node scripts/check-0700-schedule.js [YYYY-MM-DD]');
  }

  const response = await api(`/api/v1/executions?limit=100&workflowId=${encodeURIComponent(workflowId)}`);
  const executions = response.data || response;
  const candidate = executions.find(execution => {
    if (execution.workflowId !== workflowId || execution.mode !== 'trigger' || !execution.startedAt) return false;
    const parts = dateParts(new Date(execution.startedAt));
    return localDateKey(new Date(execution.startedAt)) === expectedDate && parts.hour === '07' && Number(parts.minute) <= 10;
  });

  if (!candidate) {
    console.error(`SCHEDULE_0700_MISSING date=${expectedDate} timezone=${timeZone}`);
    process.exitCode = 2;
    return;
  }

  console.log(
    `SCHEDULE_0700_OK date=${expectedDate} execution=${candidate.id} status=${candidate.status} startedAt=${candidate.startedAt}`
  );
  if (candidate.status !== 'success') process.exitCode = 1;
}

main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
