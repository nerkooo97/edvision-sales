// KM and EUR. The convertible mark is pegged to the euro at a fixed rate by law (currency board), so no
// exchange-rate service is needed and the conversion is exact.
//
// Amounts are stored in KM everywhere in the Hub. The euro is a way to enter and view them: a euro amount
// with two decimals survives a round trip through KM unchanged (the rounding error is under half a cent),
// so nothing is lost by storing KM.

export const KM_PER_EUR = 1.95583;

export const CURRENCIES = ['EUR', 'KM'] as const;
export type Currency = (typeof CURRENCIES)[number];

const round2 = (value: number) => Math.round(value * 100) / 100;

export const kmToEur = (km: number): number => round2(km / KM_PER_EUR);
export const eurToKm = (eur: number): number => round2(eur * KM_PER_EUR);

/** A stored KM amount as shown in the chosen currency. */
export const toDisplayAmount = (km: number, currency: Currency): number => (currency === 'EUR' ? kmToEur(km) : km);

/** An amount typed in the chosen currency, as stored (KM). */
export const fromDisplayAmount = (typed: number, currency: Currency): number =>
  currency === 'EUR' ? eurToKm(typed) : round2(typed);

/**
 * "1.234,5" style number (dot thousands, comma decimals, up to 2 decimals). Written by hand instead of
 * Intl because the server and the browser ship different locale data, which caused hydration mismatches
 * ("2.400" on the server vs "2,400" in the browser).
 */
export function formatNumber(value: number): string {
  const [whole, decimals] = Math.abs(round2(value)).toFixed(2).split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const fraction = decimals === '00' ? '' : `,${decimals.replace(/0$/, '')}`;
  return `${value < 0 && (whole !== '0' || decimals !== '00') ? '-' : ''}${grouped}${fraction}`;
}

/** "1.234,50 €" or "2.414,49 KM" for a stored KM amount. */
export function formatMoney(km: number, currency: Currency): string {
  return currency === 'EUR' ? `${formatNumber(kmToEur(km))} €` : `${formatNumber(km)} KM`;
}
