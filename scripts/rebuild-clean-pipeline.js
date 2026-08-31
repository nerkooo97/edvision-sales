const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const localPath = path.join(__dirname, '..', 'n8n', 'Kompletan Sales Sistem (ED Vision).local.json');
const gitPath = path.join(__dirname, '..', 'n8n', 'Kompletan Sales Sistem (ED Vision).json');

function cleanWorkflowNodes(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const wf = JSON.parse(content);

  // 1. Remove orphaned Wait node
  wf.nodes = wf.nodes.filter(n => n.name !== 'Wait (5s Završna pauza)1');
  delete wf.connections['Wait (5s Završna pauza)1'];

  // 2. Connect Appwrite: Evidentiraj u Dnevnik to an end or clean finish
  // Ensure dead domain logging connects cleanly to loop or finishes
  
  fs.writeFileSync(filePath, JSON.stringify(wf, null, 2), 'utf-8');
  console.log(`Cleaned nodes in ${path.basename(filePath)}!`);
}

cleanWorkflowNodes(localPath);
cleanWorkflowNodes(gitPath);

require('./sanitize-github-workflow.js');
