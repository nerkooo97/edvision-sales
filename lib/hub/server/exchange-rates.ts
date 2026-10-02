import type { ExchangeRates } from '../subscriptions';

// ECB euro foreign exchange reference rates, published once per working day. KM is pegged to the euro, so
// the dollar rate in KM follows from the euro rate. Cached for six hours, so the feed is not hit per request.
const ECB_DAILY_URL = 'https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml';
const REVALIDATE_SECONDS = 6 * 60 * 60;
const TIMEOUT_MS = 5000;

/** Pulls the USD rate and the publication date out of the ECB XML; null if either is missing or implausible. */
export function parseEcbRates(xml: string): ExchangeRates | null {
  const date = /<Cube time=['"](\d{4}-\d{2}-\d{2})['"]/.exec(xml)?.[1];
  const rate = Number(/<Cube currency=['"]USD['"] rate=['"]([\d.]+)['"]/.exec(xml)?.[1]);
  if (!date || !Number.isFinite(rate) || rate < 0.5 || rate > 3) return null;
  return { usdPerEur: rate, date };
}

/** The current USD rate, or null when the feed cannot be reached (callers must handle that). */
export async function getExchangeRates(): Promise<ExchangeRates | null> {
  try {
    const response = await fetch(ECB_DAILY_URL, {
      next: { revalidate: REVALIDATE_SECONDS },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) return null;
    return parseEcbRates(await response.text());
  } catch (error) {
    console.error('Exchange rate fetch failed:', error);
    return null;
  }
}
