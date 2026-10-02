// Subscriptions are paid in different currencies (many tools bill in USD or EUR), so a subscription price is
// stored in the currency it is paid in. For totals everything is converted to KM (BAM):
//  - EUR -> KM uses the fixed currency-board rate (KM_PER_EUR, see currency.ts);
//  - USD -> KM goes through the euro, using the ECB reference rate (USD per 1 EUR), because the KM is
//    pegged to the euro. The rate is fetched on the server (see server/exchange-rates.ts).

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

/** The reference rate used for USD: how many dollars one euro buys, on `date` (YYYY-MM-DD). */
export interface ExchangeRates {
  usdPerEur: number;
  date: string;
}

const round2 = (value: number) => Math.round(value * 100) / 100;

/** How many KM one dollar is worth, or null without a rate. */
export const kmPerUsd = (rates: ExchangeRates | null): number | null =>
  rates ? KM_PER_EUR / rates.usdPerEur : null;

/** "1,7311" (four decimals, as exchange rates are quoted). */
export const formatRate = (value: number): string => value.toFixed(4).replace('.', ',');

/** An amount in KM, or null for dollars when no rate is available. */
export function toKm(amount: number, currency: SubscriptionCurrency, rates: ExchangeRates | null): number | null {
  if (currency === 'KM') return round2(amount);
  if (currency === 'EUR') return round2(amount * KM_PER_EUR);
  const rate = kmPerUsd(rates);
  return rate === null ? null : round2(amount * rate);
}

export interface SubscriptionsSummary {
  count: number;
  uniqueNames: number;
  /** Sum in KM of everything that could be converted. */
  totalKm: number;
  /** The costliest service in KM; same-named subscriptions are added together first. */
  top: { name: string; totalKm: number; count: number } | null;
  /** Dollar subscriptions left out of the totals because no rate was available. */
  unconverted: number;
}

export function summarizeSubscriptions(
  items: readonly { name: string; price: number; currency: string | null }[],
  rates: ExchangeRates | null
): SubscriptionsSummary {
  const groups = new Map<string, { name: string; totalKm: number; count: number }>();
  let totalKm = 0;
  let unconverted = 0;

  for (const item of items) {
    const km = toKm(item.price, currencyOf(item.currency), rates);
    if (km === null) {
      unconverted += 1;
      continue;
    }
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
    unconverted,
  };
}
