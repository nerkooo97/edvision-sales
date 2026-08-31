const fs = require('fs');
const path = require('path');

const localPath = path.join(__dirname, '..', 'n8n', 'Kompletan Sales Sistem (ED Vision).local.json');
const gitPath = path.join(__dirname, '..', 'n8n', 'Kompletan Sales Sistem (ED Vision).json');

function fixTriggerConnections(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const wf = JSON.parse(content);

  // Trigger Node Name
  const triggerNode = wf.nodes.find(n => n.type === 'n8n-nodes-base.scheduleTrigger' && n.name.includes('Follow-up'));
  const triggerName = triggerNode ? triggerNode.name : 'Schedule Trigger (Svakih 30 min)1';

  // 1. Connect Schedule Trigger -> IMAP
  wf.connections[triggerName] = {
    main: [
      [
        {
          node: 'IMAP: Povuci nove emailove iz Inboxa1',
          type: 'main',
          index: 0
        }
      ]
    ]
  };

  // 2. Connect Webhook: Ručni Follow-up1 -> IMAP
  wf.connections['Webhook: Ručni Follow-up1'] = {
    main: [
      [
        {
          node: 'IMAP: Povuci nove emailove iz Inboxa1',
          type: 'main',
          index: 0
        }
      ]
    ]
  };

  // 3. Connect IMAP -> Appwrite: Uzmi poslata pisma za provjeru1
  wf.connections['IMAP: Povuci nove emailove iz Inboxa1'] = {
    main: [
      [
        {
          node: 'Appwrite: Uzmi poslata pisma za provjeru1',
          type: 'main',
          index: 0
        }
      ]
    ]
  };

  // Clean old keys if any
  delete wf.connections['Schedule Trigger (10:00h Follow-up)1'];

  fs.writeFileSync(filePath, JSON.stringify(wf, null, 2), 'utf-8');
  console.log(`Updated trigger connections in ${path.basename(filePath)}!`);
}

fixTriggerConnections(localPath);
fixTriggerConnections(gitPath);

// Also run sanitize
require('./sanitize-github-workflow.js');
