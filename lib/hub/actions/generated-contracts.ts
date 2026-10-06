'use server';

import { z } from 'zod';
import { contractEnd } from '../contracts/compute';
import { allFields, missingRequired } from '../contracts/form';
import { getContractTemplate } from '../contracts/templates';
import type { ContractTemplateId, ContractValues } from '../contracts/types';
import { toStoredDate } from '../dates';
import { hubErrors } from '../errors';
import { canDeleteClient, canManageMaintenance } from '../permissions';
import { generatedContractSchema, idSchema } from '../schemas';
import { getClient } from '../server/clients';
import { recordInContractTables } from '../server/contract-tracking';
import {
  createGeneratedContract,
  deleteGeneratedContract,
  getContractCounter,
  getGeneratedContract,
  nextContractNumber,
  raiseContractCounter,
} from '../server/generated-contracts';
import { requireHubUser } from '../server/session';
import { parseInput, runAction } from './run-action';

const MAX_STORED_LENGTH = 10_000;
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Saves a contract made with the generator and gives it the next number of its year. Only the form is
 * stored; the browser builds the PDF from what this returns. The contract also appears in the contract
 * tables ("Ugovori o održavanju"); if that part fails, the contract stays saved and the answer says so.
 */
export async function createGeneratedContractAction(input: unknown) {
  return runAction(async () => {
    const user = await requireHubUser();
    if (!canManageMaintenance(user.role)) throw hubErrors.forbidden('pravljenje ugovora');
    const data = parseInput(generatedContractSchema, input);
    if (!(await getClient(data.client_id))) throw hubErrors.validation('Odabrani klijent ne postoji.');

    const template = getContractTemplate(data.template);
    // Only the fields of this template are kept; the number always comes from the database.
    const values: ContractValues = Object.fromEntries(
      allFields(template)
        .filter((field) => field.key !== 'contract_number')
        .map((field) => [field.key, (data.values[field.key] ?? '').trim()])
        .filter(([, value]) => value !== '')
    );
    const missing = missingRequired(template, { ...values, contract_number: 'auto' });
    if (missing.length) throw hubErrors.validation(`Nedostaju obavezna polja: ${missing.join(', ')}.`);
    if (!ISO_DAY.test(values.concluded_date) || !ISO_DAY.test(values.start_date)) {
      throw hubErrors.validation('Neispravan datum zaključenja ili početka ugovora.');
    }
    const endDate = contractEnd(values.start_date, template.months) as string;

    const contractNumber = await nextContractNumber(Number(values.concluded_date.slice(0, 4)));
    const stored: ContractValues = { ...values, contract_number: contractNumber };
    const json = JSON.stringify(stored);
    if (json.length > MAX_STORED_LENGTH) throw hubErrors.validation('Ugovor ima previše teksta za čuvanje.');

    const contract = await createGeneratedContract({
      client_id: data.client_id,
      template: data.template,
      contract_number: contractNumber,
      concluded_date: toStoredDate(values.concluded_date),
      start_date: toStoredDate(values.start_date),
      end_date: toStoredDate(endDate),
      contract_values: json,
      created_by: user.id,
    });

    let trackedInTables = true;
    try {
      await recordInContractTables({
        template: data.template,
        clientId: data.client_id,
        startDate: values.start_date,
        endDate,
        values: stored,
      });
    } catch (error) {
      console.error('Hub: generated contract saved, but the contract tables were not updated', error);
      trackedInTables = false;
    }

    return { id: contract.$id, contractNumber, values: stored, trackedInTables };
  });
}

/** The stored form of a contract, so the browser can build its PDF again. */
export async function getGeneratedContractAction(contractId: unknown) {
  return runAction(async () => {
    await requireHubUser();
    const contract = await getGeneratedContract(parseInput(idSchema, contractId));
    if (!contract) throw hubErrors.notFound('Ugovor');
    return {
      template: contract.template as ContractTemplateId,
      values: JSON.parse(contract.contract_values) as ContractValues,
    };
  });
}

/** Admin only. The number is not reused, and the row in the contract tables stays (it is edited there). */
export async function deleteGeneratedContractAction(contractId: unknown) {
  return runAction(async () => {
    const user = await requireHubUser();
    if (!canDeleteClient(user.role)) throw hubErrors.forbidden('brisanje ugovora');
    const id = parseInput(idSchema, contractId);
    if (!(await getGeneratedContract(id))) throw hubErrors.notFound('Ugovor');
    await deleteGeneratedContract(id);
    return { id };
  });
}

const counterYearSchema = z.number().int().min(2000).max(2100);
const counterValueSchema = z.number().int().min(0, 'Broj ne može biti negativan.').max(1_000_000);

/** Admin only: the last used contract number of a year, for the counter settings. */
export async function getContractCounterAction(year: unknown) {
  return runAction(async () => {
    const user = await requireHubUser();
    if (!canDeleteClient(user.role)) throw hubErrors.forbidden('postavke brojača ugovora');
    const y = parseInput(counterYearSchema, year);
    return { year: y, last: await getContractCounter(y) };
  });
}

/** Admin only: continue numbering after `last`. A value below the current one is refused. */
export async function setContractCounterAction(year: unknown, last: unknown) {
  return runAction(async () => {
    const user = await requireHubUser();
    if (!canDeleteClient(user.role)) throw hubErrors.forbidden('postavke brojača ugovora');
    const y = parseInput(counterYearSchema, year);
    const value = parseInput(counterValueSchema, last);
    const current = await getContractCounter(y);
    if (value < current) {
      throw hubErrors.validation(`Broj ne može biti manji od trenutnog (${current}). Već iskorišteni brojevi se ne smiju ponoviti.`);
    }
    return { year: y, last: await raiseContractCounter(y, value) };
  });
}

/**
 * The number the next contract of `year` would get, for display only: the real number is given when the
 * contract is saved, so a contract saved by someone else in between moves it on by one.
 */
export async function getNextContractNumberAction(year: unknown) {
  return runAction(async () => {
    const user = await requireHubUser();
    if (!canManageMaintenance(user.role)) throw hubErrors.forbidden('pravljenje ugovora');
    const y = parseInput(counterYearSchema, year);
    return `${(await getContractCounter(y)) + 1}-${y}`;
  });
}
