import { resolveContractTerms, type ContractColumns } from '../retainer';
import type { HubProject } from '../types';

const CONTRACT_KEYS = [
  'contract_start_date',
  'contract_months',
  'monthly_fee',
  'weekly_quota',
  'extra_post_price',
] as const satisfies readonly (keyof ContractColumns)[];

type ContractPatch = Partial<Record<(typeof CONTRACT_KEYS)[number], string | number | null | undefined>>;

const toStoredValue = (value: string | number | null | undefined) => value ?? null;

/**
 * For a project write: when the request touches any contract field, merge it with the stored project,
 * validate that the recurring terms are complete, and return the values that follow from them
 * (planned deadline = contract end, budget = monthly fee x months). Returns {} when nothing applies,
 * so an unrelated edit never rewrites the deadline or the budget.
 */
export function applyContractTerms(
  patch: ContractPatch,
  current?: Pick<HubProject, (typeof CONTRACT_KEYS)[number]>
): { planned_deadline?: string; budget?: number } {
  if (!CONTRACT_KEYS.some((key) => patch[key] !== undefined)) return {};

  const merged = Object.fromEntries(
    CONTRACT_KEYS.map((key) => [key, toStoredValue(patch[key] !== undefined ? patch[key] : current?.[key])])
  ) as Partial<ContractColumns>;

  return resolveContractTerms(merged) ?? {};
}
