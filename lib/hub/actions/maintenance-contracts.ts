'use server';

import { hubErrors } from '../errors';
import { canManageMaintenance } from '../permissions';
import { idSchema, maintenanceContractSchema } from '../schemas';
import { getClient } from '../server/clients';
import {
  createMaintenanceContract,
  deleteMaintenanceContract,
  getMaintenanceContract,
  listMaintenanceContracts,
  updateMaintenanceContract,
} from '../server/maintenance-contracts';
import { requireHubUser } from '../server/session';
import { parseInput, runAction } from './run-action';

async function requireMaintenanceManager() {
  const user = await requireHubUser();
  if (!canManageMaintenance(user.role)) throw hubErrors.forbidden('upravljanje ugovorima o održavanju');
  return user;
}

async function assertClientExists(clientId: string) {
  if (!(await getClient(clientId))) throw hubErrors.validation('Odabrani klijent ne postoji.');
}

export async function listMaintenanceContractsAction() {
  return runAction(async () => {
    await requireHubUser();
    return listMaintenanceContracts();
  });
}

export async function createMaintenanceContractAction(input: unknown) {
  return runAction(async () => {
    await requireMaintenanceManager();
    const data = parseInput(maintenanceContractSchema, input);
    await assertClientExists(data.client_id);
    return createMaintenanceContract(data);
  });
}

export async function updateMaintenanceContractAction(contractId: unknown, input: unknown) {
  return runAction(async () => {
    await requireMaintenanceManager();
    const id = parseInput(idSchema, contractId);
    const data = parseInput(maintenanceContractSchema, input);
    if (!(await getMaintenanceContract(id))) throw hubErrors.notFound('Ugovor');
    await assertClientExists(data.client_id);
    return updateMaintenanceContract(id, data);
  });
}

export async function deleteMaintenanceContractAction(contractId: unknown) {
  return runAction(async () => {
    await requireMaintenanceManager();
    const id = parseInput(idSchema, contractId);
    if (!(await getMaintenanceContract(id))) throw hubErrors.notFound('Ugovor');
    await deleteMaintenanceContract(id);
    return { id };
  });
}
