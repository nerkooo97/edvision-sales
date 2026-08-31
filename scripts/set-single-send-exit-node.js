const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const localPath = path.join(__dirname, '..', 'n8n', 'Kompletan Sales Sistem (ED Vision).local.json');
const gitPath = path.join(__dirname, '..', 'n8n', 'Kompletan Sales Sistem (ED Vision).json');

function setCleanSingleSendExitNode(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const wf = JSON.parse(content);

  // 1. Add a clean NoOp Finish node
  let finishNode = wf.nodes.find(n => n.name.includes('Završi Ciklus'));
  if (!finishNode) {
    finishNode = {
      parameters: {},
      id: "finish-cycle-single-email-node",
      name: "Završi Ciklus (1 Email Poslan)",
      type: "n8n-nodes-base.noOp",
      typeVersion: 1,
      position: [
        -36400,
        18896
      ]
    };
    wf.nodes.push(finishNode);
  }

  // 2. Connect Appwrite: Evidentiraj u Dnevnik to this finish node
  wf.connections['Appwrite: Evidentiraj u Dnevnik (contact_logs)1'] = {
    main: [
      [
        {
          node: 'Završi Ciklus (1 Email Poslan)',
          type: 'main',
          index: 0
        }
      ]
    ]
  };

  fs.writeFileSync(filePath, JSON.stringify(wf, null, 2), 'utf-8');
  console.log(`Configured clean single-send finish node in ${path.basename(filePath)}!`);
}

setCleanSingleSendExitNode(localPath);
setCleanSingleSendExitNode(gitPath);

require('./sanitize-github-workflow.js');
