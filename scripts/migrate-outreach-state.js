/* eslint-disable @typescript-eslint/no-require-imports */
const { loadEnvConfig } = require('@next/env');
const {
  Client,
  Query,
  TablesDB,
  TablesDBIndexType,
} = require('node-appwrite');

loadEnvConfig(process.cwd());

const databaseId =
  process.env.APPWRITE_DATABASE_ID || process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;
const endpoint =
  process.env.APPWRITE_ENDPOINT || process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const projectId =
  process.env.APPWRITE_PROJECT_ID || process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
const apiKey = process.env.APPWRITE_API_KEY;

if (!databaseId || !endpoint || !projectId || !apiKey) {
  throw new Error('Appwrite konfiguracija nije potpuna.');
}

const client = new Client()
  .setEndpoint(endpoint)
  .setProject(projectId)
  .setKey(apiKey);
const tables = new TablesDB(client);

const COMPANY_TABLE = 'companies';
const CLAIM_TABLE = 'outreach_claims';
const FOLLOWUP_CLAIM_TABLE = 'followup_claims';
const TERMINAL_STATUSES = new Set(['contacted', 'failed', 'blocked', 'ineligible']);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function relationId(value) {
  if (!value) return null;
  if (typeof value === 'string') return value;
  return typeof value.$id === 'string' ? value.$id : null;
}

async function listAllRows(tableId) {
  const rows = [];
  let cursor;

  do {
    const queries = [Query.limit(100), Query.orderAsc('$id')];
    if (cursor) queries.push(Query.cursorAfter(cursor));
    const page = await tables.listRows({ databaseId, tableId, queries });
    rows.push(...page.rows);
    cursor = page.rows.length === 100 ? page.rows.at(-1).$id : undefined;
  } while (cursor);

  return rows;
}

async function waitForColumn(tableId, key) {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const table = await tables.getTable({ databaseId, tableId });
    const column = table.columns.find((item) => item.key === key);
    if (column?.status === 'available') return;
    if (column?.status === 'failed') {
      throw new Error(`Kreiranje kolone ${tableId}.${key} nije uspjelo.`);
    }
    await sleep(1000);
  }
  throw new Error(`Isteklo čekanje na kolonu ${tableId}.${key}.`);
}

async function ensureColumn(tableId, key, create) {
  const table = await tables.getTable({ databaseId, tableId });
  if (!table.columns.some((column) => column.key === key)) {
    await create();
  }
  await waitForColumn(tableId, key);
}

async function ensureIndex(tableId, key, columns) {
  const table = await tables.getTable({ databaseId, tableId });
  if (!table.indexes.some((index) => index.key === key)) {
    await tables.createIndex({
      databaseId,
      tableId,
      key,
      type: TablesDBIndexType.Key,
      columns,
    });
  }

  for (let attempt = 0; attempt < 30; attempt += 1) {
    const current = await tables.getTable({ databaseId, tableId });
    const index = current.indexes.find((item) => item.key === key);
    if (index?.status === 'available') return;
    if (index?.status === 'failed') {
      throw new Error(`Kreiranje indeksa ${tableId}.${key} nije uspjelo.`);
    }
    await sleep(1000);
  }
  throw new Error(`Isteklo čekanje na indeks ${tableId}.${key}.`);
}

