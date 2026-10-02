'use server';

import { z } from 'zod';
import { hubErrors } from '../../hub/errors';
import { parseInput, runAction } from '../../hub/actions/run-action';
import { idSchema } from '../../hub/schemas';
import { MODULE_IDS, isRoleOf } from '../modules';
import { getCurrentAccess } from '../server/access';
import { getAccessUser, listAccessUsers, setModuleRole } from '../server/users';

const assignmentSchema = z.object({
  userId: idSchema,
  module: z.enum(MODULE_IDS),
  role: z.string().min(1).max(40).nullable(),
});

/** Only the main administrator manages access. Every action here checks that itself. */
async function requireOrgAdmin() {
  const access = await getCurrentAccess();
  if (!access) throw hubErrors.unauthenticated();
  if (!access.isOrgAdmin) throw hubErrors.forbidden('upravljanje pristupom');
  return access;
}

/** Everyone with an account and their role in every module. */
export async function listAccessUsersAction() {
  return runAction(async () => {
    await requireOrgAdmin();
    return listAccessUsers();
  });
}

/** Sets a user's role in one module, or removes their access to it with role null. */
export async function setModuleRoleAction(userId: unknown, moduleId: unknown, role: unknown) {
  return runAction(async () => {
    await requireOrgAdmin();
    const input = parseInput(assignmentSchema, { userId, module: moduleId, role });

    if (input.role !== null && !isRoleOf(input.module, input.role)) {
      throw hubErrors.validation('Nepoznata uloga za odabrani modul.');
    }

    const target = await getAccessUser(input.userId);
    if (!target) throw hubErrors.notFound('Korisnik');
    // The main administrator already has everything; a lesser label on that account would only confuse.
    if (target.isOrgAdmin) throw hubErrors.validation('Glavnom administratoru se uloge ne mijenjaju.');

    return setModuleRole(input.userId, input.module, input.role);
  });
}
