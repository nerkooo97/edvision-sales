// A contract made with the generator also shows up in the contract tables ("Ugovori o održavanju"),
// so nobody has to enter it twice. Data-access helper: no permission checks here (see db.ts).

import type { ContractTemplateId, ContractValues } from '../contracts/types';
import { toStoredDate } from '../dates';
import type { MarketingCategory } from '../maintenance';
import { createMaintenanceContract } from './maintenance-contracts';
import {
  createMarketingContract,
  findMarketingContractFor,
  getMarketingContract,
  updateMarketingContract,
} from './marketing-contracts';

const MARKETING: Record<Exclude<ContractTemplateId, 'web_maintenance'>, { category: MarketingCategory; service: string }> = {
  meta: { category: 'facebook_instagram', service: 'Facebook i Instagram' },
  google_ads: { category: 'google_ads', service: 'Google Ads' },
  meta_google_ads: { category: 'facebook_google', service: 'Facebook i Instagram + Google Ads' },
};

interface TrackedContract {
  template: ContractTemplateId;
  clientId: string;
  /** YYYY-MM-DD */
  startDate: string;
  endDate: string;
  values: ContractValues;
}

/**
 * Website maintenance: a new row (a renewal is a new contract). Digital marketing: the client's row for
 * the start year becomes "Ugovor postoji" with the contract dates, keeping the months already marked;
 * a new row is made when the client has none for that year.
 */
export async function recordInContractTables(contract: TrackedContract): Promise<void> {
  const start = toStoredDate(contract.startDate);
  const end = toStoredDate(contract.endDate);

  if (contract.template === 'web_maintenance') {
    await createMaintenanceContract({
      client_id: contract.clientId,
      domain: contract.values.website?.trim() || null,
      service: 'Održavanje web stranice',
      start_date: start,
      end_date: end,
    });
    return;
  }

  const { category, service } = MARKETING[contract.template];
  const year = Number(contract.startDate.slice(0, 4));
  const existingId = await findMarketingContractFor(contract.clientId, year);
  const existing = existingId ? await getMarketingContract(existingId) : null;
  const data = {
    client_id: contract.clientId,
    category,
    service,
    contract_status: 'signed' as const,
    contract_start: start,
    contract_end: end,
    year,
    months: existing?.months ?? 0,
  };
  if (existing) await updateMarketingContract(existing.$id, data);
  else await createMarketingContract(data);
}
