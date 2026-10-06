import { formatKm } from '../../format';
import { endRow, parseMoney } from '../compute';
import type { ContractTemplate } from '../types';
import { feedPosts, hourlyRate, paymentDay, startDate, storyPosts, visuals } from './shared-fields';

const MONTHS = 12;

export const metaGoogleAds: ContractTemplate = {
  id: 'meta_google_ads',
  title: 'Digitalni marketing: Meta i Google Ads',
  description: 'Facebook, Instagram i Google Ads zajedno, 12 mjeseci.',
  source: 'template ugovor digitalni marketing meta i google ads.pdf',
  months: MONTHS,
  terms: [
    {
      title: 'Osnovni uslovi ugovora',
      fields: [
        { key: 'meta_package', label: 'Paket: Meta', kind: 'text', defaultValue: 'START', maxLength: 100, required: true },
        { key: 'google_package', label: 'Paket: Google Ads', kind: 'text', defaultValue: 'START', maxLength: 100, required: true },
        { key: 'brands', label: 'Brendovi / nalozi', kind: 'text', placeholder: 'naziv brenda, Facebook stranice, Instagram profila i Google Ads naloga', maxLength: 300, wide: true, required: true },
        { key: 'website', label: 'Web stranica', kind: 'text', placeholder: 'www.primjer.ba', maxLength: 300 },
        { key: 'area', label: 'Tržišta', kind: 'text', placeholder: 'npr. BiH, Hrvatska, Srbija', maxLength: 200 },
        startDate,
        { key: 'fee_meta', label: 'Mjesečna naknada: Meta', kind: 'money', unit: 'KM bez PDV-a', required: true },
        { key: 'fee_google', label: 'Mjesečna naknada: Google Ads', kind: 'money', unit: 'KM bez PDV-a', required: true },
        paymentDay,
        feedPosts,
        storyPosts,
        visuals,
        { key: 'budget_meta', label: 'Budžet za oglase: Meta (do)', kind: 'money', unit: 'KM mjesečno' },
        { key: 'budget_google', label: 'Budžet za oglase: Google Ads (do)', kind: 'money', unit: 'KM mjesečno' },
        { key: 'offer_number', label: 'Ponuda br. (ako postoji)', kind: 'text', maxLength: 50 },
        hourlyRate,
      ],
    },
  ],
  computed: (values) => {
    const meta = parseMoney(values.fee_meta);
    const google = parseMoney(values.fee_google);
    const monthly = meta + google;
    if (monthly === 0) return endRow(values, MONTHS);
    return [
      ...endRow(values, MONTHS),
      { label: 'Mjesečna naknada ukupno', value: `${formatKm(monthly)} bez PDV-a` },
      {
        label: 'Ukupna vrijednost',
        value: `${formatKm(monthly * MONTHS)} bez PDV-a, od toga Meta ${formatKm(meta * MONTHS)} i Google Ads ${formatKm(google * MONTHS)}`,
      },
    ];
  },
};
