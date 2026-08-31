const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const localPath = path.join(__dirname, '..', 'n8n', 'Kompletan Sales Sistem (ED Vision).local.json');
const gitPath = path.join(__dirname, '..', 'n8n', 'Kompletan Sales Sistem (ED Vision).json');

function fixImapConnections(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const wf = JSON.parse(content);

  // 1. Connect Schedule Trigger (Follow-up) -> IMAP: Povuci nove emailove iz Inboxa1
  wf.connections['Schedule Trigger (07:30h i 17:00h Follow-up)1'] = {
    main: [
      [ { node: "IMAP: Povuci nove emailove iz Inboxa1", type: "main", index: 0 } ]
    ]
  };

  // 2. Connect Webhook: Ručni Follow-up1 -> IMAP: Povuci nove emailove iz Inboxa1
  wf.connections['Webhook: Ručni Follow-up1'] = {
    main: [
      [ { node: "IMAP: Povuci nove emailove iz Inboxa1", type: "main", index: 0 } ]
    ]
  };

  // 3. Connect IMAP: Povuci nove emailove iz Inboxa1 -> Appwrite: Uzmi poslata pisma za provjeru1
  wf.connections['IMAP: Povuci nove emailove iz Inboxa1'] = {
    main: [
      [ { node: "Appwrite: Uzmi poslata pisma za provjeru1", type: "main", index: 0 } ]
    ]
  };

  // 4. Update IMAP node options to ensure it catches read emails or recent emails
  const imapNode = wf.nodes.find(n => n.name.includes('IMAP: Povuci nove emailove'));
  if (imapNode) {
    // Make sure it reads properly
    imapNode.parameters = {
      ...imapNode.parameters,
      postProcessAction: "nothing",
      options: {
        ...(imapNode.parameters?.options || {}),
        downloadAttachments: false,
        allowUnauthorizedCerts: true
      }
    };
  }

  fs.writeFileSync(filePath, JSON.stringify(wf, null, 2), 'utf-8');
  console.log(`Fixed IMAP connections in ${path.basename(filePath)}!`);
}

fixImapConnections(localPath);
fixImapConnections(gitPath);

require('./sanitize-github-workflow.js');
