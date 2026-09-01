const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const localPath = path.join(__dirname, '..', 'n8n', 'Kompletan Sales Sistem (ED Vision).local.json');
const gitPath = path.join(__dirname, '..', 'n8n', 'Kompletan Sales Sistem (ED Vision).json');
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY || '';

if (!APPWRITE_API_KEY) {
  throw new Error('APPWRITE_API_KEY is required in .env.local');
}

function addBounceHandling(filePath, appwriteKey) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const wf = JSON.parse(content);

  // 1. Update Set: Pametno Matchiranje Odgovora
  const setMatchNode = wf.nodes.find(n => n.name === 'Set: Pametno Matchiranje Odgovora');
  if (setMatchNode) {
    setMatchNode.parameters.jsonOutput = `={{ (() => {
const log = (typeof $json === 'object' && $json !== null) ? $json : {};
let incomingEmails = [];
try {
  incomingEmails = $('IMAP: Povuci nove emailove iz Inboxa1').all().map(i => i.json).filter(e => e && (e.from || e.text || e.html || e.subject));
} catch(e) {}

const now = new Date();
const fourDaysAgo = new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000);
const sentDateStr = log.contacted_at || log.$createdAt;
const sentDate = sentDateStr ? new Date(sentDateStr) : null;
const recipientEmail = (log.recipient || '').trim().toLowerCase();
const recipientDomain = (recipientEmail.includes('@') && !['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'bih.net.ba'].includes(recipientEmail.split('@')[1])) 
  ? recipientEmail.split('@')[1] 
  : null;

let matchedReply = null;
let hasBounced = false;

if (recipientEmail) {
  for (const email of incomingEmails) {
    let fromStr = '';
    if (typeof email.from === 'string') {
      fromStr = email.from;
    } else if (email.from?.text) {
      fromStr = email.from.text;
    } else if (Array.isArray(email.from?.value)) {
      fromStr = email.from.value.map(v => v.address || v.name || '').join(' ');
    } else {
      fromStr = JSON.stringify(email.from || '');
    }
    fromStr = fromStr.toLowerCase();
    
    const emailSubject = (email.subject || '').toLowerCase();
    const emailBody = (email.text || email.html || '').toLowerCase();
    const emailDate = email.date ? new Date(email.date) : (email.headers?.date ? new Date(email.headers.date) : new Date());
    
    if (sentDate && emailDate.getTime() < (sentDate.getTime() - 300000)) continue;

    // Check for BOUNCE (Undelivered Mail)
    if (fromStr.includes('mailer-daemon') || fromStr.includes('postmaster') || emailSubject.includes('undelivered') || emailSubject.includes('returned to sender') || emailSubject.includes('delivery failure')) {
      if (emailBody.includes(recipientEmail) || emailSubject.includes(recipientEmail)) {
        hasBounced = true;
        continue;
      }
    }

    let isMatch = false;
    if (fromStr.includes(recipientEmail)) {
      isMatch = true;
    }
    if (!isMatch && recipientDomain && fromStr.includes('@' + recipientDomain)) {
      const origSub = (log.subject || '').toLowerCase().replace(/^(re|fwd|odg):\\s*/i, '').trim();
      if (emailSubject.includes('re:') || (origSub && emailSubject.includes(origSub.substring(0, 15)))) {
        isMatch = true;
      }
    }
    if (!isMatch && log.subject) {
      const cleanOrigSub = (log.subject || '').toLowerCase().replace(/^(re|fwd|odg):\\s*/i, '').trim();
      if (cleanOrigSub.length > 8 && emailSubject.includes(cleanOrigSub)) {
        isMatch = true;
      }
    }

    if (isMatch) {
      matchedReply = email;
      break;
    }
  }
}

return {
  log,
  has_replied: Boolean(matchedReply),
  is_bounced: hasBounced,
  is_ready_for_whatsapp: sentDate ? (sentDate <= fourDaysAgo) : false,
  reply_subject: matchedReply?.subject || '',
  reply_date: matchedReply?.date || '',
  reply_from: (typeof matchedReply?.from === 'object' ? (matchedReply?.from?.text || matchedReply?.from?.value?.[0]?.address) : matchedReply?.from) || ''
};
})() }}`;
  }

  // 2. Add IF: Email Bounced node
  let bounceIfNode = wf.nodes.find(n => n.name === 'IF: Email Bounced?');
  if (!bounceIfNode) {
    bounceIfNode = {
      parameters: {
        conditions: {
          options: {
            caseSensitive: true,
            leftValue: "",
            typeValidation: "strict",
            version: 2
          },
          conditions: [
            {
              leftValue: "={{ Boolean($json.is_bounced) }}",
              rightValue: true,
              operator: {
                type: "boolean",
                operation: "equals"
              },
              id: "bounce-if-id"
            }
          ],
          combinator: "and"
        },
        options: {}
      },
      id: "if-email-bounced-node-uuid",
      name: "IF: Email Bounced?",
      type: "n8n-nodes-base.if",
      typeVersion: 2.2,
      position: [
        -39440,
        20256
      ]
    };
    wf.nodes.push(bounceIfNode);
  }

  // 3. Add Appwrite: Update Lead to Bounce node
  let updateLeadBounceNode = wf.nodes.find(n => n.name === 'Appwrite: Ažuriraj Lead -> Greška');
  if (!updateLeadBounceNode) {
    updateLeadBounceNode = {
      parameters: {
        method: "PATCH",
        url: "https://appwrite.ed-vision.com/v1/databases/6a7dd77a002b3913d433/collections/leads/documents/{{ $json.log?.lead?.$id || $json.log?.lead }}",
        sendHeaders: true,
        headerParameters: {
          parameters: [
            { name: "X-Appwrite-Project", value: "6a7dd764002484e4cc47" },
            { name: "X-Appwrite-Key", value: appwriteKey }
          ]
        },
        sendBody: true,
        specifyBody: "json",
        jsonBody: "={{ JSON.stringify({ status: 'Greška - Nepostojeći email' }) }}",
        options: { response: { response: { neverError: true } } }
      },
      id: "appwrite-lead-bounce-update-node",
      name: "Appwrite: Ažuriraj Lead -> Greška",
      type: "n8n-nodes-base.httpRequest",
      typeVersion: 4.2,
      position: [
        -39152,
        20176
      ]
    };
    wf.nodes.push(updateLeadBounceNode);
  }

  // 4. Add Appwrite: Update Contact Log to Bounce node
  let updateLogBounceNode = wf.nodes.find(n => n.name === 'Appwrite: Ažuriraj Dnevnik -> Greška');
  if (!updateLogBounceNode) {
    updateLogBounceNode = {
      parameters: {
        method: "PATCH",
        url: "https://appwrite.ed-vision.com/v1/databases/6a7dd77a002b3913d433/collections/contact_logs/documents/{{ $json.log?.['$id'] }}",
        sendHeaders: true,
        headerParameters: {
          parameters: [
            { name: "X-Appwrite-Project", value: "6a7dd764002484e4cc47" },
            { name: "X-Appwrite-Key", value: appwriteKey }
          ]
        },
        sendBody: true,
        specifyBody: "json",
        jsonBody: "={{ JSON.stringify({ status: 'Greška', outcome: 'Bounce - Undelivered Mail Returned to Sender' }) }}",
        options: { response: { response: { neverError: true } } }
      },
      id: "appwrite-log-bounce-update-node",
      name: "Appwrite: Ažuriraj Dnevnik -> Greška",
      type: "n8n-nodes-base.httpRequest",
      typeVersion: 4.2,
      position: [
        -38896,
        20176
      ]
    };
    wf.nodes.push(updateLogBounceNode);
  }

  // 5. Wire connections
  // Connect false branch of IF: Da li je klijent odgovorio?1 to IF: Email Bounced?
  wf.connections['IF: Da li je klijent odgovorio?1'] = {
    main: [
      [ { node: "Appwrite: Ažuriraj Lead -> U pregovorima1", type: "main", index: 0 } ],
      [ { node: "IF: Email Bounced?", type: "main", index: 0 } ]
    ]
  };

  // Connect IF: Email Bounced? true to Update Lead Bounce, false to IF: Spreman za WhatsApp
  wf.connections['IF: Email Bounced?'] = {
    main: [
      [ { node: "Appwrite: Ažuriraj Lead -> Greška", type: "main", index: 0 } ],
      [ { node: "IF: Spreman za WhatsApp (Prošlo 4 dana)?1", type: "main", index: 0 } ]
    ]
  };

  wf.connections['Appwrite: Ažuriraj Lead -> Greška'] = {
    main: [
      [ { node: "Appwrite: Ažuriraj Dnevnik -> Greška", type: "main", index: 0 } ]
    ]
  };

  // Connect update log bounce back to loop
  wf.connections['Appwrite: Ažuriraj Dnevnik -> Greška'] = {
    main: [
      [ { node: "Loop Over Obrađene Kontakte1", type: "main", index: 0 } ]
    ]
  };

  fs.writeFileSync(filePath, JSON.stringify(wf, null, 2), 'utf-8');
  console.log(`Added bounce detection in ${path.basename(filePath)}`);
}

addBounceHandling(localPath, APPWRITE_API_KEY);
addBounceHandling(gitPath, 'standard_appwrite_key_here');
require('./sanitize-github-workflow.js');
