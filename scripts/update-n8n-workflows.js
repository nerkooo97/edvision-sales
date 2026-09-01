const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const localPath = path.join(__dirname, '..', 'n8n', 'Kompletan Sales Sistem (ED Vision).local.json');
const gitPath = path.join(__dirname, '..', 'n8n', 'Kompletan Sales Sistem (ED Vision).json');
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY || '';

if (!APPWRITE_API_KEY) {
  throw new Error('APPWRITE_API_KEY is required in .env.local');
}

function updateWorkflow(filePath, isLocal) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const wf = JSON.parse(content);

  const appwriteKey = isLocal
    ? APPWRITE_API_KEY
    : 'standard_appwrite_key_here';

  // 1. Clean tracking pixel in 'SMTP: Posalji Email1'
  const smtpNode = wf.nodes.find(n => n.name === 'SMTP: Posalji Email1');
  if (smtpNode && smtpNode.parameters?.html) {
    smtpNode.parameters.html = smtpNode.parameters.html.replace(
      `<img src=\\"https://edvision.app.n8n.cloud/webhook/track-open?companyId=\${encodeURIComponent(company['$id'] || '')}&recipient=\${encodeURIComponent((company.email || '').trim())}\\" width=\\"1\\" height=\\"1\\" style=\\"display:none;width:1px;height:1px;border:0;outline:none;\\" alt=\\"\\" />`,
      ''
    );
  }

  // 2. Add DNS MX Check Node
  const dnsCheckNode = {
    parameters: {
      url: '={{ "https://cloudflare-dns.com/dns-query?name=" + encodeURIComponent(((() => { try { const e = ($(\'Loop Over Firme1\').item?.json?.email || \'\').trim(); return e.split(\'@\')[1] || \'\'; } catch(err) { return \'\'; } })())) + "&type=MX" }}',
      sendHeaders: true,
      headerParameters: {
        parameters: [
          {
            name: 'Accept',
            value: 'application/dns-json'
          }
        ]
      },
      options: {
        response: {
          response: {
            neverError: true
          }
        },
        timeout: 10000
      }
    },
    id: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
    name: 'HTTP Request: Provjera Email Domene (DNS MX)1',
    type: 'n8n-nodes-base.httpRequest',
    typeVersion: 4.2,
    position: [
      -34600,
      17248
    ]
  };

  // 3. Add IF Node for DNS MX Valid
  const ifMxValidNode = {
    parameters: {
      conditions: {
        options: {
          caseSensitive: true,
          leftValue: '',
          typeValidation: 'strict'
        },
        conditions: [
          {
            id: 'c1d2e3f4-a5b6-7c8d-9e0f-1a2b3c4d5e6f',
            leftValue: '={{ (() => { try { const res = $json; return (res.Status === 0 && Array.isArray(res.Answer) && res.Answer.length > 0); } catch(e) { return false; } })() }}',
            rightValue: true,
            operator: {
              type: 'boolean',
              operation: 'equals'
            }
          }
        ],
        combinator: 'and'
      },
      options: {}
    },
    id: 'f1e2d3c4-b5a6-7f8e-9d0c-1b2a3c4d5e6f',
    name: 'IF: Email domena postoji i ima MX?1',
    type: 'n8n-nodes-base.if',
    typeVersion: 2.2,
    position: [
      -34440,
      17248
    ]
  };

  // 4. Add Appwrite Log Error Node
  const logErrorNode = {
    parameters: {
      method: 'POST',
      url: 'https://appwrite.ed-vision.com/v1/databases/6a7dd77a002b3913d433/collections/contact_logs/documents',
      sendHeaders: true,
      headerParameters: {
        parameters: [
          {
            name: 'X-Appwrite-Project',
            value: '6a7dd764002484e4cc47'
          },
          {
            name: 'X-Appwrite-Key',
            value: appwriteKey
          }
        ]
      },
      sendBody: true,
      specifyBody: 'json',
      jsonBody: '={{ (() => {\n  let company = {};\n  try { company = $(\'Loop Over Firme1\').item?.json || {}; } catch(e) {}\n  let leadId = \'\';\n  try { leadId = $(\'Appwrite: Kreiraj Lead u bazi1\').item?.json?.[\'$id\'] || \'\'; } catch(e) {}\n  let errReason = \'Email domena ne postoji na internetu (DNS NXDOMAIN) ili nema aktivan mail server\';\n  try {\n    const dnsRes = $(\'HTTP Request: Provjera Email Domene (DNS MX)1\').item?.json;\n    if (dnsRes && dnsRes.Status === 3) {\n      errReason = \'Domena ne postoji na internetu (NXDOMAIN)\';\n    } else if (dnsRes && (!dnsRes.Answer || dnsRes.Answer.length === 0)) {\n      errReason = \'Domena nema podešene MX mail servere\';\n    }\n  } catch(e) {}\n  return JSON.stringify({\n    documentId: \'unique()\',\n    data: {\n      lead: leadId || company[\'$id\'] || \'nepoznato\',\n      company: company[\'$id\'] || \'nepoznato\',\n      channel: \'Email\',\n      recipient: (company.email || \'\').trim(),\n      subject: \'Obustavljeno slanje - nevažeća email domena\',\n      content: `Slanje emaila je automatski obustavljeno radi zaštite reputacije pošiljaoca. Razlog: ${errReason}. Email adresa: ${(company.email || \'\').trim()}`,\n      status: \'Greška\',\n      outcome: `Nevažeći email: ${errReason}`,\n      contacted_at: new Date().toISOString()\n    }\n  });\n})() }}',
      options: {
        response: {
          response: {
            neverError: true
          }
        }
      }
    },
    id: 'd4c3b2a1-0f9e-8d7c-6b5a-4f3e2d1c0b9a',
    name: 'Appwrite: Evidentiraj Gresku Emaila (contact_logs)1',
    type: 'n8n-nodes-base.httpRequest',
    typeVersion: 4.2,
    position: [
      -34224,
      17440
    ]
  };

  // Remove existing nodes if they were already added in earlier runs
  wf.nodes = wf.nodes.filter(
    n => !['HTTP Request: Provjera Email Domene (DNS MX)1', 'IF: Email domena postoji i ima MX?1', 'Appwrite: Evidentiraj Gresku Emaila (contact_logs)1'].includes(n.name)
  );

  // Add the 3 new nodes
  wf.nodes.push(dnsCheckNode);
  wf.nodes.push(ifMxValidNode);
  wf.nodes.push(logErrorNode);

  // Position adjustments for SMTP node
  if (smtpNode) {
    smtpNode.position = [-34224, 17160];
  }

  // Update connections
  wf.connections['IF: Firma ima email za slanje?1'] = {
    main: [
      [
        {
          node: 'HTTP Request: Provjera Email Domene (DNS MX)1',
          type: 'main',
          index: 0
        }
      ],
      [
        {
          node: 'Loop Over Firme1',
          type: 'main',
          index: 0
        }
      ]
    ]
  };

  wf.connections['HTTP Request: Provjera Email Domene (DNS MX)1'] = {
    main: [
      [
        {
          node: 'IF: Email domena postoji i ima MX?1',
          type: 'main',
          index: 0
        }
      ]
    ]
  };

  wf.connections['IF: Email domena postoji i ima MX?1'] = {
    main: [
      [
        {
          node: 'SMTP: Posalji Email1',
          type: 'main',
          index: 0
        }
      ],
      [
        {
          node: 'Appwrite: Evidentiraj Gresku Emaila (contact_logs)1',
          type: 'main',
          index: 0
        }
      ]
    ]
  };

  wf.connections['Appwrite: Evidentiraj Gresku Emaila (contact_logs)1'] = {
    main: [
      [
        {
          node: 'Loop Over Firme1',
          type: 'main',
          index: 0
        }
      ]
    ]
  };

  fs.writeFileSync(filePath, JSON.stringify(wf, null, 2), 'utf-8');
  console.log(`Updated ${path.basename(filePath)} successfully!`);
}

updateWorkflow(localPath, true);
updateWorkflow(gitPath, false);
