/* eslint-disable no-console */
const { loadEnvConfig } = require('@next/env');

loadEnvConfig(process.cwd());

const N8N_BASE_URL = process.env.N8N_BASE_URL?.replace(/\/$/, '');
const N8N_API_KEY = process.env.N8N_API_KEY;
const APPWRITE_ENDPOINT = (process.env.APPWRITE_ENDPOINT || '').replace(/\/$/, '');
const APPWRITE_PROJECT_ID = process.env.APPWRITE_PROJECT_ID;
const APPWRITE_DATABASE_ID = process.env.APPWRITE_DATABASE_ID;
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY;
const WORKFLOW_ID = 'rrvKU5OREOBU8twq';
const apply = process.argv.includes('--apply');

for (const [name, value] of Object.entries({ N8N_BASE_URL, N8N_API_KEY, APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, APPWRITE_DATABASE_ID, APPWRITE_API_KEY })) {
  if (!value) throw new Error(`Nedostaje ${name}.`);
}

const n8nHeaders = { 'X-N8N-API-KEY': N8N_API_KEY };
const appwriteHeaders = {
  'X-Appwrite-Project': APPWRITE_PROJECT_ID,
  'X-Appwrite-Key': APPWRITE_API_KEY,
  'Content-Type': 'application/json',
};

async function getJson(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) throw new Error(`${options.method || 'GET'} ${url}: ${response.status} ${await response.text()}`);
  return response.json();
}

function executionItems(execution) {
  const runData = execution.data?.resultData?.runData || {};
  return Object.values(runData)
    .flatMap((runs) => runs || [])
    .flatMap((run) => run.data?.main || [])
    .flatMap((outputs) => outputs || [])
    .map((item) => item?.json)
    .filter(Boolean);
}

function addressesFromBounce(email) {
  const raw = [email.from, email.subject, email.textPlain, email.text, email.textHtml, email.html, email.body, email.message, email.metadata]
    .filter((value) => value !== undefined && value !== null)
    .join('\n');
  const clean = (value) => value.toLowerCase().replace(/^[<\"']+|[>,;:\"']+$/g, '');
  const preferred = [...raw.matchAll(/(?:final-recipient|original-recipient)\s*[:;][^\r\n]*?([^\s<>]+@[^\s<>]+)/gi)]
    .map((match) => clean(match[1]));
  const addresses = [...raw.matchAll(/[^\s<>]+@[^\s<>]+/g)]
    .map((match) => clean(match[0]));
  const ignored = new Set(['edin.fejzic@ed-vision.net']);
  return [...new Set([...preferred, ...addresses])]
    .filter((address) => !ignored.has(address) && !address.startsWith('mailer-daemon@') && !address.startsWith('postmaster@'));
}

function isBounce(email) {
  const raw = JSON.stringify(email);
  return /mailer-daemon|postmaster|undelivered(?: mail)?|returned to sender|delivery (?:has )?failed|delivery status notification|failure notice|final-recipient:|original-recipient:|diagnostic-code:/i.test(raw);
}

async function listContactLogs(recipient) {
  const queries = [
    { method: 'equal', attribute: 'channel', values: ['Email'] },
    { method: 'equal', attribute: 'status', values: ['Poslano', 'Otvoreno', 'Otvorena'] },
    { method: 'equal', attribute: 'recipient', values: [recipient] },
    { method: 'orderDesc', attribute: '$createdAt' },
    { method: 'limit', values: [10] },
  ];
  const url = `${APPWRITE_ENDPOINT}/databases/${APPWRITE_DATABASE_ID}/collections/contact_logs/documents?${queries.map((query, index) => `queries[${index}]=${encodeURIComponent(JSON.stringify(query))}`).join('&')}`;
  const result = await getJson(url, { headers: appwriteHeaders });
  if ((result.documents || []).length) return result.documents;

  // Some older logs have a status value outside the original success set.
  // Fetch by recipient only, then let the caller decide whether it is safe to repair.
  const fallbackQueries = [
    { method: 'equal', attribute: 'channel', values: ['Email'] },
    { method: 'equal', attribute: 'recipient', values: [recipient] },
    { method: 'orderDesc', attribute: '$createdAt' },
    { method: 'limit', values: [10] },
  ];
  const fallbackUrl = `${APPWRITE_ENDPOINT}/databases/${APPWRITE_DATABASE_ID}/collections/contact_logs/documents?${fallbackQueries.map((query, index) => `queries[${index}]=${encodeURIComponent(JSON.stringify(query))}`).join('&')}`;
  return (await getJson(fallbackUrl, { headers: appwriteHeaders })).documents || [];
}

async function patchDocument(collection, id, data) {
  return getJson(`${APPWRITE_ENDPOINT}/databases/${APPWRITE_DATABASE_ID}/collections/${collection}/documents/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: appwriteHeaders,
    body: JSON.stringify({ data }),
  });
}

(async () => {
  const executions = (await getJson(`${N8N_BASE_URL}/api/v1/executions?workflowId=${WORKFLOW_ID}&limit=100&includeData=true`, { headers: n8nHeaders })).data || [];
  const bounceEmails = executions.flatMap(executionItems).filter(isBounce);
  const recipients = [...new Set(bounceEmails.flatMap(addressesFromBounce))];
  const repairs = [];

  for (const recipient of recipients) {
    const logs = await listContactLogs(recipient);
    for (const log of logs.filter((item) => ['Poslano', 'Otvoreno', 'Otvorena'].includes(item.status))) {
      repairs.push({
        recipient,
        logId: log.$id,
        leadId: typeof log.lead === 'object' ? log.lead?.$id : log.lead,
        previousLogStatus: log.status,
      });
      break;
    }
  }

  console.log(JSON.stringify({ mode: apply ? 'apply' : 'dry-run', executions: executions.length, bounceEmails: bounceEmails.length, recipients, repairs }, null, 2));
  if (!apply) return;

  for (const repair of repairs) {
    await patchDocument('contact_logs', repair.logId, {
      status: 'Greška',
      outcome: 'Email bounce detektovan retroaktivnom sanacijom Inboxa',
    });
    if (repair.leadId && repair.leadId !== 'nepoznato') {
      await patchDocument('leads', repair.leadId, { status: 'Greška - Nepostojeći email' });
    }
  }
  console.log(`Ažureno logova: ${repairs.length}`);
})().catch((error) => {
  console.error(error?.message || error);
  process.exitCode = 1;
});