async function ensureSchema() {
  await ensureColumn(COMPANY_TABLE, 'outreach_status', () =>
    tables.createEnumColumn({
      databaseId,
      tableId: COMPANY_TABLE,
      key: 'outreach_status',
      elements: ['pending', 'processing', 'contacted', 'failed', 'blocked', 'ineligible'],
      required: false,
      xdefault: 'pending',
    })
  );
  await ensureColumn(COMPANY_TABLE, 'outreach_claimed_at', () =>
    tables.createDatetimeColumn({ databaseId, tableId: COMPANY_TABLE, key: 'outreach_claimed_at', required: false })
  );
  await ensureColumn(COMPANY_TABLE, 'outreach_contacted_at', () =>
    tables.createDatetimeColumn({ databaseId, tableId: COMPANY_TABLE, key: 'outreach_contacted_at', required: false })
  );
  await ensureColumn(COMPANY_TABLE, 'outreach_execution_id', () =>
    tables.createStringColumn({ databaseId, tableId: COMPANY_TABLE, key: 'outreach_execution_id', size: 64, required: false })
  );
  await ensureColumn(COMPANY_TABLE, 'outreach_last_error', () =>
    tables.createStringColumn({ databaseId, tableId: COMPANY_TABLE, key: 'outreach_last_error', size: 512, required: false })
  );
  await ensureIndex(COMPANY_TABLE, 'idx_outreach_status', ['outreach_status']);

  try {
    await tables.getTable({ databaseId, tableId: CLAIM_TABLE });
  } catch (error) {
    if (error.code !== 404) throw error;
    await tables.createTable({
      databaseId,
      tableId: CLAIM_TABLE,
      name: 'Outreach claims',
      permissions: [],
      rowSecurity: false,
      enabled: true,
    });
  }

  await ensureColumn(CLAIM_TABLE, 'company_id', () =>
    tables.createStringColumn({ databaseId, tableId: CLAIM_TABLE, key: 'company_id', size: 64, required: true })
  );
  await ensureColumn(CLAIM_TABLE, 'status', () =>
    tables.createEnumColumn({
      databaseId,
      tableId: CLAIM_TABLE,
      key: 'status',
      elements: ['processing', 'contacted', 'failed', 'blocked', 'ineligible'],
      required: true,
    })
  );
  await ensureColumn(CLAIM_TABLE, 'claimed_at', () =>
    tables.createDatetimeColumn({ databaseId, tableId: CLAIM_TABLE, key: 'claimed_at', required: false })
  );
  await ensureColumn(CLAIM_TABLE, 'completed_at', () =>
    tables.createDatetimeColumn({ databaseId, tableId: CLAIM_TABLE, key: 'completed_at', required: false })
  );
  await ensureColumn(CLAIM_TABLE, 'execution_id', () =>
    tables.createStringColumn({ databaseId, tableId: CLAIM_TABLE, key: 'execution_id', size: 64, required: false })
  );
  await ensureColumn(CLAIM_TABLE, 'last_error', () =>
    tables.createStringColumn({ databaseId, tableId: CLAIM_TABLE, key: 'last_error', size: 512, required: false })
  );
  await ensureIndex(CLAIM_TABLE, 'idx_claim_status', ['status']);

  try {
    await tables.getTable({ databaseId, tableId: FOLLOWUP_CLAIM_TABLE });
  } catch (error) {
    if (error.code !== 404) throw error;
    await tables.createTable({ databaseId, tableId: FOLLOWUP_CLAIM_TABLE, name: 'WhatsApp follow-up claims', permissions: [], rowSecurity: false, enabled: true });
  }
  await ensureColumn(FOLLOWUP_CLAIM_TABLE, 'company_id', () =>
    tables.createStringColumn({ databaseId, tableId: FOLLOWUP_CLAIM_TABLE, key: 'company_id', size: 64, required: true })
  );
  await ensureColumn(FOLLOWUP_CLAIM_TABLE, 'source_log_id', () =>
    tables.createStringColumn({ databaseId, tableId: FOLLOWUP_CLAIM_TABLE, key: 'source_log_id', size: 64, required: false })
  );
  await ensureColumn(FOLLOWUP_CLAIM_TABLE, 'status', () =>
    tables.createEnumColumn({ databaseId, tableId: FOLLOWUP_CLAIM_TABLE, key: 'status', elements: ['processing', 'sent', 'failed', 'blocked'], required: true })
  );
  await ensureColumn(FOLLOWUP_CLAIM_TABLE, 'claimed_at', () =>
    tables.createDatetimeColumn({ databaseId, tableId: FOLLOWUP_CLAIM_TABLE, key: 'claimed_at', required: false })
  );
  await ensureColumn(FOLLOWUP_CLAIM_TABLE, 'completed_at', () =>
    tables.createDatetimeColumn({ databaseId, tableId: FOLLOWUP_CLAIM_TABLE, key: 'completed_at', required: false })
  );
  await ensureColumn(FOLLOWUP_CLAIM_TABLE, 'execution_id', () =>
    tables.createStringColumn({ databaseId, tableId: FOLLOWUP_CLAIM_TABLE, key: 'execution_id', size: 64, required: false })
  );
  await ensureColumn(FOLLOWUP_CLAIM_TABLE, 'last_error', () =>
    tables.createStringColumn({ databaseId, tableId: FOLLOWUP_CLAIM_TABLE, key: 'last_error', size: 512, required: false })
  );
  await ensureIndex(FOLLOWUP_CLAIM_TABLE, 'idx_followup_claim_status', ['status']);
}

