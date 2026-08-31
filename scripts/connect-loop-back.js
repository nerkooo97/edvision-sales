const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const localPath = path.join(__dirname, '..', 'n8n', 'Kompletan Sales Sistem (ED Vision).local.json');
const gitPath = path.join(__dirname, '..', 'n8n', 'Kompletan Sales Sistem (ED Vision).json');

function connectLoop(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const wf = JSON.parse(content);

  // Connect Appwrite: Evidentiraj u Dnevnik (contact_logs)1 to Loop Over Firme1
  wf.connections['Appwrite: Evidentiraj u Dnevnik (contact_logs)1'] = {
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

  fs.writeFileSync(filePath, JSON.stringify(wf, null, 2), 'utf-8');
  console.log(`Connected Evidentiraj u Dnevnik back to Loop Over Firme1 in ${path.basename(filePath)}!`);
}

connectLoop(localPath);
connectLoop(gitPath);

require('./sanitize-github-workflow.js');
