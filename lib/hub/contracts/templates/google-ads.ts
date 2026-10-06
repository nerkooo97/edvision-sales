import { endRow, parseMoney, totalRow } from '../compute';
import type { ContractTemplate } from '../types';
import { hourlyRate, monthlyFee, paymentDay, startDate } from './shared-fields';

const MONTHS = 6;

export const googleAds: ContractTemplate = {
  id: 'google_ads',
  title: 'Digitalni marketing: Google Ads',
  description: 'Kreiranje i vođenje Google Ads kampanja, 6 mjeseci.',
  source: 'template ugovor digitalni marketing google ads.pdf',
  months: MONTHS,
  terms: [
    {
      title: 'Osnovni uslovi ugovora',
      fields: [
        { key: 'google_package', label: 'Paket usluga', kind: 'text', defaultValue: 'START paket - Google Ads', maxLength: 200, wide: true, required: true },
        { key: 'website', label: 'Web stranica', kind: 'text', placeholder: 'www.primjer.ba', maxLength: 300, required: true },
        { key: 'goal', label: 'Cilj', kind: 'text', placeholder: 'upiti / pozivi / prodaja / rezervacije', maxLength: 200 },
        { key: 'area', label: 'Ciljano područje', kind: 'text', placeholder: 'npr. Bosna i Hercegovina', maxLength: 200, wide: true },
        startDate,
        monthlyFee,
        paymentDay,
        { key: 'ad_budget', label: 'Budžet za oglase (do)', kind: 'money', unit: 'KM mjesečno', wide: true },
        hourlyRate,
      ],
    },
  ],
  computed: (values) => [...endRow(values, MONTHS), ...totalRow(parseMoney(values.monthly_fee), MONTHS)],
};
