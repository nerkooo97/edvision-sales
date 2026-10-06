import type { ContractTemplate, ContractTemplateId } from '../types';
import { googleAds } from './google-ads';
import { meta } from './meta';
import { metaGoogleAds } from './meta-google-ads';
import { webMaintenance } from './web-maintenance';

export const CONTRACT_TEMPLATES: ContractTemplate[] = [webMaintenance, meta, googleAds, metaGoogleAds];

export function getContractTemplate(id: ContractTemplateId): ContractTemplate {
  const template = CONTRACT_TEMPLATES.find((item) => item.id === id);
  if (!template) throw new Error(`Unknown contract template: ${id}`);
  return template;
}
