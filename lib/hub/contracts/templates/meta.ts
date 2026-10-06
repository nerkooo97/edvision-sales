import { endRow, parseMoney, totalRow } from '../compute';
import type { ContractTemplate } from '../types';
import { feedPosts, hourlyRate, monthlyFee, paymentDay, startDate, storyPosts, visuals } from './shared-fields';

const MONTHS = 6;

export const meta: ContractTemplate = {
  id: 'meta',
  title: 'Digitalni marketing: Meta',
  description: 'Društvene mreže Meta (Facebook i Instagram), 6 mjeseci.',
  source: 'template ugovor digitalni marketing meta.pdf',
  months: MONTHS,
  terms: [
    {
      title: 'Osnovni uslovi ugovora',
      fields: [
        { key: 'meta_package', label: 'Paket usluga', kind: 'text', defaultValue: 'START paket - Facebook i Instagram', maxLength: 200, wide: true, required: true },
        { key: 'profiles', label: 'Stranice / profili', kind: 'text', placeholder: 'naziv Facebook stranice i Instagram profila', maxLength: 300, wide: true, required: true },
        startDate,
        monthlyFee,
        paymentDay,
        feedPosts,
        storyPosts,
        visuals,
        { key: 'ad_budget', label: 'Budžet za oglase (okvirno)', kind: 'money', unit: 'KM mjesečno', wide: true },
        hourlyRate,
      ],
    },
  ],
  computed: (values) => [...endRow(values, MONTHS), ...totalRow(parseMoney(values.monthly_fee), MONTHS)],
};
