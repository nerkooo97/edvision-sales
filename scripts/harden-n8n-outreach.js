/* eslint-disable @typescript-eslint/no-require-imports */
const { loadEnvConfig } = require('@next/env');
const { randomUUID } = require('node:crypto');

loadEnvConfig(process.cwd());

const baseUrl = (process.env.N8N_BASE_URL || '').replace(/\/+$/, '');
const apiKey = process.env.N8N_API_KEY || '';
const workflowId = process.env.N8N_WORKFLOW_ID || 'H8QDF031rHcFtBYA';
const apply = process.argv.includes('--apply');

if (!baseUrl || !apiKey) throw new Error('n8n API konfiguracija nije potpuna.');

const headers = {
  'Content-Type': 'application/json',
  'X-N8N-API-KEY': apiKey,
};

async function request(path, options = {}) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}${path}`, {
        ...options,
        signal: AbortSignal.timeout(20000),
        headers: { ...headers, ...(options.headers || {}) },
      });
      if (response.status === 503 && attempt < 3) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 5000));
        continue;
      }
      const text = await response.text();
      if (!response.ok) throw new Error(`${response.status}: ${text.slice(0, 500)}`);
      return text ? JSON.parse(text) : {};
    } catch (error) {
      lastError = error;
      if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, attempt * 3000));
    }
  }
  throw lastError;
}

function node(workflow, name) {
  const result = workflow.nodes.find((item) => item.name === name);
  if (!result) throw new Error(`Nedostaje očekivani node: ${name}`);
  return result;
}

function link(target, index = 0) {
  return { node: target, type: 'main', index };
}

function cloneHttpNode(template, { name, position, method, url, jsonBody, neverError = false }) {
  const result = structuredClone(template);
  result.id = randomUUID();
  result.name = name;
  result.position = position;
  result.parameters.method = method;
  result.parameters.url = url;
  result.parameters.sendBody = true;
  result.parameters.specifyBody = 'json';
  result.parameters.jsonBody = jsonBody;
  delete result.parameters.sendQuery;
  delete result.parameters.queryParameters;
  result.parameters.options ||= {};
  result.parameters.options.response ||= {};
  result.parameters.options.response.response ||= {};
  result.parameters.options.response.response.neverError = neverError;
  return result;
}

function makeIfNode(name, position, expression) {
  return {
    id: randomUUID(),
    name,
    type: 'n8n-nodes-base.if',
    typeVersion: 2.2,
    position,
    parameters: {
      conditions: {
        options: {
          caseSensitive: true,
          leftValue: '',
          typeValidation: 'strict',
          version: 2,
        },
        conditions: [{
          id: randomUUID(),
          leftValue: expression,
          rightValue: true,
          operator: { type: 'boolean', operation: 'true', singleValue: true },
        }],
        combinator: 'and',
      },
      options: {},
    },
  };
}

function upsertNode(workflow, newNode) {
  const index = workflow.nodes.findIndex((item) => item.name === newNode.name);
  if (index >= 0) {
    newNode.id = workflow.nodes[index].id;
    workflow.nodes[index] = newNode;
  } else {
    workflow.nodes.push(newNode);
  }
}

function harden(workflow) {
  if (workflow.active) throw new Error('Workflow mora biti deaktiviran prije izmjene.');

  const schedule = node(workflow, 'Schedule Trigger (07:00h dnevno)');
  schedule.parameters = {
    rule: {
      interval: [{
        field: 'cronExpression',
        expression: '0 7 * * *',
      }],
    },
  };

  const followupSchedule = node(workflow, 'Schedule Trigger (07:30h i 17:00h Follow-up)1');
  // Follow-up/IMAP is quarantined until its event and scheduled paths are
  // separated. This prevents the cartesian fan-out observed in execution 287.
  followupSchedule.disabled = true;
  node(workflow, 'IMAP: Povuci nove emailove iz Inboxa1').disabled = true;
  node(workflow, 'Webhook: Ručni Follow-up1').disabled = true;
  node(workflow, 'OpenWA: Pošalji WhatsApp Follow-up1').disabled = true;
  followupSchedule.parameters = {
    rule: {
      interval: [
        {
          field: 'cronExpression',
          expression: '30 7,17 * * *',
        },
      ],
    },
  };

  const fetchCompanies = node(workflow, 'Appwrite: Uzmi firme (companies)1');
  fetchCompanies.parameters.queryParameters = {
    parameters: [
      {
        name: 'queries[0]',
        value: JSON.stringify({ method: 'equal', attribute: 'outreach_status', values: ['pending'] }),
      },
      {
        name: 'queries[1]',
        value: JSON.stringify({ method: 'isNotNull', attribute: 'email' }),
      },
      {
        name: 'queries[2]',
        value: JSON.stringify({ method: 'orderAsc', attribute: '$createdAt' }),
      },
      {
        name: 'queries[3]',
        value: "={{ JSON.stringify({ method: 'limit', values: [Math.min(50, Math.max(1, Number($json.body?.dailyLimit || $json.dailyLimit || 50)))] }) }}",
      },
    ],
  };
  fetchCompanies.parameters.options ||= {};
  fetchCompanies.parameters.options.timeout = 30000;

  const appwriteTemplate = node(workflow, 'Appwrite: Evidentiraj u Dnevnik (contact_logs)1');
  const loop = node(workflow, 'Loop Over Firme1');
  loop.parameters = { batchSize: 1, options: {} };
  const waitNode = node(workflow, 'Wait (15m Pauza)');
  waitNode.parameters = {
    amount: "={{ (() => { try { const value = Number($('Webhook: Ručno Pokretanje1').first().json.body?.delayMinutes || 15); return Math.min(60, Math.max(10, value)); } catch (error) { return 15; } })() }}",
    unit: 'minutes',
  };

  // Process only due follow-ups and keep the whole branch bounded in memory.
  const fetchFollowups = node(workflow, 'Appwrite: Uzmi poslata pisma za provjeru1');
  fetchFollowups.parameters.queryParameters = {
    parameters: [
      { name: 'queries[0]', value: JSON.stringify({ method: 'equal', attribute: 'channel', values: ['Email'] }) },
      { name: 'queries[1]', value: JSON.stringify({ method: 'equal', attribute: 'status', values: ['Poslano', 'Otvoreno', 'Otvorena'] }) },
      { name: 'queries[2]', value: "={{ JSON.stringify({ method: 'lessThanEqual', attribute: '$createdAt', values: [new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()] }) }}" },
      { name: 'queries[3]', value: JSON.stringify({ method: 'orderAsc', attribute: '$createdAt' }) },
      { name: 'queries[4]', value: JSON.stringify({ method: 'limit', values: [50] }) },
    ],
  };
  fetchFollowups.parameters.options = { timeout: 30000, response: { response: { neverError: true } } };
  node(workflow, 'Loop Over Obrađene Kontakte1').parameters = { batchSize: 1, options: {} };

  const claim = cloneHttpNode(appwriteTemplate, {
    name: 'Appwrite: Atomski rezerviši firmu za outreach',
    position: [-39200, 19040],
    method: 'POST',
    url: 'https://appwrite.ed-vision.com/v1/databases/6a7dd77a002b3913d433/collections/outreach_claims/documents',
    neverError: true,
    jsonBody: "={{ JSON.stringify({ documentId: $('Loop Over Firme1').item.json['$id'], data: { company_id: $('Loop Over Firme1').item.json['$id'], status: 'processing', claimed_at: new Date().toISOString(), execution_id: $execution.id } }) }}",
  });
  const claimOk = makeIfNode(
    'IF: Firma je uspješno rezervisana',
    [-38960, 19040],
    "={{ Boolean($json['$id']) && $json['$id'] === $('Loop Over Firme1').item.json['$id'] }}"
  );
  const markProcessing = cloneHttpNode(appwriteTemplate, {
    name: 'Appwrite: Označi firmu processing',
    position: [-38720, 19040],
    method: 'PATCH',
    url: "={{ 'https://appwrite.ed-vision.com/v1/databases/6a7dd77a002b3913d433/collections/companies/documents/' + encodeURIComponent($('Loop Over Firme1').item.json['$id']) }}",
    jsonBody: "={{ JSON.stringify({ data: { outreach_status: 'processing', outreach_claimed_at: new Date().toISOString(), outreach_execution_id: $execution.id, outreach_last_error: null } }) }}",
  });
  const markClaimContacted = cloneHttpNode(appwriteTemplate, {
    name: 'Appwrite: Zaključi outreach claim',
    position: [-36944, 18496],
    method: 'PATCH',
    url: "={{ 'https://appwrite.ed-vision.com/v1/databases/6a7dd77a002b3913d433/collections/outreach_claims/documents/' + encodeURIComponent($('Loop Over Firme1').item.json['$id']) }}",
    jsonBody: "={{ JSON.stringify({ data: { status: 'contacted', completed_at: new Date().toISOString() } }) }}",
  });
  const markCompanyContacted = cloneHttpNode(appwriteTemplate, {
    name: 'Appwrite: Označi firmu contacted',
    position: [-36896, 18608],
    method: 'PATCH',
    url: "={{ 'https://appwrite.ed-vision.com/v1/databases/6a7dd77a002b3913d433/collections/companies/documents/' + encodeURIComponent($('Loop Over Firme1').item.json['$id']) }}",
    jsonBody: "={{ JSON.stringify({ data: { outreach_status: 'contacted', outreach_contacted_at: new Date().toISOString(), outreach_last_error: null } }) }}",
  });
  const markClaimFailed = cloneHttpNode(appwriteTemplate, {
    name: 'Appwrite: Označi outreach claim failed',
    position: [-36640, 19920],
    method: 'PATCH',
    url: "={{ 'https://appwrite.ed-vision.com/v1/databases/6a7dd77a002b3913d433/collections/outreach_claims/documents/' + encodeURIComponent($('Loop Over Firme1').item.json['$id']) }}",
    jsonBody: "={{ JSON.stringify({ data: { status: 'failed', completed_at: new Date().toISOString(), last_error: 'Nevažeća email domena ili DNS/MX greška' } }) }}",
  });
  const markCompanyFailed = cloneHttpNode(appwriteTemplate, {
    name: 'Appwrite: Označi firmu failed',
    position: [-36400, 19920],
    method: 'PATCH',
    url: "={{ 'https://appwrite.ed-vision.com/v1/databases/6a7dd77a002b3913d433/collections/companies/documents/' + encodeURIComponent($('Loop Over Firme1').item.json['$id']) }}",
    jsonBody: "={{ JSON.stringify({ data: { outreach_status: 'failed', outreach_last_error: 'Nevažeća email domena ili DNS/MX greška' } }) }}",
  });

  const followupClaim = cloneHttpNode(appwriteTemplate, {
    name: 'Appwrite: Atomski rezerviši WhatsApp follow-up',
    position: [-37584, 20416],
    method: 'POST',
    url: 'https://appwrite.ed-vision.com/v1/databases/6a7dd77a002b3913d433/collections/followup_claims/documents',
    neverError: true,
    jsonBody: "={{ (() => { const prepared = $('Set: Pripremi WhatsApp za slanje').item.json; const companyId = prepared.company?.['$id'] || prepared.log?.company?.['$id'] || prepared.log?.company; return JSON.stringify({ documentId: companyId, data: { company_id: companyId, source_log_id: prepared.log?.['$id'] || null, status: 'processing', claimed_at: new Date().toISOString(), execution_id: $execution.id } }); })() }}",
  });
  const followupClaimOk = makeIfNode(
    'IF: WhatsApp follow-up je uspješno rezervisan',
    [-37328, 20416],
    "={{ (() => { const prepared = $('Set: Pripremi WhatsApp za slanje').item.json; const companyId = prepared.company?.['$id'] || prepared.log?.company?.['$id'] || prepared.log?.company; return Boolean($json['$id']) && $json['$id'] === companyId; })() }}"
  );
  const markFollowupSent = cloneHttpNode(appwriteTemplate, {
    name: 'Appwrite: Zaključi WhatsApp follow-up claim',
    position: [-38640, 20176],
    method: 'PATCH',
    url: "={{ (() => { const prepared = $('Set: Pripremi WhatsApp za slanje').item.json; const companyId = prepared.company?.['$id'] || prepared.log?.company?.['$id'] || prepared.log?.company; return 'https://appwrite.ed-vision.com/v1/databases/6a7dd77a002b3913d433/collections/followup_claims/documents/' + encodeURIComponent(companyId); })() }}",
    jsonBody: "={{ JSON.stringify({ data: { status: 'sent', completed_at: new Date().toISOString() } }) }}",
  });

  for (const newNode of [claim, claimOk, markProcessing, markClaimContacted, markCompanyContacted, markClaimFailed, markCompanyFailed, followupClaim, followupClaimOk, markFollowupSent]) {
    upsertNode(workflow, newNode);
  }

  const leadCheckIf = node(workflow, 'IF: Lead još NE postoji?1');
  const websiteIf = node(workflow, 'IF: Firma ima web stranicu?1');
  const smtp = node(workflow, 'SMTP: Posalji Email1');
  const contactLog = node(workflow, 'Appwrite: Evidentiraj u Dnevnik (contact_logs)1');
  const wait = node(workflow, 'Wait (15m Pauza)');
  const emailErrorLog = node(workflow, 'Appwrite: Evidentiraj Gresku Emaila (contact_logs)1');

  // Existing lead check remains a cheap legacy guard. Atomic claim is the real lock.
  workflow.connections[leadCheckIf.name].main[0] = [link(claim.name)];
  workflow.connections[claim.name] = { main: [[link(claimOk.name)]] };
  workflow.connections[claimOk.name] = {
    main: [[link(markProcessing.name)], [link(loop.name)]],
  };
  workflow.connections[markProcessing.name] = { main: [[link(websiteIf.name)]] };

  // PageSpeed output was unused by the AI prompt and retained a large payload in memory.
  // Bypass both website-download and PageSpeed nodes; the prompt still uses company metadata.
  workflow.connections[websiteIf.name].main[0] = [link('Set: Pripremi AI Prompt')];

  workflow.connections[smtp.name] = { main: [[link(markClaimContacted.name)]] };
  workflow.connections[markClaimContacted.name] = { main: [[link(markCompanyContacted.name)]] };
  workflow.connections[markCompanyContacted.name] = { main: [[link(contactLog.name)]] };
  workflow.connections[contactLog.name] = { main: [[link(wait.name)]] };

  workflow.connections[emailErrorLog.name] = { main: [[link(markClaimFailed.name)]] };
  workflow.connections[markClaimFailed.name] = { main: [[link(markCompanyFailed.name)]] };
  workflow.connections[markCompanyFailed.name] = { main: [[link(loop.name)]] };

  const prepareWhatsapp = node(workflow, 'Set: Pripremi WhatsApp za slanje');
  const sendWhatsapp = node(workflow, 'OpenWA: Pošalji WhatsApp Follow-up1');
  const logWhatsapp = node(workflow, 'Appwrite: Evidentiraj WhatsApp u Dnevnik1');
  const followupLoop = node(workflow, 'Loop Over Obrađene Kontakte1');
  workflow.connections[prepareWhatsapp.name] = { main: [[link(followupClaim.name)]] };
  workflow.connections[followupClaim.name] = { main: [[link(followupClaimOk.name)]] };
  workflow.connections[followupClaimOk.name] = { main: [[link(sendWhatsapp.name)], [link(followupLoop.name)]] };
  workflow.connections[sendWhatsapp.name] = { main: [[link(markFollowupSent.name)]] };
  workflow.connections[markFollowupSent.name] = { main: [[link(logWhatsapp.name)]] };

  workflow.settings ||= {};
  workflow.settings.executionOrder = 'v1';
  workflow.settings.timezone = 'Europe/Sarajevo';
  workflow.settings.saveManualExecutions = false;
  workflow.settings.saveExecutionProgress = false;

  return workflow;
}

function validate(workflow) {
  const errors = [];
  for (const quarantined of [
    'Schedule Trigger (07:30h i 17:00h Follow-up)1',
    'IMAP: Povuci nove emailove iz Inboxa1',
    'Webhook: Ručni Follow-up1',
    'OpenWA: Pošalji WhatsApp Follow-up1',
  ]) {
    if (node(workflow, quarantined).disabled !== true) {
      errors.push(`Sigurnosno rizičan node nije isključen: ${quarantined}.`);
    }
  }
  const schedule = node(workflow, 'Schedule Trigger (07:00h dnevno)');
  const interval = schedule.parameters?.rule?.interval?.[0];
  if (interval?.field !== 'cronExpression' || interval?.expression !== '0 7 * * *') {
    errors.push('Dnevni raspored nije tačno 07:00.');
  }
  const followupIntervals = node(
    workflow,
    'Schedule Trigger (07:30h i 17:00h Follow-up)1'
  ).parameters?.rule?.interval || [];
  const hasSafeFollowupSchedule =
    followupIntervals.length === 1 &&
    followupIntervals[0].field === 'cronExpression' &&
    followupIntervals[0].expression === '30 7,17 * * *';
  if (!hasSafeFollowupSchedule) errors.push('Follow-up raspored nije tačno 07:30 i 17:00.');
  const fetchCompanies = node(workflow, 'Appwrite: Uzmi firme (companies)1');
  const queryText = JSON.stringify(fetchCompanies.parameters?.queryParameters || {});
  if (!queryText.includes('outreach_status') || !queryText.includes('pending') || !queryText.includes('50')) {
    errors.push('Appwrite upit nije ograničen na najviše 50 pending firmi.');
  }
  if (node(workflow, 'Loop Over Firme1').parameters?.batchSize !== 1) {
    errors.push('Petlja nije podešena na batch 1.');
  }
  const followupFetchText = JSON.stringify(node(workflow, 'Appwrite: Uzmi poslata pisma za provjeru1').parameters || {});
  if (!followupFetchText.includes('lessThanEqual') || !followupFetchText.includes('50') || followupFetchText.includes('pagination')) {
    errors.push('Follow-up upit nije ograničen na 50 dospjelih zapisa bez paginacije.');
  }
  if (node(workflow, 'Loop Over Obrađene Kontakte1').parameters?.batchSize !== 1) {
    errors.push('WhatsApp petlja nije podešena na batch 1.');
  }
  const waitAmount = String(node(workflow, 'Wait (15m Pauza)').parameters?.amount || '');
  if (!waitAmount.includes('delayMinutes') || !waitAmount.includes('Math.min(60') || !waitAmount.includes('Math.max(10')) {
    errors.push('Wait nije sigurno vezan za ručnu pauzu 10-60 minuta.');
  }
  const websiteTargets = workflow.connections['IF: Firma ima web stranicu?1']?.main?.[0] || [];
  if (!websiteTargets.some((item) => item.node === 'Set: Pripremi AI Prompt')) {
    errors.push('Teški PageSpeed put nije zaobiđen.');
  }
  for (const required of [
    'Appwrite: Atomski rezerviši firmu za outreach',
    'IF: Firma je uspješno rezervisana',
    'Appwrite: Označi firmu processing',
    'Appwrite: Zaključi outreach claim',
    'Appwrite: Označi firmu contacted',
    'Appwrite: Atomski rezerviši WhatsApp follow-up',
    'IF: WhatsApp follow-up je uspješno rezervisan',
    'Appwrite: Zaključi WhatsApp follow-up claim',
  ]) {
    if (!workflow.nodes.some((item) => item.name === required)) errors.push(`Nedostaje ${required}.`);
  }
  return errors;
}

(async () => {
  const current = await request(`/api/v1/workflows/${encodeURIComponent(workflowId)}`);
  const hardened = harden(structuredClone(current));
  const preflightErrors = validate(hardened);
  if (preflightErrors.length) throw new Error(preflightErrors.join(' '));

  if (!apply) {
    console.log(JSON.stringify({
      mode: 'dry-run',
      active: current.active,
      nodesBefore: current.nodes.length,
      nodesAfter: hardened.nodes.length,
      schedule: node(hardened, 'Schedule Trigger (07:00h dnevno)').parameters,
      validation: 'passed',
    }, null, 2));
    return;
  }

  const updated = await request(`/api/v1/workflows/${encodeURIComponent(workflowId)}`, {
    method: 'PUT',
    body: JSON.stringify({
      name: hardened.name,
      nodes: hardened.nodes,
      connections: hardened.connections,
      settings: hardened.settings,
    }),
  });
  const verifyErrors = validate(updated);
  if (updated.active) verifyErrors.push('Workflow je neočekivano aktivan poslije izmjene.');
  if (verifyErrors.length) throw new Error(verifyErrors.join(' '));

  console.log(JSON.stringify({
    mode: 'applied',
    workflowId: updated.id,
    active: updated.active,
    nodes: updated.nodes.length,
    updatedAt: updated.updatedAt,
    validation: 'passed',
  }, null, 2));
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
