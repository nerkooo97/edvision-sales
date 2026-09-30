'use server';

import { hubErrors } from '../errors';
import { canManageUsers } from '../permissions';
import { idSchema, roleSchema } from '../schemas';
import { requireHubUser } from '../server/session';
import { getMember, listHubMembers, listUsersWithRoles, setUserRole } from '../server/users';
import { parseInput, runAction } from './run-action';

/** The signed-in user with their Hub role, for showing role-aware UI. */
export async function getCurrentHubUserAction() {
  return runAction(() => requireHubUser());
}

/** People who can use the Hub; feeds the lead, member and assignee pickers. */
export async function listHubMembersAction() {
  return runAction(async () => {
    await requireHubUser();
    return listHubMembers();
  });
}

/** Admin screen: every account, with or without a Hub role. */
export async function listUsersWithRolesAction() {
  return runAction(async () => {
    const user = await requireHubUser();
    if (!canManageUsers(user.role)) throw hubErrors.forbidden('upravljanje korisnicima');
    return listUsersWithRoles();
  });
}

/** Sets a user's Hub role, or removes their Hub access when role is null. */
export async function assignRoleAction(userId: unknown, role: unknown) {
  return runAction(async () => {
    const admin = await requireHubUser();
    if (!canManageUsers(admin.role)) throw hubErrors.forbidden('upravljanje korisnicima');

    const id = parseInput(idSchema, userId);
    const newRole = parseInput(roleSchema, role);

    // Guards against an admin removing their own access and leaving the Hub without an admin.
    if (id === admin.id && newRole !== 'admin') {
      throw hubErrors.validation('Ne možete sami sebi ukloniti ulogu administratora.');
    }
    if (!(await getMember(id))) throw hubErrors.notFound('Korisnik');

    return setUserRole(id, newRole);
  });
}
