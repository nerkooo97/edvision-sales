const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const localPath = path.join(__dirname, '..', 'n8n', 'Kompletan Sales Sistem (ED Vision).local.json');
const gitPath = path.join(__dirname, '..', 'n8n', 'Kompletan Sales Sistem (ED Vision).json');

function setMaxLimitForFullScan(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const wf = JSON.parse(content);

  const appwriteCompaniesNode = wf.nodes.find(n => n.name.includes('Uzmi firme (companies)'));
  if (appwriteCompaniesNode) {
    appwriteCompaniesNode.parameters.queryParameters = {
      parameters: [
        {
          name: 'limit',
          value: '500'
        },
        {
          name: 'queries[0]',
          value: '{"method":"isNotNull","attribute":"email"}'
        }
      ]
    };
  }

  fs.writeFileSync(filePath, JSON.stringify(wf, null, 2), 'utf-8');
  console.log(`Set limit 500 in ${path.basename(filePath)}!`);
}

setMaxLimitForFullScan(localPath);
setMaxLimitForFullScan(gitPath);

require('./sanitize-github-workflow.js');
