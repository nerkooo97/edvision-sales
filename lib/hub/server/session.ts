import { getLoggedInUser } from '../../appwrite/server';
import { hubErrors } from '../errors';
import { resolveAccess } from '../../access/resolve';
import type { HubUser } from '../types';

/** The signed-in Appwrite account, or null. getLoggedInUser is already cached per request. */
export const getSessionUser = getLoggedInUser;

/**
 * Current user with their Hub role, taken from the session cookie (never from client input).
 * Roles come from the user's labels on the session account, so this costs no extra database query.
 */
export async function requireHubUser(): Promise<HubUser> {
  const user = await getSessionUser();
  if (!user) throw hubErrors.unauthenticated();

  const role = resolveAccess(user.labels).roles.hub;
  if (!role) throw hubErrors.noHubAccess();

  return { id: user.$id, name: user.name || user.email, email: user.email, role };
}
