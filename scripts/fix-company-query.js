const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const localPath = path.join(__dirname, '..', 'n8n', 'Kompletan Sales Sistem (ED Vision).local.json');
const gitPath = path.join(__dirname, '..', 'n8n', 'Kompletan Sales Sistem (ED Vision).json');

function fixCompanyQueryAndSingleSend(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const wf = JSON.parse(content);

  // 1. Update Appwrite: Uzmi firme (companies)1 to fetch companies with non-null emails
  const appwriteCompaniesNode = wf.nodes.find(n => n.name.includes('Uzmi firme (companies)'));
  if (appwriteCompaniesNode) {
    appwriteCompaniesNode.parameters.queryParameters = {
      parameters: [
        {
          name: 'limit',
          value: '100'
        },
        {
          name: 'queries[0]',
          value: '{"method":"orderDesc","attribute":"$createdAt"}'
        },
        {
          name: 'queries[1]',
          value: '{"method":"isNotNull","attribute":"email"}'
        }
      ]
    };
  }

  // 2. Disconnect Appwrite: Evidentiraj u Dnevnik from looping back so that exactly 1 email is sent per 15-min cycle
  // When an email is successfully sent, the execution finishes cleanly.
  // If an email has an invalid domain (error), it loops back to find the next valid company.
  delete wf.connections['Appwrite: Evidentiraj u Dnevnik (contact_logs)1'];
  const waitNode = wf.nodes.find(n => n.type === 'n8n-nodes-base.wait');
  if (waitNode) {
    delete wf.connections[waitNode.name];
  }

  // Ensure dead domains still loop back to find next company
  wf.connections['Appwrite: Evidentiraj Gresku Emaila (contact_logs)1'] = {
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
  console.log(`Updated company query and single-send flow in ${path.basename(filePath)}!`);
}

fixCompanyQueryAndSingleSend(localPath);
fixCompanyQueryAndSingleSend(gitPath);

require('./sanitize-github-workflow.js');
