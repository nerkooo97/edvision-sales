/** Countries a client can be in (ISO 3166-1 alpha-2 code -> name shown in the UI). */
export const COUNTRIES: Record<string, string> = {
  BA: 'Bosna i Hercegovina',
  HR: 'Hrvatska',
  RS: 'Srbija',
  ME: 'Crna Gora',
  SI: 'Slovenija',
  MK: 'Sjeverna Makedonija',
  AT: 'Austrija',
  DE: 'Njemačka',
  CH: 'Švicarska',
  NL: 'Holandija',
  SE: 'Švedska',
  FI: 'Finska',
  IT: 'Italija',
  FR: 'Francuska',
  GB: 'Ujedinjeno Kraljevstvo',
  US: 'SAD',
};

export const DEFAULT_COUNTRY = 'BA';

export function countryName(code: string | null | undefined): string {
  if (!code) return '';
  return COUNTRIES[code] ?? code;
}

/** Suggestions for the region field of a client in Bosnia and Herzegovina. */
export const BIH_REGIONS = [
  'Tuzlanski kanton',
  'Kanton Sarajevo',
  'Zeničko-dobojski kanton',
  'Srednjobosanski kanton',
  'Hercegovačko-neretvanski kanton',
  'Zapadnohercegovački kanton',
  'Unsko-sanski kanton',
  'Posavski kanton',
  'Bosansko-podrinjski kanton',
  'Kanton 10',
  'Republika Srpska',
  'Brčko distrikt',
];

type ClientAddress = {
  address?: string | null;
  postal_code?: string | null;
  city?: string | null;
  country?: string | null;
};

/** "Street 1, 75320 Gračanica" (+ ", Country" outside Bosnia and Herzegovina); empty when nothing is known. */
export function formatClientAddress(client: ClientAddress): string {
  const place = [client.postal_code, client.city].filter(Boolean).join(' ');
  const country = client.country && client.country !== DEFAULT_COUNTRY ? countryName(client.country) : '';
  return [client.address, place, country].filter(Boolean).join(', ');
}
