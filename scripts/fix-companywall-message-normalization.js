/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');

const NORMALIZE_NODE_NAME = 'Set: Normalizuj CompanyWall podatke';
const LOOP_NODE_NAME = 'Loop Over Firme1';
const FIRST_NODE_AFTER_LOOP = 'Appwrite: Provjeri da li postoji lead1';

const workflowPaths = [
  path.join(__dirname, '..', 'n8n', 'Kompletan Sales Sistem (ED Vision).json'),
  path.join(__dirname, '..', 'n8n', 'Kompletan Sales Sistem (ED Vision).local.json'),
];

const normalizationExpression = String.raw`={{ (() => {
const company = (typeof $json === 'object' && $json !== null) ? $json : {};

const normalizeText = (value) => String(value ?? '')
  .normalize('NFKC')
  .replace(/&quot;|&#0*34;|&#x0*22;/gi, '"')
  .replace(/&apos;|&#0*39;|&#x0*27;/gi, "'")
  .replace(/&nbsp;|&#0*160;|&#x0*a0;/gi, ' ')
  .replace(/[\u200B-\u200D\uFEFF]/g, '')
  .replace(/\s+/g, ' ')
  .trim();

const cleanCompanyName = normalizeText(company.company_name || 'Vaša kompanija')
  .replace(/\\+(["'„“”‟«»‘’‚‛])/g, '$1')
  .replace(/["„“”‟«»]/g, '')
  .replace(/[‘’‚‛]/g, "'")
  .replace(/^'+|'+$/g, '')
  .replace(/\s+([,.;:])/g, '$1')
  .replace(/\s+/g, ' ')
  .trim() || 'Vaša kompanija';

const cleanIndustry = normalizeText(company.industry)
  .replace(/^(?:[A-Z]\s*)?\d{1,4}(?:\.\d{1,4})?\s*[-:–—.]\s*/i, '')
  .replace(/\s*\([\d.-]+\)\s*$/, '')
  .replace(/["„“”‟«»]/g, '')
  .trim() || 'Vaše djelatnosti';

const cleanCity = normalizeText(company.city);
const cityCandidate = cleanCity
  .replace(/^\d{5}\s+/, '')
  .split(/\s*[,/|]\s*/)[0]
  .trim();
const fold = (value) => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase();

const cityGenitives = {
  'banja luka': 'Banje Luke',
  'banovici': 'Banovića',
  'bijeljina': 'Bijeljine',
  'bihac': 'Bihaća',
  'bosanska krupa': 'Bosanske Krupe',
  'brcko': 'Brčkog',
  'bugojno': 'Bugojna',
  'capljina': 'Čapljine',
  'cazin': 'Cazina',
  'derventa': 'Dervente',
  'doboj': 'Doboja',
  'foca': 'Foče',
  'gorazde': 'Goražda',
  'gradacac': 'Gradačca',
  'gradiska': 'Gradiške',
  'gracanica': 'Gračanice',
  'hadzici': 'Hadžića',
  'ilidza': 'Ilidže',
  'ilijas': 'Ilijaša',
  'jajce': 'Jajca',
  'kakanj': 'Kaknja',
  'kalesija': 'Kalesije',
  'kiseljak': 'Kiseljaka',
  'konjic': 'Konjica',
  'livno': 'Livna',
  'ljubuski': 'Ljubuškog',
  'lukavac': 'Lukavca',
  'maglaj': 'Maglaja',
  'mostar': 'Mostara',
  'novi grad': 'Novog Grada',
  'novi travnik': 'Novog Travnika',
  'odzak': 'Odžaka',
  'orasje': 'Orašja',
  'prijedor': 'Prijedora',
  'sarajevo': 'Sarajeva',
  'sanski most': 'Sanskog Mosta',
  'siroki brijeg': 'Širokog Brijega',
  'srebrenik': 'Srebrenika',
  'stari grad': 'Starog Grada',
  'tesanj': 'Tešnja',
  'travnik': 'Travnika',
  'trebinje': 'Trebinja',
  'tuzla': 'Tuzle',
  'velika kladusa': 'Velike Kladuše',
  'visoko': 'Visokog',
  'vitez': 'Viteza',
  'vogosca': 'Vogošće',
  'zavidovici': 'Zavidovića',
  'zenica': 'Zenice',
  'zivinice': 'Živinica',
  'zvornik': 'Zvornika'
};

const cityGenitive = cityGenitives[fold(cityCandidate)] || '';
const locationPhrase = cityGenitive
  ? 'na području ' + cityGenitive
  : 'u vašoj regiji';

return [{
  json: {
    ...company,
    company_name: cleanCompanyName,
    industry: cleanIndustry,
    city: cleanCity,
    _messageData: {
      companyName: cleanCompanyName,
      industry: cleanIndustry,
      city: cleanCity,
      cityBase: cityCandidate,
      cityGenitive,
      locationPhrase
    }
  }
}];
})()[0].json }}`;

