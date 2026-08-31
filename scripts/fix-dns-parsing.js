const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const localPath = path.join(__dirname, '..', 'n8n', 'Kompletan Sales Sistem (ED Vision).local.json');
const gitPath = path.join(__dirname, '..', 'n8n', 'Kompletan Sales Sistem (ED Vision).json');

function fixDnsParsing(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const wf = JSON.parse(content);

  // 1. Update IF: Email domena postoji i ima MX?1 to handle string or parsed object
  const ifDnsNode = wf.nodes.find(n => n.name.includes('IF: Email domena postoji i ima MX'));
  if (ifDnsNode && ifDnsNode.parameters?.conditions?.conditions?.[0]) {
    ifDnsNode.parameters.conditions.conditions[0].leftValue = `={{ (() => {
  try {
    let res = $json;
    if (typeof res.data === 'string') {
      try { res = JSON.parse(res.data); } catch(e) {}
    } else if (typeof res.body === 'string') {
      try { res = JSON.parse(res.body); } catch(e) {}
    }
    const hasMx = (res.Status === 0 && Array.isArray(res.Answer) && res.Answer.length > 0);
    return Boolean(hasMx);
  } catch(e) {
    return false;
  }
})() }}`;
  }

  // 2. Update error reason parsing in Appwrite: Evidentiraj Gresku Emaila
  const errLogNode = wf.nodes.find(n => n.name.includes('Evidentiraj Gresku Emaila'));
  if (errLogNode) {
    errLogNode.parameters.jsonBody = `={{ (() => {
  let company = {};
  try { company = $('Loop Over Firme1').item?.json || {}; } catch(e) {}
  let leadId = '';
  try { leadId = $('Appwrite: Kreiraj Lead u bazi1').item?.json?.['$id'] || ''; } catch(e) {}
  let errReason = 'Email domena ne postoji na internetu (DNS NXDOMAIN) ili nema aktivan mail server';
  try {
    let dnsRes = $('HTTP Request: Provjera Email Domene (DNS MX)1').item?.json;
    if (typeof dnsRes?.data === 'string') {
      try { dnsRes = JSON.parse(dnsRes.data); } catch(e) {}
    }
    if (dnsRes && dnsRes.Status === 3) {
      errReason = 'Domena ne postoji na internetu (NXDOMAIN)';
    } else if (dnsRes && (!dnsRes.Answer || dnsRes.Answer.length === 0)) {
      errReason = 'Domena nema podešene MX mail servere';
    }
  } catch(e) {}
  return JSON.stringify({
    documentId: 'unique()',
    data: {
      lead: leadId || company['$id'] || 'nepoznato',
      company: company['$id'] || 'nepoznato',
      channel: 'Email',
      recipient: (company.email || '').trim(),
      subject: 'Obustavljeno slanje - nevažeća email domena',
      content: \`Slanje emaila je automatski obustavljeno radi zaštite reputacije pošiljaoca. Razlog: \${errReason}. Email adresa: \${(company.email || '').trim()}\`,
      status: 'Greška',
      outcome: \`Nevažeći email: \${errReason}\`,
      contacted_at: new Date().toISOString()
    }
  });
})() }}`;
  }

  fs.writeFileSync(filePath, JSON.stringify(wf, null, 2), 'utf-8');
  console.log(`Fixed DNS response parsing in ${path.basename(filePath)}!`);
}

fixDnsParsing(localPath);
fixDnsParsing(gitPath);

require('./sanitize-github-workflow.js');
