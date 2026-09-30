import { Query, type Models } from 'node-appwrite';
import { createAdminClient } from '../../appwrite/server';
import { getRoleFromLabels, withRoleLabel, type HubRole } from '../roles';
import type { HubMember } from '../types';
import { isNotFound } from './db';

const PAGE_SIZE = 100;
const MAX_USERS = 1000;

/** Exposes only id, name, email and role; never phone, prefs, labels or anything else on the account. */
function toMember(user: Models.User<Models.Preferences>): HubMember {
  return {
    id: user.$id,
    name: user.name || user.email,
    email: user.email,
    role: getRoleFromLabels(user.labels),
  };
}

async function listAllUsers(): Promise<HubMember[]> {
  const { users } = await createAdminClient();
  const members: HubMember[] = [];

  for (let offset = 0; offset < MAX_USERS; offset += PAGE_SIZE) {
    const page = await users.list({
      queries: [Query.limit(PAGE_SIZE), Query.offset(offset), Query.orderAsc('name')],
      total: false,
    });
    members.push(...page.users.map(toMember));
    if (page.users.length < PAGE_SIZE) break;
  }

  return members;
}

/** Everyone with an account, including people who do not have Hub access yet (admin screen). */
export function listUsersWithRoles(): Promise<HubMember[]> {
  return listAllUsers();
}

/** Only people who can use the Hub; used for lead/member/assignee pickers. */
export async function listHubMembers(): Promise<HubMember[]> {
  return (await listAllUsers()).filter((member) => member.role !== null);
}

export async function getMember(userId: string): Promise<HubMember | null> {
  const { users } = await createAdminClient();
  try {
    return toMember(await users.get({ userId }));
  } catch (error) {
    if (isNotFound(error)) return null;
    throw error;
  }
}

/** Sets (or removes, with null) the Hub role and keeps every other label on the account intact. */
export async function setUserRole(userId: string, role: HubRole | null): Promise<HubMember> {
  const { users } = await createAdminClient();
  const user = await users.get({ userId });
  const updated = await users.updateLabels({ userId, labels: withRoleLabel(user.labels, role) });
  return toMember(updated);
}
