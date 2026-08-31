const fs = require('fs');
const path = require('path');

const localPath = path.join(__dirname, '..', 'n8n', 'Kompletan Sales Sistem (ED Vision).local.json');
const gitPath = path.join(__dirname, '..', 'n8n', 'Kompletan Sales Sistem (ED Vision).json');

function updatePrompts(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const wf = JSON.parse(content);

  // 1. Update 'Set: Pripremi AI Prompt'
  const promptNode = wf.nodes.find(n => n.name === 'Set: Pripremi AI Prompt');
  if (promptNode) {
    promptNode.parameters.jsonOutput = `={{ (() => {
let company = {};
try {
  company = $('Loop Over Firme1').item?.json || {};
} catch(e) {}

// 1. Čišćenje djelatnosti
let cleanIndustry = (company.industry || '').trim();
if (cleanIndustry) {
  cleanIndustry = cleanIndustry
    .replace(/^(?:[A-Z]\\s*)?\\d{1,4}(?:\\.\\d{1,4})?\\s*[\\-\\:\\–\\—\\.]\\s*/i, '')
    .replace(/\\s*\\([\\d\\.\\-]+\\)\\s*$/, '')
    .trim();
}
if (!cleanIndustry) {
  cleanIndustry = 'Vaše djelatnosti';
}

// 2. Čišćenje naziva kompanije
let cleanCompanyName = (company.company_name || 'Vaša kompanija').trim();
cleanCompanyName = cleanCompanyName.replace(/^[\\\"'„“«»]+|[\\\"'„“«»]+$/g, '').trim();

// 3. Grad / Lokacija
const cleanCity = (company.city || 'BiH').trim();

// 4. Podaci o agenciji
const agencyName = 'ED Vision';
const agencyWebsite = 'https://ed-vision.com';
const agencyEmail = 'edin.fejzic@ed-vision.net';

// 5. Očitavanje podataka sa web stranice klijenta
let domainCheck = {};
try {
  domainCheck = $('HTTP Request: Provjera domene1').item?.json || {};
} catch(e) {}

const isDomainError = Boolean(domainCheck.error || (domainCheck.statusCode && domainCheck.statusCode >= 400));
const rawHtml = typeof domainCheck.body === 'string' ? domainCheck.body : (typeof domainCheck.data === 'string' ? domainCheck.data : '');

let siteTitle = '';
let siteDescription = '';
if (rawHtml) {
  const titleMatch = rawHtml.match(/<title[^>]*>([^<]+)<\\/title>/i);
  if (titleMatch) siteTitle = titleMatch[1].replace(/\\s+/g, ' ').trim().slice(0, 150);
  const metaMatch = rawHtml.match(/<meta[^>]*name=[\"']description[\"'][^>]*content=[\"']([^\"']+)[\"']/i) ||
                    rawHtml.match(/<meta[^>]*content=[\"']([^\"']+)[\"'][^>]*name=[\"']description[\"']/i);
  if (metaMatch) siteDescription = metaMatch[1].replace(/\\s+/g, ' ').trim().slice(0, 250);
}

const systemPrompt = \`Ti si Senior B2B Sales & Digital Transformation Strateg za digitalnu agenciju ED Vision (ed-vision.com).
Pišeš visoko personalizovane, profesionalne i tople prodajne emailove vlasnicima i direktorima kompanija.

KLJUČNI FOKUS PORUKE:
- Glavni naglasak mora biti na DIGITALNOJ TRANSFORMACIJI, DIGITALIZACIJI POSLOVNIH PROCESA i izradi modernih WEB STRANICA ili WEB SHOPOVA (e-commerce rješenja).
- Manje se fokusiraj na tehnički SEO ili brzinu stranice, a MNOGO VIŠE na to kako digitalna rješenja direktno olakšavaju poslovanje, ubrzavaju narudžbe i povećavaju prodaju.
- Uoči 2-3 konkretne prilike za digitalizaciju prilagođene TAČNO NJIHOVOJ INDUSTRIJI:
  • Trgovina / Distribucija: Izrada modernog Web Shopa (B2B/B2C), digitalni katalog artikala, automatizacija online narudžbi i upita.
  • Proizvodnja / Industrija: Digitalizacija procesa prezentacije proizvoda, online konfiguratori/katalozi, digitalni tokovi za slanje upita za ponude.
  • Usluge / Građevina / Medicina: Digitalno zakazivanje, interaktivna prezentacija referenci i usluga, pojednostavljen kontakt.
  • Firme bez weba: Izrada web stranice ili web shopa kao prvi ključni korak digitalne transformacije.

STIL I PRAVILA:
- Stil: direktan, partnerski, poslovan i fokusiran na vrijednost za klijenta.
- Dužina: 100-140 riječi.
- Piši isključivo u ime tima agencije (mi, naš tim, ED Vision tim).
- Tekst OBAVEZNO završi pozivom na kratak neobavezujući razgovor ove sedmice i završnom odjavom: "Srdačan pozdrav,".
- NAJSTROŽIJE JE ZABRANJENO korištenje bilo kakvih uglastih zagrada [ ], vitičastih { } ili placeholder oznaka poput [Vaše ime], [Ime], [Naziv firme].

Odgovori OBAVEZNO u validnom JSON formatu sa sljedećim poljima:
{
  "analysis": ["Konkretna prilika za digitalizaciju 1", "Konkretna prilika za digitalizaciju 2", "Konkretna prilika za digitalizaciju 3"],
  "email_subject": "Kratak, relevantan i zanimljiv naslov (npr. Digitalizacija procesa i rast prodaje - Naziv Kompanije)",
  "email_body": "Kompletan tekst emaila koji završava sa Srdačan pozdrav,"
}\`;

const userPrompt = \`Napiši visoko personalizovan prodajni email na bosanskom jeziku za kompaniju:
AGENCIJA: \${agencyName} (\${agencyWebsite}, \${agencyEmail})

KLIJENT:
- Naziv kompanije: \${cleanCompanyName}
- Djelatnost: \${cleanIndustry}
- Grad / Lokacija: \${cleanCity}
- Web stranica: \${company.website || 'Nema web stranicu'}
\${siteTitle ? \`- Naslov sa sajta: \${siteTitle}\` : ''}
\${siteDescription ? \`- Opis djelatnosti sa sajta: \${siteDescription}\` : ''}

Napiši autentičan, personalizovan email prilagođen tačno sektoru \${cleanIndustry} i gradu \${cleanCity}. Fokusiraj se na digitalnu transformaciju, digitalizaciju procesa (automatizacija upita, B2B/B2C web shop ili moderna web stranica) i kako im to može pomoći u privlačenju novih klijenata i efikasnijem radu. Završi sa: Srdačan pozdrav,\`;

const messages = [
  {
    role: 'system',
    content: systemPrompt
  },
  {
    role: 'user',
    content: [
      {
        type: 'text',
        text: userPrompt
      }
    ]
  }
];

return [{
  json: {
    messages,
    company
  }
}];
})()[0].json }}`;
  }

  // 2. Update 'Set: Parsiraj OpenAI Analizu' (Fallback template)
  const parseNode = wf.nodes.find(n => n.name === 'Set: Parsiraj OpenAI Analizu');
  if (parseNode) {
    parseNode.parameters.jsonOutput = `={{ (() => {
const response = (typeof $json === 'object' && $json !== null) ? $json : {};
let content = response.choices?.[0]?.message?.content || '';
const clean = typeof content === 'string' ? content.replace(/\\\`\\\`\\\`json|\\\`\\\`\\\`/g, '').trim() : '';
let parsed = null;

if (clean) {
  try {
    parsed = JSON.parse(clean);
  } catch (e) {
    const subjectMatch = clean.match(/SUBJECT:\\s*(.+?)(?:\\n|BODY:)/i);
    const bodyMatch = clean.match(/BODY:\\s*([\\s\\S]+)/i);
    if (subjectMatch || bodyMatch) {
      parsed = {
        email_subject: subjectMatch ? subjectMatch[1].trim() : '',
        email_body: bodyMatch ? bodyMatch[1].trim() : clean
      };
    }
  }
}

let company = {};
try {
  company = $('Loop Over Firme1').item?.json || {};
} catch(e) {}

const hasWeb = true;
const hasEmail = Boolean(company.email && company.email.trim());
const hasPhone = Boolean(company.phones && (Array.isArray(company.phones) ? company.phones.length > 0 : Boolean(company.phones)));

let cleanIndustry = (company.industry || '').trim();
if (cleanIndustry) {
  cleanIndustry = cleanIndustry
    .replace(/^(?:[A-Z]\\s*)?\\d{1,4}(?:\\.\\d{1,4})?\\s*[\\-\\:\\–\\—\\.]\\s*/i, '')
    .replace(/\\s*\\([\\d\\.\\-]+\\)\\s*$/, '')
    .trim();
}
if (!cleanIndustry) cleanIndustry = 'Vaše djelatnosti';

let cleanCompanyName = (company.company_name || 'Vaša kompanija').trim();
cleanCompanyName = cleanCompanyName.replace(/^[\\\"'„“«»]+|[\\\"'„“«»]+$/g, '').trim();
const cleanCity = (company.city || 'BiH').trim();

// Novi podrazumijevani tekstovi sa fokusom na digitalnu transformaciju i procese
const defaultSubject = \`Digitalizacija procesa i unapređenje prodaje - \${cleanCompanyName}\`;
const defaultBody = \`Poštovani,\\n\\nPrateći kompanije u sektoru \${cleanIndustry} na području \${cleanCity}, naš tim je analizirao mogućnosti za unapređenje Vašeg digitalnog poslovanja (\${company.website || cleanCompanyName}).\\n\\nU digitalnoj agenciji ED Vision pomažemo kompanijama kroz digitalnu transformaciju i digitalizaciju procesa:\\n• Izrada modernih web stranica i web shopova prilagođenih Vašoj industriji\\n• Automatizacija prikupljanja upita i digitalni katalozi proizvoda\\n• Efikasnija komunikacija sa novim klijentima i povećanje prodaje\\n\\nBili bismo slobodni da Vam predstavimo kratak prijedlog koncepta. Kada bi Vam odgovarao kratak, neobavezujući razgovor ove sedmice?\\n\\nSrdačan pozdrav,\`;

const finalAnalysis = (parsed?.analysis && Array.isArray(parsed.analysis) && parsed.analysis.length > 0)
  ? parsed.analysis
  : ['Digitalizacija poslovnih procesa i upita', 'Mogućnost uvođenja modernog web shopa / kataloga', 'Digitalna transformacija i rast prodaje'];

let finalSubject = (parsed?.email_subject && String(parsed.email_subject).trim())
  ? String(parsed.email_subject).trim()
  : defaultSubject;

let finalBody = (parsed?.email_body && String(parsed.email_body).trim())
  ? String(parsed.email_body).trim()
  : defaultBody;

if (finalBody) {
  finalBody = finalBody
    .replace(/\\[(?:vaše\\s*ime|ime|vaša\\s*kompanija|naziv\\s*firme|vaša\\s*firma|broj\\s*telefona|telefon|pozicija|link|vaš\\s*tim)\\]/gi, '')
    .replace(/\\[[^\\]]*\\]/g, '')
    .replace(/(?:Srdačan\\s*pozdrav|Lijep\\s*pozdrav|Pozdrav)[,\\s\\S]*$/i, '')
    .replace(/ED\\s*Vision\\s*tim[\\s\\S]*$/i, '')
    .replace(/https?:\\/\\/ed-vision\\.com[\\s\\S]*$/i, '')
    .trim();
  finalBody += '\\n\\nSrdačan pozdrav,';
}

if (finalSubject) {
  finalSubject = finalSubject
    .replace(/\\[[^\\]]*\\]/g, '')
    .trim();
}

return [{
  json: {
    company,
    has_web: hasWeb,
    has_email: hasEmail,
    has_phone: hasPhone,
    status: hasEmail ? 'Kontaktiran' : 'Novi',\n    analysis: finalAnalysis,
    email_subject: finalSubject,
    email_body: finalBody
  }
}];
})()[0].json }}`;
  }

  // 3. Update 'Set: Pripremi Lead (Bez weba)'
  const noWebNode = wf.nodes.find(n => n.name === 'Set: Pripremi Lead (Bez weba)');
  if (noWebNode) {
    noWebNode.parameters.jsonOutput = `={{ (() => {
let company = {};
try {
  company = $('Loop Over Firme1').item?.json || {};
} catch(e) {}

const hasEmail = Boolean(company.email && company.email.trim());
const hasPhone = Boolean(company.phones && (Array.isArray(company.phones) ? company.phones.length > 0 : Boolean(company.phones)));

let cleanIndustry = (company.industry || '').trim();
if (cleanIndustry) {
  cleanIndustry = cleanIndustry
    .replace(/^(?:[A-Z]\\s*)?\\d{1,4}(?:\\.\\d{1,4})?\\s*[\\-\\:\\–\\—\\.]\\s*/i, '')
    .replace(/\\s*\\([\\d\\.\\-]+\\)\\s*$/, '')
    .trim();
}
if (!cleanIndustry) {
  cleanIndustry = 'Vaše djelatnosti';
}

let cleanCompanyName = (company.company_name || 'Vaša kompanija').trim();
cleanCompanyName = cleanCompanyName.replace(/^[\\\"'„“«»]+|[\\\"'„“«»]+$/g, '').trim();
const cleanCity = (company.city || 'BiH').trim();

const emailSubject = \`Digitalna transformacija i izrada web rješenja - \${cleanCompanyName}\`;
const emailBody = \`Poštovani,\\n\\nPrateći uspješne kompanije u sektoru \${cleanIndustry} na području \${cleanCity}, primijetili smo da \${cleanCompanyName} još uvijek nema aktivno web rješenje ili web shop.\\n\\nU digitalnoj agenciji ED Vision pomažemo kompanijama kroz digitalnu transformaciju i digitalizaciju procesa — od izrade modernih web stranica i web shopova do automatizacije prikupljanja upita i narudžbi.\\n\\nBili bismo slobodni da Vam predstavimo kratak prijedlog koncepta. Kada bi Vam odgovarao kratak, neobavezujući razgovor ove sedmice?\\n\\nSrdačan pozdrav,\`;

return [{
  json: {
    company,
    has_web: false,
    has_email: hasEmail,
    has_phone: hasPhone,
    status: hasEmail ? 'Kontaktiran' : 'Novi',
    analysis: ['Potrebna digitalna transformacija', 'Izrada moderne web stranice / web shopa', 'Digitalizacija procesa i online upita'],
    email_subject: emailSubject,
    email_body: emailBody
  }
}];
})()[0].json }}`;
  }

  // 4. Update fallback in 'SMTP: Posalji Email1'
  const smtpNode = wf.nodes.find(n => n.name === 'SMTP: Posalji Email1');
  if (smtpNode && smtpNode.parameters?.subject) {
    smtpNode.parameters.subject = `={{ (() => {
  let company = {};
  try { company = $('Loop Over Firme1').item?.json || {}; } catch(e) {}
  let sub = '';
  try {
    const ai = $('Set: Parsiraj OpenAI Analizu').item?.json;
    if (ai && ai.company?.['$id'] === company['$id'] && ai.email_subject) sub = ai.email_subject;
  } catch(e) {}
  if (!sub) {
    try {
      const noWeb = $('Set: Pripremi Lead (Bez weba)').item?.json;
      if (noWeb && noWeb.company?.['$id'] === company['$id'] && noWeb.email_subject) sub = noWeb.email_subject;
    } catch(e) {}
  }
  if (!sub) {
    let cleanCompanyName = (company.company_name || 'Vaša kompanija').replace(/^[\\\"'„“«»]+|[\\\"'„“«»]+$/g, '').trim();
    const w = String(company.website || '').trim().toLowerCase();
    const hasWeb = Boolean(w && w.length > 5 && w.includes('.') && !['htt', 'http', 'https', 'nema', '-', '/'].includes(w));
    sub = hasWeb ? \`Digitalizacija procesa i unapređenje poslovanja - \${cleanCompanyName}\` : \`Digitalna transformacija i izrada web rješenja - \${cleanCompanyName}\`;
  }
  return sub;
})() }}`;
  }

  fs.writeFileSync(filePath, JSON.stringify(wf, null, 2), 'utf-8');
  console.log(`Updated prompts in ${path.basename(filePath)}!`);
}

updatePrompts(localPath);
updatePrompts(gitPath);

require('./sanitize-github-workflow.js');
