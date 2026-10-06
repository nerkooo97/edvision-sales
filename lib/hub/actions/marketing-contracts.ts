'use server';

import { hubErrors } from '../errors';
import { canManageMaintenance } from '../permissions';
import { contractYearSchema, idSchema, marketingContractSchema } from '../schemas';
import { getClient } from '../server/clients';
import {
  createMarketingContract,
  deleteMarketingContract,
  getMarketingContract,
  listMarketingContracts,
  updateMarketingContract,
} from '../server/marketing-contracts';
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

export async function listMarketingContractsAction(year: unknown) {
  return runAction(async () => {
    await requireHubUser();
    return listMarketingContracts(parseInput(contractYearSchema, year));
  });
}

export async function createMarketingContractAction(input: unknown) {
  return runAction(async () => {
    await requireMaintenanceManager();
    const data = parseInput(marketingContractSchema, input);
    await assertClientExists(data.client_id);
    return createMarketingContract(data);
  });
}

export async function updateMarketingContractAction(contractId: unknown, input: unknown) {
  return runAction(async () => {
    await requireMaintenanceManager();
    const id = parseInput(idSchema, contractId);
    const data = parseInput(marketingContractSchema, input);
    if (!(await getMarketingContract(id))) throw hubErrors.notFound('Ugovor');
    await assertClientExists(data.client_id);
    return updateMarketingContract(id, data);
  });
}

export async function deleteMarketingContractAction(contractId: unknown) {
  return runAction(async () => {
    await requireMaintenanceManager();
    const id = parseInput(idSchema, contractId);
    if (!(await getMarketingContract(id))) throw hubErrors.notFound('Ugovor');
    await deleteMarketingContract(id);
    return { id };
  });
}
