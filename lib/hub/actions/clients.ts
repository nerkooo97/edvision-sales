'use server';

import { hubErrors } from '../errors';
import { canDeleteClient, canManageClients } from '../permissions';
import { createClientSchema, idSchema, updateClientSchema } from '../schemas';
import { requireHubUser } from '../server/session';
import {
  countProjectsOfClient,
  createClient,
  deleteClient,
  findClientByName,
  getClient,
  listClients,
  updateClient,
} from '../server/clients';
import { projectsForRole } from '../money';
import { listProjects } from '../server/projects';
import { parseInput, runAction } from './run-action';

const CLIENT_PROJECTS_LIMIT = 500;

async function requireClientManager() {
  const user = await requireHubUser();
  if (!canManageClients(user.role)) throw hubErrors.forbidden('upravljanje klijentima');
  return user;
}

export async function listClientsAction() {
  return runAction(async () => {
    await requireHubUser();
    return listClients();
  });
}

/** A client together with all of its projects and what the caller may do with it. */
export async function getClientDetailAction(clientId: unknown) {
  return runAction(async () => {
    const user = await requireHubUser();
    const id = parseInput(idSchema, clientId);

    const client = await getClient(id);
    if (!client) throw hubErrors.notFound('Klijent');

    const { projects } = await listProjects({ client_id: id, limit: CLIENT_PROJECTS_LIMIT });
    return {
      client,
      projects: projectsForRole(projects, user.role),
      permissions: { canManage: canManageClients(user.role), canDelete: canDeleteClient(user.role) },
    };
  });
}

export async function createClientAction(input: unknown) {
  return runAction(async () => {
    await requireClientManager();
    const data = parseInput(createClientSchema, input);

    const existing = await findClientByName(data.name);
    if (existing) throw hubErrors.validation(`Klijent „${existing.name}“ već postoji.`);

    return createClient(data);
  });
}

export async function updateClientAction(clientId: unknown, input: unknown) {
  return runAction(async () => {
    await requireClientManager();
    const id = parseInput(idSchema, clientId);
    const patch = parseInput(updateClientSchema, input);

    const client = await getClient(id);
    if (!client) throw hubErrors.notFound('Klijent');

    if (patch.name !== undefined) {
      const sameName = await findClientByName(patch.name);
      if (sameName && sameName.$id !== id) throw hubErrors.validation(`Klijent „${sameName.name}“ već postoji.`);
    }
    return updateClient(id, patch);
  });
}

/** Only admins delete, and only clients without projects; everyone else deactivates instead. */
export async function deleteClientAction(clientId: unknown) {
  return runAction(async () => {
    const user = await requireHubUser();
    if (!canDeleteClient(user.role)) throw hubErrors.forbidden('brisanje klijenata');

    const id = parseInput(idSchema, clientId);
    if (!(await getClient(id))) throw hubErrors.notFound('Klijent');

    if ((await countProjectsOfClient(id)) > 0) {
      throw hubErrors.validation('Klijent ima projekte i ne može se obrisati. Deaktivirajte ga umjesto toga.');
    }
    await deleteClient(id);
    return { id };
  });
}
