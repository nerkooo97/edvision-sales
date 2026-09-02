const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const n8nBaseUrl = (process.env.N8N_BASE_URL || '').replace(/\/+$/, '');
const n8nApiKey = process.env.N8N_API_KEY || '';
const workflowId = process.env.N8N_WORKFLOW_ID || '';
const appwriteEndpoint = (process.env.APPWRITE_ENDPOINT || '').replace(/\/+$/, '');
const appwriteProjectId = process.env.APPWRITE_PROJECT_ID || '';
const appwriteApiKey = process.env.APPWRITE_API_KEY || '';
const databaseId = process.env.APPWRITE_DATABASE_ID || '';
const replyNodeName = 'Appwrite: Ažuriraj Dnevnik -> Odgovoreno1';

const missing = [
  ['N8N_BASE_URL', n8nBaseUrl], ['N8N_API_KEY', n8nApiKey], ['N8N_WORKFLOW_ID', workflowId],
  ['APPWRITE_ENDPOINT', appwriteEndpoint], ['APPWRITE_PROJECT_ID', appwriteProjectId],
  ['APPWRITE_API_KEY', appwriteApiKey], ['APPWRITE_DATABASE_ID', databaseId],
].filter(([, value]) => !value).map(([name]) => name);
if (missing.length) throw new Error(`Missing environment variables: ${missing.join(', ')}`);

async function n8nRequest(endpoint) {
  const response = await fetch(`${n8nBaseUrl}${endpoint}`, {
    headers: { 'X-N8N-API-KEY': n8nApiKey },
  });
  if (!response.ok) throw new Error(`n8n ${endpoint} returned HTTP ${response.status}`);
  return response.json();
}

async function appwriteRequest(endpoint, options = {}) {
  const response = await fetch(`${appwriteEndpoint}${endpoint}`, {
    ...options,
    headers: {
      'X-Appwrite-Project': appwriteProjectId,
      'X-Appwrite-Key': appwriteApiKey,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Appwrite ${endpoint} returned HTTP ${response.status}`);
  return response.json();
}

function collectReplyLogIds(value, ids) {
  if (!value || typeof value !== 'object') return;
  if (Array.isArray(value)) {
    value.forEach((item) => collectReplyLogIds(item, ids));
    return;
  }
  if (value.$id && String(value.status || '') === 'Odgovoreno') ids.add(String(value.$id));
  Object.values(value).forEach((child) => collectReplyLogIds(child, ids));
}

async function main() {
  const list = await n8nRequest(`/api/v1/executions?limit=100&workflowId=${encodeURIComponent(workflowId)}&includeData=true`);
  const executions = list.data || list;
  const replyLogIds = new Set();
  let replyExecutions = 0;

  for (let index = 0; index < executions.length; index += 6) {
    const details = await Promise.all(executions.slice(index, index + 6).map(async (execution) => {
      if (execution.data?.resultData?.runData) return execution;
      return n8nRequest(`/api/v1/executions/${encodeURIComponent(execution.id)}?includeData=true`);
    }));
    for (const detail of details) {
    const nodeRuns = detail.data?.resultData?.runData?.[replyNodeName];
    if (!nodeRuns) continue;
    replyExecutions += 1;
    collectReplyLogIds(nodeRuns, replyLogIds);
    }
  }

  const candidates = [];
  for (const logId of replyLogIds) {
    const log = await appwriteRequest(`/v1/databases/${databaseId}/collections/contact_logs/documents/${encodeURIComponent(logId)}`);
    if (log && ['Otvoreno', 'Otvorena'].includes(String(log.status || ''))) candidates.push(log);
  }

  console.log(`REPLY_EXECUTIONS=${replyExecutions}`);
  console.log(`CONFIRMED_REPLY_LOGS=${replyLogIds.size}`);
  console.log(`OVERWRITTEN_REPLY_STATUSES=${candidates.length}`);
  if (candidates.length) {
    console.log(`CANDIDATE_LOG_IDS=${candidates.map((log) => log.$id).join(',')}`);
  }
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
