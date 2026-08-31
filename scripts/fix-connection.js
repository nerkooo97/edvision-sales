const fs = require('fs');
const path = require('path');

const localPath = path.join(__dirname, '..', 'n8n', 'Kompletan Sales Sistem (ED Vision).local.json');
const gitPath = path.join(__dirname, '..', 'n8n', 'Kompletan Sales Sistem (ED Vision).json');

function fixConnection(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const wf = JSON.parse(content);

  // Fix connection rename
  if (wf.connections['Schedule Trigger (07:00-18:00h svakih 15m)1']) {
    wf.connections['Schedule Trigger (07:00h dnevno)'] = wf.connections['Schedule Trigger (07:00-18:00h svakih 15m)1'];
    delete wf.connections['Schedule Trigger (07:00-18:00h svakih 15m)1'];
  }

  fs.writeFileSync(filePath, JSON.stringify(wf, null, 2), 'utf-8');
}

fixConnection(localPath);
fixConnection(gitPath);
