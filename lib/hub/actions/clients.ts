'use server';

import { hubErrors } from '../errors';
import { canDeleteClient, canManageClients } from '../permissions';
import { createClientSchema, idSchema, updateClientSchema } from '../schemas';
import { requireHubUser } from '../server/session';
import {
  clientHasProjects,
  createClient,
  deleteClient,
  findClientByName,
  getClient,
  listClientItems,
  listClientOptions,
  updateClient,
} from '../server/clients';
import { listContacts } from '../server/client-contacts';
import { clientHasGeneratedContracts, listGeneratedContractsOfClient } from '../server/generated-contracts';
import { clientHasMaintenanceContracts } from '../server/maintenance-contracts';
import { clientHasMarketingContracts } from '../server/marketing-contracts';
import { projectsForRole } from '../money';
import { listProjects } from '../server/projects';
import { parseInput, runAction } from './run-action';

const CLIENT_PROJECTS_LIMIT = 500;

async function requireClientManager() {
  const user = await requireHubUser();
  if (!canManageClients(user.role)) throw hubErrors.forbidden('upravljanje klijentima');
  return user;
}

/** Light client list for pickers (project form, contracts, generator). */
export async function listClientOptionsAction() {
  return runAction(async () => {
    await requireHubUser();
    return listClientOptions();
  });
}

/** Rows for the client list screen. */
export async function listClientsAction() {
  return runAction(async () => {
    await requireHubUser();
    return listClientItems();
  });
}

/** One client with its contacts, e.g. to edit it from the list or to prefill a contract. */
export async function getClientAction(clientId: unknown) {
  return runAction(async () => {
    await requireHubUser();
    const id = parseInput(idSchema, clientId);

    const [client, contacts] = await Promise.all([getClient(id), listContacts(id)]);
    if (!client) throw hubErrors.notFound('Klijent');
    return { client, contacts };
  });
}

/** A client together with its contacts, all of its projects and what the caller may do with it. */
export async function getClientDetailAction(clientId: unknown) {
  return runAction(async () => {
    const user = await requireHubUser();
    const id = parseInput(idSchema, clientId);

    const [client, contacts, { projects }, contracts] = await Promise.all([
      getClient(id),
      listContacts(id),
      listProjects({ client_id: id, limit: CLIENT_PROJECTS_LIMIT }),
      listGeneratedContractsOfClient(id),
    ]);
    if (!client) throw hubErrors.notFound('Klijent');

    return {
      client,
      contacts,
      projects: projectsForRole(projects, user.role),
      contracts,
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

    const [hasProjects, hasMarketing, hasMaintenance, hasGenerated] = await Promise.all([
      clientHasProjects(id),
      clientHasMarketingContracts(id),
      clientHasMaintenanceContracts(id),
      clientHasGeneratedContracts(id),
    ]);
    if (hasProjects) {
      throw hubErrors.validation('Klijent ima projekte i ne može se obrisati. Deaktivirajte ga umjesto toga.');
    }
    if (hasMarketing || hasMaintenance || hasGenerated) {
      throw hubErrors.validation('Klijent ima ugovore o održavanju i ne može se obrisati. Deaktivirajte ga umjesto toga.');
    }
    await deleteClient(id);
    return { id };
  });
}
