const fs = require('fs');
const path = require('path');

const localPath = path.join(__dirname, '..', 'n8n', 'Kompletan Sales Sistem (ED Vision).local.json');
const gitPath = path.join(__dirname, '..', 'n8n', 'Kompletan Sales Sistem (ED Vision).json');

function setFollowupSchedule(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const wf = JSON.parse(content);

  const oldNamePattern = (name) => name.includes('Follow-up') || name.includes('30 min');
  const triggerNode = wf.nodes.find(n => n.type === 'n8n-nodes-base.scheduleTrigger' && oldNamePattern(n.name));
  
  const newName = 'Schedule Trigger (07:30h i 17:00h Follow-up)1';

  if (triggerNode) {
    const oldName = triggerNode.name;
    triggerNode.name = newName;
    triggerNode.parameters = {
      rule: {
        interval: [
          {
            field: 'cronExpression',
            expression: '30 7 * * *'
          },
          {
            field: 'cronExpression',
            expression: '0 17 * * *'
          }
        ]
      }
    };

    // Update connection
    delete wf.connections[oldName];
    delete wf.connections['Schedule Trigger (Svakih 30 min)1'];
    delete wf.connections['Schedule Trigger (10:00h Follow-up)1'];

    wf.connections[newName] = {
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
  console.log(`Updated Follow-up schedule (07:30h & 17:00h) in ${path.basename(filePath)}!`);
}

setFollowupSchedule(localPath);
setFollowupSchedule(gitPath);

require('./sanitize-github-workflow.js');
