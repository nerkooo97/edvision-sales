const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const localPath = path.join(__dirname, '..', 'n8n', 'Kompletan Sales Sistem (ED Vision).local.json');
const gitPath = path.join(__dirname, '..', 'n8n', 'Kompletan Sales Sistem (ED Vision).json');

function setMaxLimit(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const wf = JSON.parse(content);

  const appwriteFetch = wf.nodes.find(n => n.name === 'Appwrite: Uzmi firme (companies)1');
  if (appwriteFetch) {
    const limitParam = appwriteFetch.parameters.queryParameters.parameters.find(p => p.name === 'queries[2]');
    if (limitParam) {
      limitParam.value = '{"method":"limit","values":[5000]}';
    } else {
      appwriteFetch.parameters.queryParameters.parameters.push({ name: 'queries[2]', value: '{"method":"limit","values":[5000]}' });
    }
  }

  fs.writeFileSync(filePath, JSON.stringify(wf, null, 2), 'utf-8');
  console.log(`Updated Appwrite limit to 5000 in ${path.basename(filePath)}!`);
}

setMaxLimit(localPath);
setMaxLimit(gitPath);

require('./sanitize-github-workflow.js');
