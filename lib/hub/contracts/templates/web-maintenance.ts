import { endRow } from '../compute';
import type { ContractTemplate } from '../types';
import { hourlyRate, startDate } from './shared-fields';

const MONTHS = 12;

export const webMaintenance: ContractTemplate = {
  id: 'web_maintenance',
  title: 'Održavanje web stranice',
  description: 'Godišnji ugovor o održavanju web stranice, web shopa ili portala.',
  source: 'template ugovor odrzavanje web stranice.pdf',
  months: MONTHS,
  terms: [
    {
      title: 'Osnovni uslovi ugovora',
      fields: [
        { key: 'website', label: 'Web stranica / sistem', kind: 'text', placeholder: 'www.primjer.ba', maxLength: 300, wide: true, required: true },
        startDate,
        { key: 'price', label: 'Ugovorena cijena (za cijeli period)', kind: 'money', unit: 'KM bez PDV-a', required: true },
        {
          key: 'billing',
          label: 'Fakturisanje',
          kind: 'select',
          defaultValue: 'yearly',
          options: [
            { value: 'yearly', label: 'Godišnje, unaprijed' },
            { value: 'quarterly', label: 'Kvartalno' },
            { value: 'monthly', label: 'Mjesečno' },
          ],
        },
        { key: 'payment_days', label: 'Rok plaćanja', kind: 'number', defaultValue: '15', unit: 'dana od dana ispostave fakture' },
        { key: 'content_changes', label: 'Izmjene sadržaja', kind: 'number', defaultValue: '5', unit: 'manjih izmjena mjesečno' },
        {
          key: 'backup',
          label: 'Sigurnosne kopije',
          kind: 'select',
          defaultValue: 'weekly',
          options: [
            { value: 'daily', label: 'Dnevno' },
            { value: 'weekly', label: 'Sedmično' },
            { value: 'monthly', label: 'Mjesečno' },
          ],
        },
        { key: 'support_hours', label: 'Tehnička podrška', kind: 'number', defaultValue: '1', unit: 'h mjesečno' },
        hourlyRate,
      ],
    },
    {
      title: 'Dodatno (član 2)',
      fields: [
        { key: 'hosting_package', label: 'Naziv hosting paketa', kind: 'text', maxLength: 200 },
        { key: 'extra_systems', label: 'Dodatni sistemi', kind: 'text', placeholder: 'npr. web shop, e-račun, aplikacija', maxLength: 300 },
      ],
    },
  ],
  computed: (values) => endRow(values, MONTHS),
};
