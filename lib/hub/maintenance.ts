// Maintenance contracts: digital marketing (per year, with the months worked on) and website maintenance.
// Pure helpers only, shared by the server, the forms and the tables.

import { addMonthsUtc } from './dates';

export const MARKETING_CATEGORIES = ['facebook_instagram', 'google_ads', 'facebook_google', 'other'] as const;
export type MarketingCategory = (typeof MARKETING_CATEGORIES)[number];

export const MARKETING_CATEGORY_LABELS: Record<MarketingCategory, string> = {
  facebook_instagram: 'Facebook i Instagram',
  google_ads: 'Google Ads',
  facebook_google: 'Facebook/Instagram + Google Ads',
  other: 'Ostali digitalni marketing',
};

/** signed = contract exists, to_create = work is done but the contract is still missing, not_needed = none required. */
export const CONTRACT_STATUSES = ['signed', 'to_create', 'not_needed'] as const;
export type ContractStatus = (typeof CONTRACT_STATUSES)[number];

export const CONTRACT_STATUS_LABELS: Record<ContractStatus, string> = {
  signed: 'Ugovor postoji',
  to_create: 'Treba napraviti',
  not_needed: 'Ne treba',
};

/** Service names already in use, offered as suggestions; other names can still be typed. */
export const MARKETING_SERVICE_SUGGESTIONS = [
  'Facebook i Instagram',
  'Facebook objave',
  'Google Ads',
  'Facebook i Instagram + Google Ads',
  'Digitalni marketing FB i Google Ads',
  'Internet marketing',
] as const;

export const MAINTENANCE_SERVICE_SUGGESTIONS = [
  'Održavanje web stranice',
  'Održavanje i hosting',
  'Održavanje i zoho',
  'WebShop i održavanje',
  'Hosting i domena, održavanje',
] as const;

export const MONTH_SHORT_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'Maj', 'Jun', 'Jul', 'Avg', 'Sep', 'Okt', 'Nov', 'Dec'] as const;

export const ALL_MONTHS_MASK = 0b1111_1111_1111;

export const MIN_YEAR = 2000;
export const MAX_YEAR = 2100;

export const isMarketingCategory = (value: string): value is MarketingCategory =>
  (MARKETING_CATEGORIES as readonly string[]).includes(value);

export const isContractStatus = (value: string): value is ContractStatus =>
  (CONTRACT_STATUSES as readonly string[]).includes(value);

/** month: 0 = January ... 11 = December. */
export const hasMonth = (mask: number, month: number): boolean => (mask & (1 << month)) !== 0;

export const toggleMonth = (mask: number, month: number): number => mask ^ (1 << month);

export function countMonths(mask: number): number {
  let count = 0;
  for (let month = 0; month < 12; month += 1) if (hasMonth(mask, month)) count += 1;
  return count;
}

/** "Jan, Feb, Mar"; an empty string when no month is marked. */
export function formatMonths(mask: number): string {
  return MONTH_SHORT_NAMES.filter((_, month) => hasMonth(mask, month)).join(', ');
}

/** Website contracts run for a year, so the end date is suggested from the start date. */
export function suggestMaintenanceEnd(startDate: string): string {
  return addMonthsUtc(startDate, 12);
}

/** Row order inside the table: category in the Excel order, then client name. */
export function categoryOrder(category: string): number {
  const index = (MARKETING_CATEGORIES as readonly string[]).indexOf(category);
  return index === -1 ? MARKETING_CATEGORIES.length : index;
}

/** "15.06.2026 – 01.11.2026" from two stored dates; an empty string when either is missing. */
export function formatPeriod(start: string | null | undefined, end: string | null | undefined): string {
  const day = (stored: string) => `${stored.slice(8, 10)}.${stored.slice(5, 7)}.${stored.slice(0, 4)}`;
  return start && end ? `${day(start)} – ${day(end)}` : '';
}

/** A website contract is "expiring" this many days before its end date. */
export const EXPIRING_SOON_DAYS = 30;

export const MAINTENANCE_STATES = ['expiring', 'active', 'expired'] as const;
export type MaintenanceState = (typeof MAINTENANCE_STATES)[number];

export const MAINTENANCE_STATE_LABELS: Record<MaintenanceState, string> = {
  expiring: 'Ističe uskoro',
  active: 'Aktivan',
  expired: 'Istekao',
};

/** Where a website contract stands on `today` (YYYY-MM-DD), and how many days are left until it ends. */
export function maintenanceState(endDate: string, today: string): { state: MaintenanceState; daysLeft: number } {
  const daysLeft = Math.round((Date.parse(endDate.slice(0, 10)) - Date.parse(today)) / 86_400_000);
  if (daysLeft < 0) return { state: 'expired', daysLeft };
  return { state: daysLeft <= EXPIRING_SOON_DAYS ? 'expiring' : 'active', daysLeft };
}
