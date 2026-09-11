/* eslint-disable @typescript-eslint/no-require-imports */
const { loadEnvConfig } = require('@next/env');
const { randomUUID } = require('node:crypto');

loadEnvConfig(process.cwd());

const baseUrl = (process.env.N8N_BASE_URL || '').replace(/\/+$/, '');
const apiKey = process.env.N8N_API_KEY || '';
const sourceWorkflowId = process.env.N8N_WORKFLOW_ID || '';
const headers = { 'Content-Type': 'application/json', 'X-N8N-API-KEY': apiKey };

if (!baseUrl || !apiKey || !sourceWorkflowId) throw new Error('n8n API konfiguracija nije potpuna.');

async function api(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: { ...headers, ...(options.headers || {}) },
    signal: AbortSignal.timeout(30000),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`${response.status}: ${text.slice(0, 500)}`);
  return text ? JSON.parse(text) : {};
}

function reachable(workflow, roots) {
  const selected = new Set();
  const queue = [...roots];
  while (queue.length) {
    const name = queue.shift();
    if (selected.has(name)) continue;
    if (!workflow.nodes.some((item) => item.name === name)) throw new Error(`Nedostaje root node: ${name}`);
    selected.add(name);
    const outputs = workflow.connections[name]?.main || [];
    for (const branch of outputs) {
      for (const connection of branch || []) {
        if (!selected.has(connection.node)) queue.push(connection.node);
      }
    }
  }
  return selected;
}

function subset(workflow, names) {
  const nodes = workflow.nodes
    .filter((item) => names.has(item.name))
    .map((item) => {
      const copy = structuredClone(item);
      delete copy.disabled;
      return copy;
    });
  const connections = {};
  for (const name of names) {
    const source = workflow.connections[name];
    if (!source) continue;
    const filtered = structuredClone(source);
    filtered.main = (filtered.main || []).map((branch) =>
      (branch || []).filter((connection) => names.has(connection.node))
    );
    connections[name] = filtered;
  }
  return { nodes, connections };
}

function link(node, index = 0) {
  return { node, type: 'main', index };
}

function ifNode(name, position, leftValue, rightValue, operation, type) {
  return {
    id: randomUUID(), name, type: 'n8n-nodes-base.if', typeVersion: 2.2, position,
    parameters: {
      conditions: {
        options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 2 },
        conditions: [{ id: randomUUID(), leftValue, rightValue, operator: { type, operation } }],
        combinator: 'and',
      },
      options: {},
    },
  };
}

function httpNode(template, name, position, method, url, jsonBody) {
  const result = structuredClone(template);
  result.id = randomUUID();
  result.name = name;
  result.position = position;
  delete result.disabled;
  result.parameters.method = method;
  result.parameters.url = url;
  delete result.parameters.sendQuery;
  delete result.parameters.queryParameters;
  result.parameters.sendBody = true;
  result.parameters.specifyBody = 'json';
  result.parameters.jsonBody = jsonBody;
  result.parameters.options = { timeout: 30000 };
  return result;
}

async function upsertWorkflow(name, payload) {
  const list = await api('/api/v1/workflows?limit=100');
  const existing = (list.data || []).find((item) => item.name === name);
  const body = JSON.stringify({ name, ...payload });
  if (existing) {
    if (existing.active) return api(`/api/v1/workflows/${encodeURIComponent(existing.id)}`);
    return api(`/api/v1/workflows/${encodeURIComponent(existing.id)}`, { method: 'PUT', body });
  }
  return api('/api/v1/workflows', { method: 'POST', body });
}

