const fs = require('fs');
const path = require('path');

const localPath = path.join(__dirname, '..', 'n8n', 'Kompletan Sales Sistem (ED Vision).local.json');
const gitPath = path.join(__dirname, '..', 'n8n', 'Kompletan Sales Sistem (ED Vision).json');

function fixImapInWorkflow(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const wf = JSON.parse(content);

  // 1. Fix Appwrite query: Remove follow_up_date restriction
  const appwriteFetchNode = wf.nodes.find(n => n.name === 'Appwrite: Uzmi poslata pisma za provjeru1');
  if (appwriteFetchNode && appwriteFetchNode.parameters?.queryParameters?.parameters) {
    appwriteFetchNode.parameters.queryParameters.parameters = [
      {
        name: 'queries[0]',
        value: '{"method":"equal","attribute":"channel","values":["Email"]}'
      },
      {
        name: 'queries[1]',
        value: '{"method":"equal","attribute":"status","values":["Poslano","Otvoreno","Otvorena"]}'
      },
      {
        name: 'queries[2]',
        value: '{"method":"orderDesc","attribute":"$createdAt"}'
      },
      {
        name: 'limit',
        value: '100'
      }
    ];
  }

  // 2. Fix IMAP node: Fetch all messages (read + unread)
  const imapNode = wf.nodes.find(n => n.name === 'IMAP: Povuci nove emailove iz Inboxa1');
  if (imapNode) {
    imapNode.parameters = {
      options: {
        customEmailConfig: '["ALL"]',
        downloadAttachments: false
      },
      postProcessAction: 'nothing'
    };
  }

  // 3. Fix Smart Matching Node
  const matchNode = wf.nodes.find(n => n.name === 'Set: Pametno Matchiranje Odgovora');
  if (matchNode) {
    matchNode.parameters.jsonOutput = `={{ (() => {
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

    const emailDate = email.date ? new Date(email.date) : (email.headers?.date ? new Date(email.headers.date) : new Date());
    
    // Provjera da li email odgovara vremenski (nakon ili oko slanja)
    if (sentDate && emailDate.getTime() < (sentDate.getTime() - 300000)) continue;

    let isMatch = false;
    
    // 1. Direktno poklapanje email adrese pošiljaoca
    if (fromStr.includes(recipientEmail)) {
      isMatch = true;
    }
    
    // 2. Poklapanje po domeni firme
    if (!isMatch && recipientDomain && fromStr.includes('@' + recipientDomain)) {
      const replySub = (email.subject || '').toLowerCase();
      const origSub = (log.subject || '').toLowerCase().replace(/^(re|fwd|odg):\\s*/i, '').trim();
      if (replySub.includes('re:') || (origSub && replySub.includes(origSub.substring(0, 15)))) {
        isMatch = true;
      }
    }
    
    // 3. Poklapanje po naslovu (RE: Originalni Subject)
    if (!isMatch && log.subject) {
      const cleanOrigSub = (log.subject || '').toLowerCase().replace(/^(re|fwd|odg):\\s*/i, '').trim();
      const replySub = (email.subject || '').toLowerCase();
      if (cleanOrigSub.length > 8 && replySub.includes(cleanOrigSub)) {
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
  is_ready_for_whatsapp: sentDate ? (sentDate <= fourDaysAgo) : false,
  reply_subject: matchedReply?.subject || '',
  reply_date: matchedReply?.date || '',
  reply_from: (typeof matchedReply?.from === 'object' ? (matchedReply?.from?.text || matchedReply?.from?.value?.[0]?.address) : matchedReply?.from) || ''
};
})() }}`;
  }

  // 4. Update Trigger Schedule: Run every 30 minutes during business hours (or every 30m)
  const triggerNode = wf.nodes.find(n => n.name === 'Schedule Trigger (10:00h Follow-up)1');
  if (triggerNode && triggerNode.parameters?.rule?.interval?.[0]) {
    triggerNode.parameters.rule.interval[0] = {
      field: 'cronExpression',
      expression: '*/30 7-18 * * 1-5'
    };
    triggerNode.name = 'Schedule Trigger (Svakih 30 min)1';
  }

  fs.writeFileSync(filePath, JSON.stringify(wf, null, 2), 'utf-8');
  console.log(`Successfully fixed IMAP reply matching in ${path.basename(filePath)}!`);
}

fixImapInWorkflow(localPath);
fixImapInWorkflow(gitPath);
