/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const workflowPath = path.join(
  __dirname,
  '..',
  'n8n',
  'Kompletan Sales Sistem (ED Vision).json',
);

const workflow = JSON.parse(fs.readFileSync(workflowPath, 'utf8'));

function node(name) {
  const found = workflow.nodes.find((item) => item.name === name);
  assert(found, `Nedostaje čvor: ${name}`);
  return found;
}

function evaluateExpression(expression, json = {}, nodeData = {}) {
  const source = expression
    .replace(/^=\{\{\s*/, '')
    .replace(/\s*\}\}$/, '');
  const getNode = (name) => ({ item: { json: nodeData[name] || {} } });
  return Function('$json', '$', `return (${source});`)(json, getNode);
}

const normalizeExpression = node('Set: Normalizuj CompanyWall podatke')
  .parameters.jsonOutput;

const normalized = evaluateExpression(normalizeExpression, {
  $id: 'company-1',
  company_name: '  &quot;MUJE-COMERC&quot; d.o.o. Srebrenik  ',
  industry: 'H 49.41 - Cestovni prijevoz robe (49.41)',
  city: 'Srebrenik',
  email: 'test@example.com',
});

assert.strictEqual(normalized.company_name, 'MUJE-COMERC d.o.o. Srebrenik');
assert.strictEqual(normalized.industry, 'Cestovni prijevoz robe');
assert.strictEqual(normalized._messageData.locationPhrase, 'na području Srebrenika');

const apostropheName = evaluateExpression(normalizeExpression, {
  company_name: "O'NEILL d.o.o.",
  industry: 'Usluge',
  city: 'Nepoznata lokacija',
});

assert.strictEqual(apostropheName.company_name, "O'NEILL d.o.o.");
assert.strictEqual(apostropheName._messageData.locationPhrase, 'u vašoj regiji');

const normalizedNodeData = {
  'Set: Normalizuj CompanyWall podatke': normalized,
};
const noWebExpression = node('Set: Pripremi Lead (Bez weba)')
  .parameters.jsonOutput;
const noWebResult = evaluateExpression(noWebExpression, {}, normalizedNodeData);

assert(noWebResult.email_body.includes('na području Srebrenika'));
assert(noWebResult.email_body.includes('MUJE-COMERC d.o.o. Srebrenik'));
assert(!noWebResult.email_body.includes('MUJE-COMERC"'));
assert(!noWebResult.email_body.includes('na području Srebrenik,'));

const parseExpression = node('Set: Parsiraj OpenAI Analizu')
  .parameters.jsonOutput;
const aiResponse = {
  choices: [
    {
      message: {
        content: JSON.stringify({
          analysis: ['Test'],
          email_subject: 'Test',
          email_body: [
            'Poštovani,',
            '',
            'Prateći kompanije na području Srebrenik, primijetili smo priliku za unapređenje.',
            '',
            'Kada bi Vam odgovarao kratak razgovor?',
            '',
            'Srdačan pozdrav,',
          ].join('\n'),
        }),
      },
    },
  ],
};
const parsedResult = evaluateExpression(parseExpression, aiResponse, normalizedNodeData);

assert(parsedResult.email_body.includes('na području Srebrenika,'));
assert(!parsedResult.email_body.includes('na području Srebrenik,'));

console.log('CompanyWall normalizacija i zaštita padeža: OK');
