/* eslint-disable @typescript-eslint/no-require-imports */
const { loadEnvConfig } = require('@next/env');
const { Client, TablesDB, Query } = require('node-appwrite');

loadEnvConfig(process.cwd());
const endpoint = process.env.APPWRITE_ENDPOINT || process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const projectId = process.env.APPWRITE_PROJECT_ID || process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
const databaseId = process.env.APPWRITE_DATABASE_ID || process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;
const apiKey = process.env.APPWRITE_API_KEY;
if (!endpoint || !projectId || !databaseId || !apiKey) throw new Error('Appwrite konfiguracija nije potpuna.');

const tables = new TablesDB(new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey));
const idKey = '$id';
const createdKey = '$createdAt';
const goodStatuses = new Set(['Poslano', 'Otvoreno', 'Otvorena']);

(async () => {
  const logs = await tables.listRows({ databaseId, tableId: 'contact_logs', queries: [Query.limit(500), Query.orderAsc(createdKey)] });
  let chosen;
  for (const log of logs.rows || []) {
    if (!goodStatuses.has(log.status) || log.channel !== 'Email') continue;
    const companyId = typeof log.company === 'string' ? log.company : log.company?.[idKey];
    if (!companyId) continue;
    const company = await tables.getRow({ databaseId, tableId: 'companies', rowId: companyId });
    const companyLogs = await tables.listRows({ databaseId, tableId: 'contact_logs', queries: [Query.limit(100), Query.equal('company', companyId)] });
    const hasSuccessfulWhatsApp = (companyLogs.rows || []).some((item) =>
      String(item.channel || '').toLowerCase() === 'whatsapp' &&
      ['poslano', 'isporučeno', 'delivered', 'sent'].includes(String(item.status || '').toLowerCase())
    );
    if (!hasSuccessfulWhatsApp) { chosen = { company, log }; break; }
  }
  if (!chosen) throw new Error('Nije pronađen siguran testni company.');
  const phones = Array.isArray(chosen.company.phones) ? chosen.company.phones.map(String) : [];
  if (!phones.some((phone) => phone.replace(/\D/g, '') === '38761306774')) phones.push('+38761306774');
  const updated = await tables.updateRow({
    databaseId,
    tableId: 'companies',
    rowId: chosen.company[idKey],
    data: { phones, whatsapp_opt_in: true },
  });
  console.log(JSON.stringify({
    updated: true,
    companyId: updated[idKey],
    companyName: updated.company_name,
    phones: updated.phones,
    whatsapp_opt_in: updated.whatsapp_opt_in,
    emailLogId: chosen.log[idKey],
    emailStatus: chosen.log.status,
    emailCreatedAt: chosen.log[createdKey],
  }, null, 2));
})().catch((error) => { console.error(error.message || error); process.exitCode = 1; });
