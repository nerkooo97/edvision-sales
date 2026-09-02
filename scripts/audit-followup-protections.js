require('dotenv').config({ path: '.env.local' });

const { Client, Databases, Query } = require('node-appwrite');

const endpoint =
  process.env.APPWRITE_ENDPOINT ||
  process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT ||
  'https://appwrite.ed-vision.com/v1';
const projectId =
  process.env.APPWRITE_PROJECT_ID || process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
const databaseId =
  process.env.APPWRITE_DATABASE_ID || process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;
const apiKey = process.env.APPWRITE_API_KEY;

if (!projectId || !databaseId || !apiKey) {
  throw new Error('Nedostaju Appwrite varijable u .env.local.');
}

const client = new Client()
  .setEndpoint(endpoint)
  .setProject(projectId)
  .setKey(apiKey);
const databases = new Databases(client);

const activeMeetingStatuses = ['Zakazan', 'Potvrđen', 'Odgođen'];
const blockedLeadStatuses = [
  'U pregovorima',
  'Kvalifikovan',
  'Zaključeno - Dobijeno',
  'Odbijeno',
  'Greška - Nepostojeći email',
];
const followupLogStatuses = ['Poslano', 'Otvoreno', 'Otvorena'];

function relationId(value) {
  if (typeof value === 'string') return value;
  return value && typeof value === 'object' ? value.$id || '' : '';
}

async function listAll(collectionId, queries = []) {
  const documents = [];
  let cursor;

  do {
    const pageQueries = [...queries, Query.limit(100)];
    if (cursor) pageQueries.push(Query.cursorAfter(cursor));
    const page = await databases.listDocuments(databaseId, collectionId, pageQueries);
    documents.push(...page.documents);
    cursor = page.documents.length === 100 ? page.documents.at(-1)?.$id : undefined;
  } while (cursor);

  return documents;
}

async function main() {
  const [meetings, blockedLeads, repliedLogs, followupCandidates] = await Promise.all([
    listAll('meetings', [Query.equal('status', activeMeetingStatuses)]),
    listAll('leads', [Query.equal('status', blockedLeadStatuses)]),
    listAll('contact_logs', [Query.equal('status', 'Odgovoreno')]),
    listAll('contact_logs', [Query.equal('status', followupLogStatuses)]),
  ]);

  const activeCompanyIds = new Set(meetings.map((meeting) => meeting.company_id).filter(Boolean));
  const blockedCompanyIds = new Set(blockedLeads.map((lead) => relationId(lead.company)).filter(Boolean));
  const blockedLeadIds = new Set(blockedLeads.map((lead) => lead.$id));

  let missingCompanyReferences = 0;
  for (const companyId of activeCompanyIds) {
    try {
      await databases.getDocument(databaseId, 'companies', companyId);
    } catch {
      missingCompanyReferences += 1;
    }
  }

  const protectedCandidates = followupCandidates.filter((log) => {
    const companyId = relationId(log.company);
    const leadId = relationId(log.lead);
    return activeCompanyIds.has(companyId) || blockedCompanyIds.has(companyId) || blockedLeadIds.has(leadId);
  });

  const unsafeReplies = repliedLogs.filter((log) => {
    const companyId = relationId(log.company);
    const leadId = relationId(log.lead);
    return !blockedCompanyIds.has(companyId) && !blockedLeadIds.has(leadId);
  });

  console.log(JSON.stringify({
    activeMeetings: meetings.length,
    activeMeetingsWithoutCompany: meetings.filter((meeting) => !meeting.company_id).length,
    missingCompanyReferences,
    blockedLeads: blockedLeads.length,
    repliedLogs: repliedLogs.length,
    repliesWithoutBlockingLead: unsafeReplies.length,
    currentFollowupCandidates: followupCandidates.length,
    candidatesProtectedByNewGuards: protectedCandidates.length,
    liveQueriesValid: true,
  }, null, 2));
}

main().catch((error) => {
  console.error(`Audit nije uspio: ${error.message}`);
  process.exit(1);
});
