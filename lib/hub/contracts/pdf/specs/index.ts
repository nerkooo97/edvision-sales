import type { ContractTemplateId } from '../../types';
import { googleAdsSpec } from './google-ads';
import type { Spec, SpecContext } from './helpers';
import { metaSpec } from './meta';
import { metaGoogleAdsSpec } from './meta-google-ads';
import { webMaintenanceSpec } from './web-maintenance';

const BUILDERS: Record<ContractTemplateId, (context: SpecContext) => Spec> = {
  web_maintenance: webMaintenanceSpec,
  meta: metaSpec,
  google_ads: googleAdsSpec,
  meta_google_ads: metaGoogleAdsSpec,
};

export const buildSpec = (id: ContractTemplateId, context: SpecContext): Spec => BUILDERS[id](context);
