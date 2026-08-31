const fs = require('fs');
const path = require('path');

const localPath = path.join(__dirname, '..', 'n8n', 'Kompletan Sales Sistem (ED Vision).local.json');
const gitPath = path.join(__dirname, '..', 'n8n', 'Kompletan Sales Sistem (ED Vision).json');

function setSchedule(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const wf = JSON.parse(content);

  // 1. Update Schedule Trigger to run every 15 mins between 07:00 and 18:00 (44 times daily)
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

  // 2. Update Appwrite: Uzmi firme to fetch 1 company per 15-min cycle (or custom if via webhook)
  const appwriteCompaniesNode = wf.nodes.find(n => n.name.includes('Uzmi firme (companies)'));
  if (appwriteCompaniesNode && appwriteCompaniesNode.parameters?.queryParameters?.parameters) {
    const limitParam = appwriteCompaniesNode.parameters.queryParameters.parameters.find(p => p.name === 'limit');
    if (limitParam) {
      limitParam.value = '={{ (() => {\n  let lim = 1;\n  try {\n    lim = $(\'Webhook: Ručno Pokretanje1\').item?.json?.body?.dailyLimit || 1;\n  } catch(e) {}\n  return String(lim);\n})() }}';
    }
  }

  // 3. Update Wait node to short pause (5 seconds) since the 15-min interval is handled by cron
  const waitNode = wf.nodes.find(n => n.name.includes('Wait'));
  if (waitNode) {
    waitNode.name = 'Wait (5s Završna pauza)1';
    waitNode.parameters = {
      amount: 5,
      unit: 'seconds'
    };
  }

  fs.writeFileSync(filePath, JSON.stringify(wf, null, 2), 'utf-8');
  console.log(`Updated 15-min schedule in ${path.basename(filePath)}!`);
}

setSchedule(localPath);
setSchedule(gitPath);

require('./sanitize-github-workflow.js');
