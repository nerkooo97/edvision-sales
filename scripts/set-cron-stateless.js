const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const localPath = path.join(__dirname, '..', 'n8n', 'Kompletan Sales Sistem (ED Vision).local.json');
const gitPath = path.join(__dirname, '..', 'n8n', 'Kompletan Sales Sistem (ED Vision).json');

function setCronStateless(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const wf = JSON.parse(content);

  // 1. Update Schedule Trigger to run every 15 mins between 07:00 and 18:00
  const triggerNode = wf.nodes.find(n => n.name.startsWith('Schedule Trigger') && !n.name.includes('Follow-up') && !n.name.includes('30 min'));
  if (triggerNode) {
    triggerNode.name = 'Schedule Trigger (07:00-18:00h svakih 15m)1';
    triggerNode.parameters = {
      rule: {
        interval: [
          {
            field: 'cronExpression',
            expression: '*/15 7-17 * * *'
          }
        ]
      }
    };
  }

  // 2. Fetch 50 firms limit in Appwrite is FINE (we just need enough to find 1 that is not contacted)
  const appwriteFetch = wf.nodes.find(n => n.name === 'Appwrite: Uzmi firme (companies)1');
  if (appwriteFetch) {
    const limitParam = appwriteFetch.parameters.queryParameters.parameters.find(p => p.name === 'queries[2]');
    if (limitParam) {
      limitParam.value = '{"method":"limit","values":[50]}';
    } else {
      appwriteFetch.parameters.queryParameters.parameters.push({ name: 'queries[2]', value: '{"method":"limit","values":[50]}' });
    }
  }

  // 3. Remove "Wait (15m Pauza)" node
  wf.nodes = wf.nodes.filter(n => n.name !== 'Wait (15m Pauza)');
  delete wf.connections['Wait (15m Pauza)'];

  // 4. Instead of Wait, we can add a simple "No Operation, do nothing" node to signify end of cycle
  // Actually, we can just leave the Evidentiraj u Dnevnik unconnected, but let's add a Stop node to make it clear.
  let stopNode = wf.nodes.find(n => n.name === 'Završi Ciklus (1 Email Poslan)');
  if (!stopNode) {
    stopNode = {
      parameters: {},
      id: "stop-cycle-node-id",
      name: "Završi Ciklus (1 Email Poslan)",
      type: "n8n-nodes-base.noOp",
      typeVersion: 1,
      position: [
        -36400,
        18896
      ]
    };
    wf.nodes.push(stopNode);
  }

  // 5. Connect Evidentiraj u Dnevnik to Stop Node
  wf.connections['Appwrite: Evidentiraj u Dnevnik (contact_logs)1'] = {
    main: [
      [ { node: "Završi Ciklus (1 Email Poslan)", type: "main", index: 0 } ]
    ]
  };

  // Ensure false branch of Lead NE postoji? goes back to Loop
  wf.connections['IF: Lead još NE postoji?1'] = {
    main: [
      [ { node: "IF: Firma ima web stranicu?1", type: "main", index: 0 } ],
      [ { node: "Loop Over Firme1", type: "main", index: 0 } ]
    ]
  };

  fs.writeFileSync(filePath, JSON.stringify(wf, null, 2), 'utf-8');
  console.log(`Updated to Stateless Cron logic in ${path.basename(filePath)}!`);
}

setCronStateless(localPath);
setCronStateless(gitPath);

require('./sanitize-github-workflow.js');
