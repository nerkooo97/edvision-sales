const fs = require('fs');
const path = require('path');

const localPath = path.join(__dirname, '..', 'n8n', 'Kompletan Sales Sistem (ED Vision).local.json');
const gitPath = path.join(__dirname, '..', 'n8n', 'Kompletan Sales Sistem (ED Vision).json');

function fixAllConnections(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const wf = JSON.parse(content);

  // 1. Fix Outreach Schedule Trigger connection
  const outreachTriggerNode = wf.nodes.find(n => n.type === 'n8n-nodes-base.scheduleTrigger' && (n.name.includes('15m') || n.name.includes('09:00') || n.name.includes('07:00')));
  if (outreachTriggerNode) {
    const triggerName = outreachTriggerNode.name;
    delete wf.connections['Schedule Trigger (09:00h)1'];
    wf.connections[triggerName] = {
      main: [
        [
          {
            node: 'Appwrite: Uzmi firme (companies)1',
            type: 'main',
            index: 0
          }
        ]
      ]
    };
  }

  // 2. Fix Follow-up Schedule Trigger connection
  const followUpTriggerNode = wf.nodes.find(n => n.type === 'n8n-nodes-base.scheduleTrigger' && (n.name.includes('Follow-up') || n.name.includes('07:30') || n.name.includes('30 min')));
  if (followUpTriggerNode) {
    const triggerName = followUpTriggerNode.name;
    delete wf.connections['Schedule Trigger (10:00h Follow-up)1'];
    delete wf.connections['Schedule Trigger (Svakih 30 min)1'];
    wf.connections[triggerName] = {
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
  }

  fs.writeFileSync(filePath, JSON.stringify(wf, null, 2), 'utf-8');
  console.log(`Cleaned and fixed all connections in ${path.basename(filePath)}!`);
}

fixAllConnections(localPath);
fixAllConnections(gitPath);

require('./sanitize-github-workflow.js');
