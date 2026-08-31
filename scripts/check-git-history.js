const { execSync } = require('child_process');
const content = execSync('git show "2c03007:n8n/Kompletan Sales Sistem (ED Vision).json"').toString();
const wf = JSON.parse(content);
console.log(JSON.stringify(wf.nodes.filter(n => n.type.includes('schedule')), null, 2));
