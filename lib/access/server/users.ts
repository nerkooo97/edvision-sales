import { Query, type Models } from 'node-appwrite';
import { createAdminClient } from '../../appwrite/server';
import { isNotFound } from '../../hub/server/db';
import { MODULES, ORG_ADMIN_LABEL, type ModuleId } from '../modules';
import { rolesFromLabels, withModuleRole } from '../resolve';

const PAGE_SIZE = 100;
const MAX_USERS = 1000;

/** The only user fields the access screen ever receives. */
export interface AccessUser {
  id: string;
  name: string;
  email: string;
  isOrgAdmin: boolean;
  roles: Record<ModuleId, string | null>;
}

function toAccessUser(user: Models.User<Models.Preferences>): AccessUser {
  return {
    id: user.$id,
    name: user.name || user.email,
    email: user.email,
    isOrgAdmin: user.labels.includes(ORG_ADMIN_LABEL),
    roles: rolesFromLabels(user.labels),
  };
}

export async function listAccessUsers(): Promise<AccessUser[]> {
  const { users } = await createAdminClient();
  const result: AccessUser[] = [];

  for (let offset = 0; offset < MAX_USERS; offset += PAGE_SIZE) {
    const page = await users.list({
      queries: [Query.limit(PAGE_SIZE), Query.offset(offset), Query.orderAsc('name')],
      total: false,
    });
    result.push(...page.users.map(toAccessUser));
    if (page.users.length < PAGE_SIZE) break;
  }
  return result;
}

export async function getAccessUser(userId: string): Promise<AccessUser | null> {
  const { users } = await createAdminClient();
  try {
    return toAccessUser(await users.get({ userId }));
  } catch (error) {
    if (isNotFound(error)) return null;
    throw error;
  }
}

/** Sets a user's role in one module (null removes access) and keeps every other label on the account. */
export async function setModuleRole(userId: string, moduleId: ModuleId, role: string | null): Promise<AccessUser> {
  if (role !== null && !MODULES[moduleId].roles.includes(role)) throw new Error(`Unknown role ${role}`);

  const { users } = await createAdminClient();
  const user = await users.get({ userId });
  const updated = await users.updateLabels({ userId, labels: withModuleRole(user.labels, moduleId, role) });
  return toAccessUser(updated);
}