async function backfillFollowupClaims() {
  const logs = await listAllRows('contact_logs');
  const sentByCompany = new Map();
  for (const log of logs) {
    if (log.channel !== 'WhatsApp' || log.status !== 'Poslano') continue;
    const companyId = relationId(log.company);
    if (!companyId || sentByCompany.has(companyId)) continue;
    sentByCompany.set(companyId, log);
  }
  for (const [companyId, log] of sentByCompany) {
    try {
      await tables.createRow({
        databaseId,
        tableId: FOLLOWUP_CLAIM_TABLE,
        rowId: companyId,
        data: { company_id: companyId, source_log_id: log.$id, status: 'sent', completed_at: log.contacted_at || log.$createdAt },
      });
    } catch (error) {
      if (error.code !== 409) throw error;
    }
  }
}

function classifyCompanies(companies, leads, logs) {
  const leadsById = new Map(leads.map((lead) => [lead.$id, lead]));
  const facts = new Map(companies.map((company) => [company.$id, {
    blocked: false,
    contacted: false,
    failed: false,
    contactedAt: null,
    error: null,
  }]));

  for (const lead of leads) {
    const companyId = relationId(lead.company);
    const fact = facts.get(companyId);
    if (!fact) continue;
    if (lead.status === 'Odbijeno') fact.blocked = true;
    else if (String(lead.status || '').startsWith('Greška')) {
      fact.failed = true;
      fact.error ||= lead.status;
    } else if (['Kontaktiran', 'Kvalifikovan', 'U pregovorima', 'Zaključeno - Dobijeno'].includes(lead.status)) {
      fact.contacted = true;
    }
  }

  for (const log of logs) {
    const lead = leadsById.get(relationId(log.lead));
    const companyId = relationId(log.company) || relationId(lead?.company);
    const fact = facts.get(companyId);
    if (!fact) continue;
    if (log.status === 'Odbijeno') fact.blocked = true;
    else if (['Poslano', 'Otvoreno', 'Odgovoreno'].includes(log.status)) {
      fact.contacted = true;
      if (log.contacted_at && (!fact.contactedAt || log.contacted_at > fact.contactedAt)) {
        fact.contactedAt = log.contacted_at;
      }
    } else if (log.status === 'Greška') {
      fact.failed = true;
      fact.error ||= log.outcome || 'Postojeća greška slanja';
    }
  }

  return companies.map((company) => {
    const fact = facts.get(company.$id);
    let status = 'pending';
    if (!String(company.email || '').trim()) status = 'ineligible';
    if (fact.failed) status = 'failed';
    if (fact.contacted) status = 'contacted';
    if (fact.blocked) status = 'blocked';
    return { company, fact, status };
  });
}

async function backfill() {
  const [companies, leads, logs] = await Promise.all([
    listAllRows(COMPANY_TABLE),
    listAllRows('leads'),
    listAllRows('contact_logs'),
  ]);
  const classified = classifyCompanies(companies, leads, logs);
  const counts = {};

  for (const item of classified) {
    counts[item.status] = (counts[item.status] || 0) + 1;
    const companyData = {
      outreach_status: item.status,
      outreach_claimed_at: null,
      outreach_execution_id: null,
      outreach_last_error: item.status === 'failed' ? String(item.fact.error || 'Postojeća greška').slice(0, 512) : null,
    };
    if (item.fact.contactedAt) companyData.outreach_contacted_at = item.fact.contactedAt;
    await tables.updateRow({
      databaseId,
      tableId: COMPANY_TABLE,
      rowId: item.company.$id,
      data: companyData,
    });

    if (TERMINAL_STATUSES.has(item.status)) {
      try {
        await tables.createRow({
          databaseId,
          tableId: CLAIM_TABLE,
          rowId: item.company.$id,
          data: {
            company_id: item.company.$id,
            status: item.status,
            completed_at: item.fact.contactedAt || item.company.$updatedAt,
            last_error: item.status === 'failed' ? String(item.fact.error || 'Postojeća greška').slice(0, 512) : null,
          },
        });
      } catch (error) {
        if (error.code !== 409) throw error;
      }
    }
  }

  console.log(JSON.stringify({ migrated: classified.length, counts }, null, 2));
}

async function verify() {
  const companies = await listAllRows(COMPANY_TABLE);
  const claims = await listAllRows(CLAIM_TABLE);
  const followupClaims = await listAllRows(FOLLOWUP_CLAIM_TABLE);
  const counts = companies.reduce((result, company) => {
    const status = company.outreach_status || '(null)';
    result[status] = (result[status] || 0) + 1;
    return result;
  }, {});
  const eligible = companies.filter(
    (company) => company.outreach_status === 'pending' && String(company.email || '').trim()
  );
  console.log(JSON.stringify({ companies: companies.length, claims: claims.length, followupClaims: followupClaims.length, counts, eligible: eligible.length }, null, 2));
}

(async () => {
  await ensureSchema();
  await backfill();
  await backfillFollowupClaims();
  await verify();
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