const messageNodeNames = new Set([
  'Set: Pripremi AI Prompt',
  'Set: Parsiraj OpenAI Analizu',
  'Set: Pripremi Lead (Bez weba)',
  'SMTP: Posalji Email1',
  'Appwrite: Evidentiraj u Dnevnik (contact_logs)1',
]);

function transformStrings(value, transform) {
  if (typeof value === 'string') return transform(value);
  if (Array.isArray(value)) return value.map((item) => transformStrings(item, transform));
  if (!value || typeof value !== 'object') return value;

  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, transformStrings(item, transform)]),
  );
}

function updateMessageExpression(expression, nodeName) {
  let updated = expression.replaceAll(
    "$('Loop Over Firme1').item?.json",
    "$('Set: Normalizuj CompanyWall podatke').item?.json",
  );

  if (!updated.includes("const locationPhrase = company._messageData?.locationPhrase")) {
    updated = updated.replaceAll(
      "const cleanCity = (company.city || 'BiH').trim();",
      "const cleanCity = (company.city || 'BiH').trim();\nconst locationPhrase = company._messageData?.locationPhrase || 'u vašoj regiji';",
    );
  }

  updated = updated.replaceAll('na području ${cleanCity}', '${locationPhrase}');

  if (updated.includes('- Grad / Lokacija: ${cleanCity}')) {
    updated = updated.replace(
      '- Grad / Lokacija: ${cleanCity}',
      '- Grad / Lokacija: ${cleanCity || \'Nije navedena\'}\n- Sigurna fraza za lokaciju: ${locationPhrase}',
    );
  }

  if (
    updated.includes('STROGA PRAVILA ZA PRIRODAN JEZIK')
    && !updated.includes('PRAVILO ZA LOKACIJU:')
  ) {
    updated = updated.replace(
      'KLJUČNI FOKUS PORUKE:',
      'PRAVILO ZA LOKACIJU:\n- Ako spominješ lokaciju, koristi ISKLJUČIVO dostavljenu sigurnu frazu za lokaciju. Ne prepisuj sirovi naziv grada iza izraza "na području" ili "u".\n\nKLJUČNI FOKUS PORUKE:',
    );
  }

  if (
    nodeName === 'Set: Parsiraj OpenAI Analizu'
    && updated.includes('if (finalBody) {')
  ) {
    const blockStart = 'if (finalBody) {';
    const cleanupStart = '\n  finalBody = finalBody\n    // Uklanjanje robotskih';
    const startIndex = updated.indexOf(blockStart);
    const cleanupIndex = updated.indexOf(cleanupStart, startIndex);

    if (startIndex === -1 || cleanupIndex === -1) {
      throw new Error('Nije pronađen blok za završno čišćenje AI poruke.');
    }

    const locationGuard = `
  // Posljednja zaštita ako AI ipak prepiše sirovi naziv grada bez padeža.
  const cityBase = company._messageData?.cityBase || cleanCity;
  const regexSlash = String.fromCharCode(92);
  const regexSpecialCharacters = '^$.*+?()[]{}|' + regexSlash;
  const rawCityPattern = cityBase && cityBase !== 'BiH'
    ? Array.from(cityBase).map((character) =>
        regexSpecialCharacters.includes(character) ? regexSlash + character : character
      ).join('')
    : '';
  if (rawCityPattern) {
    const spacingPattern = regexSlash + 's+';
    const endingPattern = '(?=$|[' + regexSlash + 's,.;:!?])';
    finalBody = finalBody.replace(
      new RegExp('(?:na području|u gradu|u)' + spacingPattern + rawCityPattern + endingPattern, 'gi'),
      locationPhrase
    );
  }
`;

    updated = updated.slice(0, startIndex + blockStart.length)
      + locationGuard
      + updated.slice(cleanupIndex);
  }

  return updated;
}

