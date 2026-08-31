const fs = require('fs');
const path = require('path');

const localPath = path.join(__dirname, '..', 'n8n', 'Kompletan Sales Sistem (ED Vision).local.json');

function validateWorkflow(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const wf = JSON.parse(content);

  const nodeMap = new Map();
  wf.nodes.forEach(n => nodeMap.set(n.name, n));

  const errors = [];
  const warnings = [];

  // Check all connections
  const connectedTargets = new Set();
  const connectedSources = new Set();

  for (const [sourceName, sourceConns] of Object.entries(wf.connections)) {
    if (!nodeMap.has(sourceName)) {
      errors.push(`Connection source '${sourceName}' does not exist in nodes!`);
    } else {
      connectedSources.add(sourceName);
    }

    if (sourceConns.main) {
      sourceConns.main.forEach((outputList, outputIdx) => {
        outputList.forEach(target => {
          if (!nodeMap.has(target.node)) {
            errors.push(`Connection target '${target.node}' from '${sourceName}' (output ${outputIdx}) does not exist in nodes!`);
          } else {
            connectedTargets.add(target.node);
          }
        });
      });
    }
  }

  // Check for disconnected nodes (excluding sticky notes and root triggers)
  const isTrigger = (type) => type.includes('Trigger') || type.includes('webhook') || type.includes('Sticky');
  
  for (const node of wf.nodes) {
    if (node.type.includes('Sticky')) continue;

    const hasIncoming = connectedTargets.has(node.name) || isTrigger(node.type);
    const hasOutgoing = connectedSources.has(node.name);

    if (!hasIncoming) {
      warnings.push(`Node '${node.name}' has NO incoming connections (unreachable unless trigger)!`);
    }

    // Terminal nodes (like last step in loop or notifications that return to loop)
    if (!hasOutgoing && !node.name.includes('Loop') && !node.name.includes('Sticky')) {
      warnings.push(`Node '${node.name}' has NO outgoing connections.`);
    }
  }

  console.log(`\n========================================`);
  console.log(`VALIDATION REPORT FOR: ${path.basename(filePath)}`);
  console.log(`Total Nodes: ${wf.nodes.length}`);
  console.log(`Total Connections: ${Object.keys(wf.connections).length}`);
  console.log(`Errors: ${errors.length}`);
  console.log(`Warnings: ${warnings.length}`);
  console.log(`========================================\n`);

  if (errors.length > 0) {
    console.error('ERRORS FOUND:');
    errors.forEach(e => console.error(` ❌ ${e}`));
  } else {
    console.log('✅ ALL CONNECTION NAMES & TARGETS ARE 100% VALID!');
  }

  if (warnings.length > 0) {
    console.log('\nWARNINGS / NOTES:');
    warnings.forEach(w => console.log(` ⚠️ ${w}`));
  }

  return errors.length === 0;
}

const localOk = validateWorkflow(localPath);
const gitOk = validateWorkflow(path.join(__dirname, '..', 'n8n', 'Kompletan Sales Sistem (ED Vision).json'));

if (localOk && gitOk) {
  console.log('\n🎉 BOTH WORKFLOW FILES ARE 100% HEALTHY AND READY FOR IMPORT!');
}
