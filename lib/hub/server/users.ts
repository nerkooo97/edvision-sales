import { Query, type Models } from 'node-appwrite';
import { resolveAccess } from '../../access/resolve';
import { createAdminClient } from '../../appwrite/server';
import type { HubMember } from '../types';
import { isNotFound } from './db';

const PAGE_SIZE = 100;
const MAX_USERS = 1000;

/** Exposes only id, name, email and Hub role; never phone, prefs, labels or anything else on the account. */
function toMember(user: Models.User<Models.Preferences>): HubMember {
  return {
    id: user.$id,
    name: user.name || user.email,
    email: user.email,
    role: resolveAccess(user.labels).roles.hub,
  };
}

export async function listAllUsers(): Promise<HubMember[]> {
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
