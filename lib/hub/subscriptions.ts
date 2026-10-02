// Subscriptions are paid in different currencies (many tools bill in USD or EUR), so a subscription price is
// stored in the currency it is paid in. For totals everything is converted to KM (BAM):
//  - EUR -> KM uses the fixed currency-board rate (KM_PER_EUR, see currency.ts);
//  - USD -> KM goes through the euro at a fixed rate (USD_PER_EUR below), because the KM is pegged to the euro.

import { formatNumber, KM_PER_EUR } from './currency';

export const SUBSCRIPTION_CURRENCIES = ['EUR', 'USD', 'KM'] as const;
export type SubscriptionCurrency = (typeof SUBSCRIPTION_CURRENCIES)[number];

export const DEFAULT_SUBSCRIPTION_CURRENCY: SubscriptionCurrency = 'EUR';

const SYMBOLS: Record<SubscriptionCurrency, string> = { EUR: '€', USD: '$', KM: 'KM' };

export const isSubscriptionCurrency = (value: string): value is SubscriptionCurrency =>
  (SUBSCRIPTION_CURRENCIES as readonly string[]).includes(value);

/** Rows created before the currency column existed have none; they were entered in KM. */
export const currencyOf = (value: string | null | undefined): SubscriptionCurrency =>
  value && isSubscriptionCurrency(value) ? value : 'KM';

/** "12,5 €", "20 $" or "35 KM". */
export function formatSubscriptionPrice(amount: number, currency: SubscriptionCurrency): string {
  return `${formatNumber(amount)} ${SYMBOLS[currency]}`;
}

/** Quick picks offered under the name field; any other name can still be typed. */
export const SUBSCRIPTION_PRESETS = ['Claude', 'ChatGPT', 'Gemini', 'Adobe', 'n8n'] as const;

/**
 * Dollars per euro, ECB reference rate of 2026-10-01. Deliberately fixed: no network call is made for it.
 * Update this number when the rate has moved enough to matter.
 */
export const USD_PER_EUR = 1.1298;

const round2 = (value: number) => Math.round(value * 100) / 100;

/** An amount in KM. */
export function toKm(amount: number, currency: SubscriptionCurrency): number {
  if (currency === 'KM') return round2(amount);
  if (currency === 'EUR') return round2(amount * KM_PER_EUR);
  return round2((amount / USD_PER_EUR) * KM_PER_EUR);
}

export interface SubscriptionsSummary {
  count: number;
  uniqueNames: number;
  /** Sum of everything in KM. */
  totalKm: number;
  /** The costliest service in KM; same-named subscriptions are added together first. */
  top: { name: string; totalKm: number; count: number } | null;
}

export function summarizeSubscriptions(
  items: readonly { name: string; price: number; currency: string | null }[]
): SubscriptionsSummary {
  const groups = new Map<string, { name: string; totalKm: number; count: number }>();
  let totalKm = 0;

  for (const item of items) {
    const km = toKm(item.price, currencyOf(item.currency));
    totalKm += km;

    // Same name (ignoring case and spaces) counts as one service: three Claude seats are one "Claude".
    const key = item.name.trim().toLowerCase();
    const group = groups.get(key) ?? { name: item.name.trim(), totalKm: 0, count: 0 };
    group.totalKm += km;
    group.count += 1;
    groups.set(key, group);
  }

  const top = [...groups.values()].reduce<SubscriptionsSummary['top']>(
    (best, group) => (best === null || group.totalKm > best.totalKm ? group : best),
    null
  );

  return {
    count: items.length,
    uniqueNames: new Set(items.map((item) => item.name.trim().toLowerCase())).size,
    totalKm: round2(totalKm),
    top: top && { ...top, totalKm: round2(top.totalKm) },
  };
}
