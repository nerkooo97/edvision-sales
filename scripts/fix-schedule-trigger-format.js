const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const localPath = path.join(__dirname, '..', 'n8n', 'Kompletan Sales Sistem (ED Vision).local.json');
const gitPath = path.join(__dirname, '..', 'n8n', 'Kompletan Sales Sistem (ED Vision).json');

function fixScheduleTriggers(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const wf = JSON.parse(content);

  // 1. Outreach trigger: Every 15 minutes natively
  const outreachTrigger = wf.nodes.find(n => n.name.includes('07:00-18:00h') || n.name.includes('Outreach'));
  if (outreachTrigger) {
    outreachTrigger.parameters = {
      rule: {
        interval: [
          {
            field: "minutes",
            minutesInterval: 15
          }
        ]
      }
    };
  }

  // 2. Follow-up trigger: Twice daily (07:30 and 17:00)
  const followupTrigger = wf.nodes.find(n => n.name.includes('Follow-up') && n.type.includes('schedule'));
  if (followupTrigger) {
    followupTrigger.parameters = {
      rule: {
        interval: [
          {
            triggerAtHour: 7,
            triggerAtMinute: 30
          },
          {
            triggerAtHour: 17,
            triggerAtMinute: 0
          }
        ]
      }
    };
  }

  fs.writeFileSync(filePath, JSON.stringify(wf, null, 2), 'utf-8');
  console.log(`Updated schedule trigger format in ${path.basename(filePath)}!`);
}

fixScheduleTriggers(localPath);
fixScheduleTriggers(gitPath);

require('./sanitize-github-workflow.js');
