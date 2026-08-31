const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const localPath = path.join(__dirname, '..', 'n8n', 'Kompletan Sales Sistem (ED Vision).local.json');
const gitPath = path.join(__dirname, '..', 'n8n', 'Kompletan Sales Sistem (ED Vision).json');

function fixLoopBranch(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const wf = JSON.parse(content);

  // In n8n splitInBatches v3:
  // main[0] = Done branch
  // main[1] = Loop branch (where the batch items are output)
  wf.connections['Loop Over Firme1'] = {
    main: [
      [], // Done branch (empty, or actions when all 50 are done)
      [
        {
          node: "Appwrite: Provjeri da li postoji lead1",
          type: "main",
          index: 0
        }
      ]
    ]
  };

  // Ensure IF: Lead još NE postoji? false branch (lead already exists) goes back to Loop Over Firme1 input
  wf.connections['IF: Lead još NE postoji?1'] = {
    main: [
      [
        {
          node: "IF: Firma ima web stranicu?1",
          type: "main",
          index: 0
        }
      ],
      [
        {
          node: "Loop Over Firme1",
          type: "main",
          index: 0
        }
      ]
    ]
  };

  // Ensure Wait (15m Pauza) connects back to Loop Over Firme1 input
  wf.connections['Wait (15m Pauza)'] = {
    main: [
      [
        {
          node: "Loop Over Firme1",
          type: "main",
          index: 0
        }
      ]
    ]
  };

  fs.writeFileSync(filePath, JSON.stringify(wf, null, 2), 'utf-8');
  console.log(`Connected Loop Over Firme1 main[1] (loop branch) to Appwrite in ${path.basename(filePath)}!`);
}

fixLoopBranch(localPath);
fixLoopBranch(gitPath);

require('./sanitize-github-workflow.js');
