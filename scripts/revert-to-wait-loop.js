const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const localPath = path.join(__dirname, '..', 'n8n', 'Kompletan Sales Sistem (ED Vision).local.json');
const gitPath = path.join(__dirname, '..', 'n8n', 'Kompletan Sales Sistem (ED Vision).json');

function setWaitLoop(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const wf = JSON.parse(content);

  // 1. Change trigger to once a day at 07:00 (instead of every 15m)
  const outreachTrigger = wf.nodes.find(n => n.name.includes('Schedule Trigger (07:00'));
  if (outreachTrigger) {
    outreachTrigger.parameters = {
      rule: {
        interval: [
          {
            field: "days",
            triggerAtHour: 7,
            triggerAtMinute: 0
          }
        ]
      }
    };
    outreachTrigger.name = "Schedule Trigger (07:00h dnevno)";
  }

  // 2. Change Limit to 50 (since it runs once a day, it processes 50 firms per day with 15m wait = 12.5 hours)
  const appwriteFetch = wf.nodes.find(n => n.name === 'Appwrite: Uzmi firme (companies)1');
  if (appwriteFetch) {
    const limitParam = appwriteFetch.parameters.queryParameters.parameters.find(p => p.name === 'queries[2]');
    if (limitParam) {
      limitParam.value = '{"method":"limit","values":[50]}';
    } else {
      appwriteFetch.parameters.queryParameters.parameters.push({ name: 'queries[2]', value: '{"method":"limit","values":[50]}' });
    }
  }

  // 3. Remove "Završi Ciklus" node
  wf.nodes = wf.nodes.filter(n => !n.name.includes('Završi Ciklus'));
  delete wf.connections['Završi Ciklus (1 Email Poslan)'];

  // 4. Add "Wait (15m Pauza)" node
  let waitNode = wf.nodes.find(n => n.name === 'Wait (15m Pauza)');
  if (!waitNode) {
    waitNode = {
      parameters: {
        amount: 15,
        unit: "minutes"
      },
      id: "wait-15m-node-id",
      name: "Wait (15m Pauza)",
      type: "n8n-nodes-base.wait",
      typeVersion: 1,
      position: [
        -36400,
        18896
      ],
      webhookId: "wait-webhook-id-" + Date.now()
    };
    wf.nodes.push(waitNode);
  }

  // 5. Connect Evidentiraj u Dnevnik to Wait
  wf.connections['Appwrite: Evidentiraj u Dnevnik (contact_logs)1'] = {
    main: [
      [ { node: "Wait (15m Pauza)", type: "main", index: 0 } ]
    ]
  };

  // 6. Connect Wait to Loop Over Firme1
  wf.connections['Wait (15m Pauza)'] = {
    main: [
      [ { node: "Loop Over Firme1", type: "main", index: 0 } ]
    ]
  };

  fs.writeFileSync(filePath, JSON.stringify(wf, null, 2), 'utf-8');
  console.log(`Reverted to Wait Loop logic in ${path.basename(filePath)}`);
}

setWaitLoop(localPath);
setWaitLoop(gitPath);
require('./sanitize-github-workflow.js');
