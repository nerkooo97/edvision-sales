const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const localPath = path.join(__dirname, '..', 'n8n', 'Kompletan Sales Sistem (ED Vision).local.json');
const gitPath = path.join(__dirname, '..', 'n8n', 'Kompletan Sales Sistem (ED Vision).json');

function fixLoop(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const wf = JSON.parse(content);

  // Fix Loop Over Firme1 connections
  if (wf.connections['Loop Over Firme1']) {
    const loopConnections = wf.connections['Loop Over Firme1'].main;
    
    // Check if Appwrite is on branch 1 instead of branch 0
    let appwriteNode = null;
    if (loopConnections[1] && loopConnections[1].length > 0) {
      appwriteNode = loopConnections[1].find(n => n.node === 'Appwrite: Provjeri da li postoji lead1');
      if (appwriteNode) {
        // Remove it from branch 1
        loopConnections[1] = loopConnections[1].filter(n => n.node !== 'Appwrite: Provjeri da li postoji lead1');
      }
    }
    
    if (appwriteNode) {
      // Add it to branch 0
      if (!loopConnections[0]) loopConnections[0] = [];
      loopConnections[0].push(appwriteNode);
      console.log('Fixed Loop Over Firme1 connection (moved Appwrite to loop branch)!');
    }
  }

  // Also ensure IF: Lead još NE postoji? false branch goes to Loop Over Firme1 branch 0
  if (wf.connections['IF: Lead još NE postoji?1']) {
    const ifConnections = wf.connections['IF: Lead još NE postoji?1'].main;
    if (!ifConnections[1]) ifConnections[1] = [];
    
    const loopNode = ifConnections[1].find(n => n.node === 'Loop Over Firme1');
    if (!loopNode) {
      ifConnections[1].push({
        node: 'Loop Over Firme1',
        type: 'main',
        index: 0
      });
      console.log('Fixed IF: Lead još NE postoji?1 connection to Loop!');
    }
  }

  fs.writeFileSync(filePath, JSON.stringify(wf, null, 2), 'utf-8');
}

fixLoop(localPath);
fixLoop(gitPath);

require('./sanitize-github-workflow.js');
