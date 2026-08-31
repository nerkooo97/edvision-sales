const fs = require('fs');
const path = require('path');

const localPath = path.join(__dirname, '..', 'n8n', 'Kompletan Sales Sistem (ED Vision).local.json');
const gitPath = path.join(__dirname, '..', 'n8n', 'Kompletan Sales Sistem (ED Vision).json');

function optimizeImapNode(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const wf = JSON.parse(content);

  const imapNode = wf.nodes.find(n => n.type === 'n8n-nodes-base.emailReadImap');
  if (imapNode) {
    imapNode.parameters = {
      postProcessAction: 'nothing',
      options: {
        downloadAttachments: false,
        allowUnauthorizedCerts: true
      }
    };
  }

  fs.writeFileSync(filePath, JSON.stringify(wf, null, 2), 'utf-8');
  console.log(`Optimized IMAP node in ${path.basename(filePath)}!`);
}

optimizeImapNode(localPath);
optimizeImapNode(gitPath);

require('./sanitize-github-workflow.js');
