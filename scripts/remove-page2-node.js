const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const localPath = path.join(__dirname, '..', 'n8n', 'Kompletan Sales Sistem (ED Vision).local.json');
const gitPath = path.join(__dirname, '..', 'n8n', 'Kompletan Sales Sistem (ED Vision).json');

function removePage2(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const wf = JSON.parse(content);

  // 1. Remove Page 2 node
  wf.nodes = wf.nodes.filter(n => n.name !== 'Appwrite: Uzmi firme (Page 2)');
  delete wf.connections['Appwrite: Uzmi firme (Page 2)'];

  // 2. Configure single Appwrite: Uzmi firme (companies)1 with orderDesc and isNotNull email
  const page1Node = wf.nodes.find(n => n.name === 'Appwrite: Uzmi firme (companies)1');
  if (page1Node) {
    page1Node.parameters.queryParameters = {
      parameters: [
        { name: 'queries[0]', value: '{"method":"isNotNull","attribute":"email"}' },
        { name: 'queries[1]', value: '{"method":"orderDesc","attribute":"$createdAt"}' },
        { name: 'queries[2]', value: '{"method":"limit","values":[100]}' }
      ]
    };
  }

  // 3. Connect triggers ONLY to single Appwrite: Uzmi firme (companies)1
  const outreachTrigger = wf.nodes.find(n => n.name.includes('07:00-18:00h') || n.name.includes('Outreach'));
  if (outreachTrigger) {
    wf.connections[outreachTrigger.name] = {
      main: [
        [
          { node: 'Appwrite: Uzmi firme (companies)1', type: 'main', index: 0 }
        ]
      ]
    };
  }

  wf.connections['Webhook: Ručno Pokretanje1'] = {
    main: [
      [
        { node: 'Appwrite: Uzmi firme (companies)1', type: 'main', index: 0 }
      ]
    ]
  };

  fs.writeFileSync(filePath, JSON.stringify(wf, null, 2), 'utf-8');
  console.log(`Removed Page 2 and set clean single query in ${path.basename(filePath)}!`);
}

removePage2(localPath);
removePage2(gitPath);

require('./sanitize-github-workflow.js');