(async () => {
  const source = await api(`/api/v1/workflows/${encodeURIComponent(sourceWorkflowId)}`);
  if (source.active) throw new Error('Izvorni workflow mora biti ugašen.');

  const emailNames = reachable(source, [
    'Schedule Trigger (07:00h dnevno)',
    'Webhook: Ručno Pokretanje1',
  ]);
  const email = subset(source, emailNames);
  const created = await upsertWorkflow('ED Vision — Email Outreach', {
    ...email,
    settings: {
      executionOrder: 'v1',
      timezone: 'Europe/Sarajevo',
      saveManualExecutions: false,
      saveExecutionProgress: false,
    },
  });

  const trackingNames = reachable(source, ['Webhook: Track Email Open']);
  const tracking = subset(source, trackingNames);
  const createdTracking = await upsertWorkflow('ED Vision — Email Open Tracking', {
    ...tracking,
    settings: {
      executionOrder: 'v1',
      timezone: 'Europe/Sarajevo',
      saveManualExecutions: false,
      saveExecutionProgress: false,
    },
  });

  const sourceImap = structuredClone(source.nodes.find((item) => item.name === 'IMAP: Povuci nove emailove iz Inboxa1'));
  const sourceLookup = structuredClone(source.nodes.find((item) => item.name === 'Appwrite: Pronađi log za IMAP odgovor'));
  if (!sourceImap || !sourceLookup) throw new Error('Nedostaju IMAP template nodovi.');
  delete sourceImap.disabled;
  sourceImap.position = [0, 0];
  sourceLookup.id = randomUUID();
  sourceLookup.name = 'Appwrite: Pronađi jedan kontakt log';
  sourceLookup.position = [260, 0];
  sourceLookup.parameters.options = { timeout: 30000 };

  const found = ifNode('IF: Kontakt log pronađen', [520, 0], '={{ Number($json.total) }}', 0, 'gt', 'number');
  const bounceExpression = "={{ (() => { const email = $('IMAP: Povuci nove emailove iz Inboxa1').item.json || {}; const from = typeof email.from === 'string' ? email.from : (email.from?.text || ''); const subject = String(email.subject || ''); const body = [email.text, email.textPlain, email.html, email.textHtml, email.body, email.message].filter(v => typeof v === 'string').join(' '); return /mailer-daemon|postmaster|undelivered(?: mail)?|returned to sender|delivery (?:has )?failed|delivery status notification|failure notice|final-recipient:|diagnostic-code:/i.test(from + ' ' + subject + ' ' + body); })() }}";
  const bounced = ifNode('IF: Bounce poruka', [780, 0], bounceExpression, true, 'equals', 'boolean');
  const logIdUrl = "={{ 'https://appwrite.ed-vision.com/v1/databases/6a7dd77a002b3913d433/collections/contact_logs/documents/' + encodeURIComponent($('Appwrite: Pronađi jedan kontakt log').item.json.documents[0]['$id']) }}";
  const leadIdUrl = "={{ 'https://appwrite.ed-vision.com/v1/databases/6a7dd77a002b3913d433/collections/leads/documents/' + encodeURIComponent($('Appwrite: Pronađi jedan kontakt log').item.json.documents[0].lead?.['$id'] || $('Appwrite: Pronađi jedan kontakt log').item.json.documents[0].lead) }}";
  const markBounceLog = httpNode(sourceLookup, 'Appwrite: Označi kontakt kao bounce', [1040, -120], 'PATCH', logIdUrl, "={{ JSON.stringify({ data: { status: 'Greška', outcome: 'Email bounce detektovan putem IMAP-a' } }) }}");
  const markBounceLead = httpNode(sourceLookup, 'Appwrite: Označi lead email greškom', [1300, -120], 'PATCH', leadIdUrl, "={{ JSON.stringify({ data: { status: 'Greška - Nepostojeći email' } }) }}");
  const markReplyLog = httpNode(sourceLookup, 'Appwrite: Označi kontakt odgovorenim', [1040, 120], 'PATCH', logIdUrl, "={{ JSON.stringify({ data: { status: 'Odgovoreno', outcome: 'Klijent odgovorio putem emaila' } }) }}");
  const markReplyLead = httpNode(sourceLookup, 'Appwrite: Označi lead u pregovorima', [1300, 120], 'PATCH', leadIdUrl, "={{ JSON.stringify({ data: { status: 'U pregovorima' } }) }}");
  const inboxNodes = [sourceImap, sourceLookup, found, bounced, markBounceLog, markBounceLead, markReplyLog, markReplyLead];
  const inboxConnections = {
    [sourceImap.name]: { main: [[link(sourceLookup.name)]] },
    [sourceLookup.name]: { main: [[link(found.name)]] },
    [found.name]: { main: [[link(bounced.name)], []] },
    [bounced.name]: { main: [[link(markBounceLog.name)], [link(markReplyLog.name)]] },
    [markBounceLog.name]: { main: [[link(markBounceLead.name)]] },
    [markReplyLog.name]: { main: [[link(markReplyLead.name)]] },
  };
  const createdInbox = await upsertWorkflow('ED Vision — Inbox Processor', {
    nodes: inboxNodes,
    connections: inboxConnections,
    settings: { executionOrder: 'v1', timezone: 'Europe/Sarajevo', saveManualExecutions: false, saveExecutionProgress: false },
  });

  const followupNodeNames = [
    'Schedule Trigger (07:30h i 17:00h Follow-up)1',
    'Webhook: Ručni Follow-up1',
    'Appwrite: Uzmi poslata pisma za provjeru1',
    'Split Out: Pisma',
    'Loop Over Obrađene Kontakte1',
    'IF: Spreman za WhatsApp (Prošlo 4 dana)?1',
    'Appwrite: Dohvati Firmu za WhatsApp',
    'Appwrite: Provjeri aktivni sastanak',
    'IF: Nema aktivnog sastanka?',
    'Appwrite: Provjeri blokirajući lead status',
    'IF: Lead dozvoljava follow-up?',
    'IF: Validan BiH WhatsApp broj?',
    'Appwrite: Provjeri postojeći WhatsApp follow-up',
    'IF: WhatsApp follow-up nije poslan?',
    'Set: Pripremi WhatsApp za slanje',
    'Appwrite: Atomski rezerviši WhatsApp follow-up',
    'IF: WhatsApp follow-up je uspješno rezervisan',
    'OpenWA: Pošalji WhatsApp Follow-up1',
    'Appwrite: Zaključi WhatsApp follow-up claim',
    'Appwrite: Evidentiraj WhatsApp u Dnevnik1',
  ];
  const followupMap = new Map();
  for (const name of followupNodeNames) {
    const originalNode = source.nodes.find((item) => item.name === name);
    if (!originalNode) throw new Error(`Nedostaje follow-up node: ${name}`);
    const copy = structuredClone(originalNode);
    copy.id = randomUUID();
    delete copy.disabled;
    followupMap.set(name, copy);
  }
  const candidate = {
    id: randomUUID(),
    name: 'Set: Pripremi dospjeli follow-up',
    type: 'n8n-nodes-base.set',
    typeVersion: 3.4,
    position: [-39800, 20080],
    parameters: {
      mode: 'raw',
      jsonOutput: "={{ ({ log: $json, has_replied: false, is_bounced: false, is_ready_for_whatsapp: true, is_imap_event: false }) }}",
      options: {},
    },
  };
  const optIn = ifNode(
    'IF: WhatsApp opt-in potvrđen',
    [-38000, 20640],
    "={{ Boolean($('Appwrite: Dohvati Firmu za WhatsApp').item.json.whatsapp_opt_in) }}",
    true,
    'equals',
    'boolean'
  );
  const validPhone = followupMap.get('IF: Validan BiH WhatsApp broj?');
  validPhone.parameters.conditions.conditions[0].leftValue = "={{ (() => { const phones = $('Appwrite: Dohvati Firmu za WhatsApp').item.json.phones; const list = Array.isArray(phones) ? phones : (typeof phones === 'string' ? phones.split(/[,;\\s\\/]+/) : []); return list.some(phone => { let digits = String(phone || '').replace(/\\D/g, ''); if (digits.startsWith('0')) digits = '387' + digits.slice(1); return /^3876\\d{7}$/.test(digits); }); })() }}";

  const followupLoopName = 'Loop Over Obrađene Kontakte1';
  const followupConnections = {
    'Schedule Trigger (07:30h i 17:00h Follow-up)1': { main: [[link('Appwrite: Uzmi poslata pisma za provjeru1')]] },
    'Webhook: Ručni Follow-up1': { main: [[link('Appwrite: Uzmi poslata pisma za provjeru1')]] },
    'Appwrite: Uzmi poslata pisma za provjeru1': { main: [[link('Split Out: Pisma')]] },
    'Split Out: Pisma': { main: [[link(followupLoopName)]] },
    [followupLoopName]: { main: [[], [link(candidate.name)]] },
    [candidate.name]: { main: [[link('IF: Spreman za WhatsApp (Prošlo 4 dana)?1')]] },
    'IF: Spreman za WhatsApp (Prošlo 4 dana)?1': { main: [[link('Appwrite: Dohvati Firmu za WhatsApp')], [link(followupLoopName)]] },
    'Appwrite: Dohvati Firmu za WhatsApp': { main: [[link('Appwrite: Provjeri aktivni sastanak')]] },
    'Appwrite: Provjeri aktivni sastanak': { main: [[link('IF: Nema aktivnog sastanka?')]] },
    'IF: Nema aktivnog sastanka?': { main: [[link('Appwrite: Provjeri blokirajući lead status')], [link(followupLoopName)]] },
    'Appwrite: Provjeri blokirajući lead status': { main: [[link('IF: Lead dozvoljava follow-up?')]] },
    'IF: Lead dozvoljava follow-up?': { main: [[link(optIn.name)], [link(followupLoopName)]] },
    [optIn.name]: { main: [[link('IF: Validan BiH WhatsApp broj?')], [link(followupLoopName)]] },
    'IF: Validan BiH WhatsApp broj?': { main: [[link('Appwrite: Provjeri postojeći WhatsApp follow-up')], [link(followupLoopName)]] },
    'Appwrite: Provjeri postojeći WhatsApp follow-up': { main: [[link('IF: WhatsApp follow-up nije poslan?')]] },
    'IF: WhatsApp follow-up nije poslan?': { main: [[link('Set: Pripremi WhatsApp za slanje')], [link(followupLoopName)]] },
    'Set: Pripremi WhatsApp za slanje': { main: [[link('Appwrite: Atomski rezerviši WhatsApp follow-up')]] },
    'Appwrite: Atomski rezerviši WhatsApp follow-up': { main: [[link('IF: WhatsApp follow-up je uspješno rezervisan')]] },
    'IF: WhatsApp follow-up je uspješno rezervisan': { main: [[link('OpenWA: Pošalji WhatsApp Follow-up1')], [link(followupLoopName)]] },
    'OpenWA: Pošalji WhatsApp Follow-up1': { main: [[link('Appwrite: Zaključi WhatsApp follow-up claim')]] },
    'Appwrite: Zaključi WhatsApp follow-up claim': { main: [[link('Appwrite: Evidentiraj WhatsApp u Dnevnik1')]] },
    'Appwrite: Evidentiraj WhatsApp u Dnevnik1': { main: [[link(followupLoopName)]] },
  };
  const createdFollowup = await upsertWorkflow('ED Vision — Follow-up & WhatsApp (DRAFT)', {
    nodes: [...followupMap.values(), candidate, optIn],
    connections: followupConnections,
    settings: { executionOrder: 'v1', timezone: 'Europe/Sarajevo', saveManualExecutions: false, saveExecutionProgress: false },
  });

  console.log(JSON.stringify({
    workflow: created.name,
    id: created.id,
    active: created.active,
    nodes: created.nodes.length,
    roots: created.nodes.filter((item) => ['scheduleTrigger', 'webhook'].some((type) => item.type.endsWith(type))).map((item) => item.name),
    tracking: {
      id: createdTracking.id,
      active: createdTracking.active,
      nodes: createdTracking.nodes.length,
    },
    inbox: { id: createdInbox.id, active: createdInbox.active, nodes: createdInbox.nodes.length },
    followup: { id: createdFollowup.id, active: createdFollowup.active, nodes: createdFollowup.nodes.length },
  }, null, 2));
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
