'use server';

import { hubErrors } from '../errors';
import { canManageMaintenance } from '../permissions';
import { contractMonthsSchema, contractYearSchema, idSchema, marketingContractSchema } from '../schemas';
import { getClient } from '../server/clients';
import {
  createMarketingContract,
  deleteMarketingContract,
  getMarketingContract,
  listMarketingContracts,
  findMarketingContractFor,
  setMarketingContractMonths,
  updateMarketingContract,
} from '../server/marketing-contracts';
import { requireHubUser } from '../server/session';
import { parseInput, runAction } from './run-action';

async function requireMaintenanceManager() {
  const user = await requireHubUser();
  if (!canManageMaintenance(user.role)) throw hubErrors.forbidden('upravljanje ugovorima o održavanju');
  return user;
}

/** One digital marketing row per client and year; `exceptId` is the contract being edited. */
async function assertNoOtherContract(clientId: string, year: number, exceptId?: string) {
  const existing = await findMarketingContractFor(clientId, year);
  if (existing && existing !== exceptId) {
    throw hubErrors.validation(`Ovaj klijent već ima ugovor za ${year}. godinu. Uredite postojeći.`);
  }
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
    await assertNoOtherContract(data.client_id, data.year);
    return createMarketingContract(data);
  });
}

export async function updateMarketingContractAction(contractId: unknown, input: unknown) {
  return runAction(async () => {
    await requireMaintenanceManager();
    const id = parseInput(idSchema, contractId);
    const data = parseInput(marketingContractSchema, input);
    const current = await getMarketingContract(id);
    if (!current) throw hubErrors.notFound('Ugovor');
    await assertClientExists(data.client_id);
    if (current.client_id !== data.client_id || current.year !== data.year) {
      await assertNoOtherContract(data.client_id, data.year, id);
    }
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

/**
 * The month grid: writes only the months of one contract. One read and one write, and the page updates
 * in place instead of reloading every list.
 */
export async function setMarketingMonthsAction(contractId: unknown, months: unknown) {
  return runAction(async () => {
    await requireMaintenanceManager();
    const id = parseInput(idSchema, contractId);
    const mask = parseInput(contractMonthsSchema, months);
    if (!(await getMarketingContract(id))) throw hubErrors.notFound('Ugovor');
    return setMarketingContractMonths(id, mask);
  });
}
