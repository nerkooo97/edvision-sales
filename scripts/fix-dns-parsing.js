const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const localPath = path.join(__dirname, '..', 'n8n', 'Kompletan Sales Sistem (ED Vision).local.json');
const gitPath = path.join(__dirname, '..', 'n8n', 'Kompletan Sales Sistem (ED Vision).json');

function fixDnsParsing(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const wf = JSON.parse(content);

  const ifMxNode = wf.nodes.find(n => n.name === 'IF: Email domena postoji i ima MX?1');
  if (ifMxNode) {
    ifMxNode.parameters.conditions.conditions[0].leftValue = "={{ (() => { try { let res = $json; if (typeof res?.data === 'string') { try { res = JSON.parse(res.data); } catch(e) {} } else if (res?.data && typeof res.data === 'object') { res = res.data; } return Boolean(res && res.Status === 0 && Array.isArray(res.Answer) && res.Answer.length > 0); } catch(e) { return false; } })() }}";
  }

  fs.writeFileSync(filePath, JSON.stringify(wf, null, 2), 'utf-8');
  console.log(`Fixed DNS MX parsing in ${path.basename(filePath)}!`);
}

fixDnsParsing(localPath);
fixDnsParsing(gitPath);

require('./sanitize-github-workflow.js');
