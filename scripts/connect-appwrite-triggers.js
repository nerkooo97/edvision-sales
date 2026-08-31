const fs = require('fs');
const path = require('path');

const localPath = path.join(__dirname, '..', 'n8n', 'Kompletan Sales Sistem (ED Vision).local.json');
const gitPath = path.join(__dirname, '..', 'n8n', 'Kompletan Sales Sistem (ED Vision).json');

function connectDirectlyToAppwrite(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const wf = JSON.parse(content);

  // 1. Connect Schedule Trigger directly to Appwrite
  wf.connections['Schedule Trigger (Svakih 30 min)1'] = {
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

  // 2. Connect Webhook: Ručni Follow-up1 directly to Appwrite
  wf.connections['Webhook: Ručni Follow-up1'] = {
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

  fs.writeFileSync(filePath, JSON.stringify(wf, null, 2), 'utf-8');
  console.log(`Updated Appwrite trigger connections in ${path.basename(filePath)}!`);
}

connectDirectlyToAppwrite(localPath);
connectDirectlyToAppwrite(gitPath);

require('./sanitize-github-workflow.js');
