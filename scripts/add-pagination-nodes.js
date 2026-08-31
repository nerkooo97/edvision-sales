const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const localPath = path.join(__dirname, '..', 'n8n', 'Kompletan Sales Sistem (ED Vision).local.json');
const gitPath = path.join(__dirname, '..', 'n8n', 'Kompletan Sales Sistem (ED Vision).json');

function addPaginationNodes(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const wf = JSON.parse(content);

  // 1. Configure Page 1 node
  const page1Node = wf.nodes.find(n => n.name === 'Appwrite: Uzmi firme (companies)1');
  if (page1Node) {
    page1Node.parameters.queryParameters = {
      parameters: [
        { name: 'queries[0]', value: '{"method":"isNotNull","attribute":"email"}' },
        { name: 'queries[1]', value: '{"method":"limit","values":[100]}' },
        { name: 'queries[2]', value: '{"method":"offset","values":[0]}' }
      ]
    };
  }

  // 2. Add or update Page 2 node
  let page2Node = wf.nodes.find(n => n.name === 'Appwrite: Uzmi firme (Page 2)');
  if (!page2Node) {
    page2Node = JSON.parse(JSON.stringify(page1Node));
    page2Node.id = 'page2-companies-node-id';
    page2Node.name = 'Appwrite: Uzmi firme (Page 2)';
    page2Node.position = [page1Node.position[0], page1Node.position[1] + 120];
    wf.nodes.push(page2Node);
  }

  page2Node.parameters.queryParameters = {
    parameters: [
      { name: 'queries[0]', value: '{"method":"isNotNull","attribute":"email"}' },
      { name: 'queries[1]', value: '{"method":"limit","values":[100]}' },
      { name: 'queries[2]', value: '{"method":"offset","values":[100]}' }
    ]
  };

  // 3. Connect triggers to Page 1 and Page 2
  const outreachTrigger = wf.nodes.find(n => n.type === 'n8n-nodes-base.scheduleTrigger' && (n.name.includes('15m') || n.name.includes('07:00')));
  if (outreachTrigger) {
    wf.connections[outreachTrigger.name] = {
      main: [
        [
          { node: 'Appwrite: Uzmi firme (companies)1', type: 'main', index: 0 },
          { node: 'Appwrite: Uzmi firme (Page 2)', type: 'main', index: 0 }
        ]
      ]
    };
  }

  wf.connections['Webhook: Ručno Pokretanje1'] = {
    main: [
      [
        { node: 'Appwrite: Uzmi firme (companies)1', type: 'main', index: 0 },
        { node: 'Appwrite: Uzmi firme (Page 2)', type: 'main', index: 0 }
      ]
    ]
  };

  // Connect both Page 1 and Page 2 to Split Out: Firme
  wf.connections['Appwrite: Uzmi firme (companies)1'] = {
    main: [
      [
        { node: 'Split Out: Firme', type: 'main', index: 0 }
      ]
    ]
  };

  wf.connections['Appwrite: Uzmi firme (Page 2)'] = {
    main: [
      [
        { node: 'Split Out: Firme', type: 'main', index: 0 }
      ]
    ]
  };

  fs.writeFileSync(filePath, JSON.stringify(wf, null, 2), 'utf-8');
  console.log(`Configured multi-page company scanning in ${path.basename(filePath)}!`);
}

addPaginationNodes(localPath);
addPaginationNodes(gitPath);

require('./sanitize-github-workflow.js');
