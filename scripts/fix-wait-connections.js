const fs = require('fs');
const path = require('path');

const localPath = path.join(__dirname, '..', 'n8n', 'Kompletan Sales Sistem (ED Vision).local.json');
const gitPath = path.join(__dirname, '..', 'n8n', 'Kompletan Sales Sistem (ED Vision).json');

function fixWaitConnections(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const wf = JSON.parse(content);

  // Find wait node
  const waitNode = wf.nodes.find(n => n.type === 'n8n-nodes-base.wait');
  const waitNodeName = waitNode ? waitNode.name : 'Wait (5s Završna pauza)1';

  // 1. Connect Appwrite: Evidentiraj u Dnevnik (contact_logs)1 -> Wait node
  wf.connections['Appwrite: Evidentiraj u Dnevnik (contact_logs)1'] = {
    main: [
      [
        {
          node: waitNodeName,
          type: 'main',
          index: 0
        }
      ]
    ]
  };

  // 2. Connect Wait node -> Loop Over Firme1
  wf.connections[waitNodeName] = {
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

  // Remove old 'Wait (5s Warmup pauza)1' key if present
  delete wf.connections['Wait (5s Warmup pauza)1'];

  fs.writeFileSync(filePath, JSON.stringify(wf, null, 2), 'utf-8');
  console.log(`Fixed Wait connections in ${path.basename(filePath)}!`);
}

fixWaitConnections(localPath);
fixWaitConnections(gitPath);

require('./sanitize-github-workflow.js');