function upsertNormalizationNode(workflow) {
  let node = workflow.nodes.find((item) => item.name === NORMALIZE_NODE_NAME);
  if (!node) {
    node = {
      parameters: {},
      id: '8de74f46-0777-4be8-9ae4-f18e3724d59f',
      name: NORMALIZE_NODE_NAME,
      type: 'n8n-nodes-base.set',
      typeVersion: 3.4,
      position: [-39840, 18832],
    };
    workflow.nodes.push(node);
  }

  node.parameters = {
    mode: 'raw',
    jsonOutput: normalizationExpression,
    options: {},
  };

  const loopConnections = workflow.connections[LOOP_NODE_NAME]?.main;
  if (!Array.isArray(loopConnections) || !Array.isArray(loopConnections[1])) {
    throw new Error(`Nije pronađen očekivani izlaz čvora ${LOOP_NODE_NAME}.`);
  }

  const existingTargets = loopConnections[1].filter(
    (connection) => connection.node !== NORMALIZE_NODE_NAME,
  );
  const firstTargets = existingTargets.length > 0
    ? existingTargets
    : workflow.connections[NORMALIZE_NODE_NAME]?.main?.[0] || [];

  if (!firstTargets.some((connection) => connection.node === FIRST_NODE_AFTER_LOOP)) {
    throw new Error(`Nije pronađena veza prema čvoru ${FIRST_NODE_AFTER_LOOP}.`);
  }

  loopConnections[1] = [{ node: NORMALIZE_NODE_NAME, type: 'main', index: 0 }];
  workflow.connections[NORMALIZE_NODE_NAME] = { main: [firstTargets] };
}

function validateWorkflow(workflow, filePath) {
  const normalizeNode = workflow.nodes.find((node) => node.name === NORMALIZE_NODE_NAME);
  if (!normalizeNode) throw new Error(`Normalizacijski čvor nedostaje u ${filePath}.`);

  for (const node of workflow.nodes.filter((item) => messageNodeNames.has(item.name))) {
    const serialized = JSON.stringify(node.parameters);
    if (serialized.includes("$('Loop Over Firme1').item?.json")) {
      throw new Error(`${node.name} još uvijek čita sirove CompanyWall podatke u ${filePath}.`);
    }
    if (serialized.includes('na području ${cleanCity}')) {
      throw new Error(`${node.name} još uvijek direktno ubacuje grad bez padeža u ${filePath}.`);
    }
  }
}

function updateWorkflow(filePath) {
  if (!fs.existsSync(filePath)) return;

  const workflow = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  upsertNormalizationNode(workflow);

  workflow.nodes = workflow.nodes.map((node) => {
    if (!messageNodeNames.has(node.name)) return node;
    return {
      ...node,
      parameters: transformStrings(
        node.parameters,
        (value) => updateMessageExpression(value, node.name),
      ),
    };
  });

  validateWorkflow(workflow, filePath);
  fs.writeFileSync(filePath, `${JSON.stringify(workflow, null, 2)}\n`, 'utf8');
  console.log(`Ažuriran workflow: ${path.basename(filePath)}`);
}

for (const workflowPath of workflowPaths) updateWorkflow(workflowPath);
