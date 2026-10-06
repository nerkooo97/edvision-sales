// Fields that several templates use in their "Osnovni uslovi ugovora" table.

import type { FieldDef } from '../types';

export const startDate: FieldDef = { key: 'start_date', label: 'Početak ugovora', kind: 'date', required: true };

export const monthlyFee: FieldDef = {
  key: 'monthly_fee',
  label: 'Mjesečna naknada',
  kind: 'money',
  unit: 'KM bez PDV-a',
  required: true,
};

export const paymentDay: FieldDef = {
  key: 'payment_day',
  label: 'Rok plaćanja (do dana u mjesecu za prethodni mjesec)',
  kind: 'number',
  defaultValue: '15',
  unit: '. dana',
  wide: true,
  required: true,
};

export const hourlyRate: FieldDef = {
  key: 'hourly_rate',
  label: 'Dodatni rad (cijena sata)',
  kind: 'money',
  unit: 'KM bez PDV-a po započetom satu',
  wide: true,
  required: true,
};

export const feedPosts: FieldDef = {
  key: 'feed_posts', label: 'Objave (feed)', kind: 'number', defaultValue: '2', unit: 'sedmično', required: true,
};
export const storyPosts: FieldDef = {
  key: 'story_posts', label: 'Story objave', kind: 'number', defaultValue: '3', unit: 'sedmično', required: true,
};
export const visuals: FieldDef = {
  key: 'visuals', label: 'Vizuali', kind: 'number', defaultValue: '2', unit: 'sedmično', required: true,
};
