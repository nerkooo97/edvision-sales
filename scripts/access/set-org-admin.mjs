// Makes one account the main administrator: full access to every module and the only one who manages access.
//
// Usage:
//   npm run access:org-admin -- someone@example.com            shows what would change (read-only)
//   npm run access:org-admin -- someone@example.com --apply    adds the label
//
// There is exactly one main administrator. The script refuses to add a second one, and it only ever adds the
// "orgadmin" label: every other label on the account is left as it is. Credentials come only from the
// environment (.env.local, git-ignored) and are never printed.

import { Client, Query, Users } from 'node-appwrite';

const ORG_ADMIN_LABEL = 'orgadmin';
const PAGE_SIZE = 100;

const args = process.argv.slice(2);
const apply = args.includes('--apply');
const email = args.find((arg) => !arg.startsWith('--'))?.trim().toLowerCase();

const endpoint = process.env.APPWRITE_ENDPOINT || process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const projectId = process.env.APPWRITE_PROJECT_ID || process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
const apiKey = process.env.APPWRITE_API_KEY;

if (!email) {
  console.error('Give the account email: npm run access:org-admin -- someone@example.com [--apply]');
  process.exit(1);
}
if (!endpoint || !projectId || !apiKey) {
  console.error('Missing Appwrite settings. Run through npm so .env.local is loaded.');
  process.exit(1);
}

const users = new Users(new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey));

async function listAllUsers() {
  const all = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const page = await users.list({ queries: [Query.limit(PAGE_SIZE), Query.offset(offset)], total: false });
    all.push(...page.users);
    if (page.users.length < PAGE_SIZE) return all;
  }
}

try {
  const all = await listAllUsers();
  const target = all.find((user) => user.email.toLowerCase() === email);
  if (!target) throw new Error(`No account with email ${email}`);

  const existing = all.filter((user) => user.labels.includes(ORG_ADMIN_LABEL));
  console.log(`Account: ${target.name || target.email} <${target.email}>`);
  console.log(`Current main administrator(s): ${existing.map((user) => user.email).join(', ') || 'none'}`);

  if (target.labels.includes(ORG_ADMIN_LABEL)) {
    console.log('This account is already the main administrator. Nothing to do.');
    process.exit(0);
  }
  if (existing.length > 0) {
    throw new Error('There is already a main administrator. Remove that label first if it really has to move.');
  }

  console.log(`Would add the "${ORG_ADMIN_LABEL}" label; existing labels kept: ${target.labels.join(', ') || 'none'}`);
  if (!apply) {
    console.log('Dry run only. Add --apply to write.');
    process.exit(0);
  }

  await users.updateLabels({ userId: target.$id, labels: [...target.labels, ORG_ADMIN_LABEL] });
  console.log('Done. The label is active on the next page load.');
} catch (error) {
  console.error(`Failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
