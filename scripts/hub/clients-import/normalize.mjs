// Field cleaners for the client import. Each takes the raw text and a `log` ({ warn(message), fix(kind) })
// and returns the cleaned value or null.

import { CITY_FIXES, DIAL_CODES } from './places.mjs';

export function clean(value) {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim();
  return text === '' ? null : text;
}

const isShouting = (text) => text === text.toUpperCase() && /[A-ZČĆŽŠĐ]{2}/.test(text);

function titleCase(text) {
  return text.toLowerCase().replace(/(^|[\s-])(\p{L})/gu, (_, sep, letter) => sep + letter.toUpperCase());
}

// "75320 Gračanica" / "75 320 Gračanica" / "Starnberg 82319" -> { city, postal }
export function splitCityPostal(text) {
  const value = clean(text);
  if (!value) return { city: null, postal: null };
  const leading = value.match(/^(\d{2} ?\d{3,4})\s+(\D.*)$/);
  if (leading) return { city: leading[2], postal: leading[1].replace(' ', '') };
  const trailing = value.match(/^(\D+?)\s+(\d{4,5})$/);
  if (trailing) return { city: trailing[1], postal: trailing[2] };
  return { city: value, postal: null };
}

// A street ("Šenik bb", "Kralja Tvrtka 15") that ended up in the city column.
export function looksLikeStreet(text) {
  const value = clean(text);
  if (!value || /^\d{2} ?\d{3,4}\s+\D/.test(value)) return false;
  return /\d/.test(value) || /\bbb\b/i.test(value);
}

export function normalizeCity(text, log) {
  const value = clean(text);
  if (!value) return null;
  const fixed = CITY_FIXES[value.toLowerCase()];
  if (fixed) {
    if (fixed !== value) log.fix('Ispravljen naziv grada');
    return fixed;
  }
  if (isShouting(value) || (value !== value.toLowerCase() && /^[a-zčćžšđ]/.test(value))) {
    log.fix('Ispravljena velika/mala slova u gradu');
    return titleCase(value);
  }
  if (value === value.toLowerCase()) return titleCase(value);
  return value;
}

// Returns { postal, region } — US-style "IA 50321" carries the state.
export function normalizePostal(text, log) {
  let value = clean(text);
  if (!value) return { postal: null, region: null };
  const withRegion = value.match(/^([A-Z]{2}) (\d{5})$/);
  if (withRegion) return { postal: withRegion[2], region: withRegion[1] };
  value = value.replace(/^[A-Za-z]{2}-/, '');
  const digits = value.match(/^(\d{2,3} ?\d{2,3})(\s+\D.*)?$/);
  if (!digits) {
    log.warn(`Neobičan poštanski broj "${value}"`);
    return { postal: value, region: null };
  }
  return { postal: digits[1].replace(' ', ''), region: null };
}

// "753000" (an extra zero typed in) -> "75300"
export function fixBihPostal(postal, log) {
  if (postal && /^7\d{4}0$/.test(postal)) {
    log.fix('Ispravljen poštanski broj sa viškom cifre');
    return postal.slice(0, 5);
  }
  return postal;
}

export function normalizeAddress(text, log) {
  let value = clean(text);
  if (!value) return null;
  if (/^0+$/.test(value)) return null;
  if (/broj lk/i.test(value)) {
    log.fix('Broj lične karte premješten iz adrese u napomenu');
    return null;
  }
  if (/^adresa:\s*/i.test(value)) {
    log.fix('Uklonjen prefiks "Adresa:"');
    value = value.replace(/^adresa:\s*/i, '');
  }
  return value;
}

// BiH numbers become "+387 61 123 456"; foreign international numbers keep their own grouping.
// Returns { value, text } — `text` is set when the field held words instead of a number.
export function normalizePhone(raw, country, log) {
  const value = clean(raw);
  if (!value) return { value: null, text: null };
  if (/[a-z]{3}/i.test(value)) return { value: null, text: value };

  let digits = value.replace(/\(0\)/g, '').replace(/[^\d+]/g, '');
  if (digits.startsWith('00')) digits = `+${digits.slice(2)}`;
  const local = digits.replace(/^\+(?=0)/, '');

  let national = null;
  if (digits.startsWith('+387')) national = digits.slice(4);
  else if (!digits.startsWith('+') && digits.startsWith('387') && digits.length >= 11) national = digits.slice(3);
  else if (country === 'BA' && local.startsWith('0')) national = local.slice(1);

  if (national === null) {
    // A foreign number written the local way ("089 327 40 506" in Germany) gets its country code.
    if (local.startsWith('0') && DIAL_CODES[country]) {
      log.fix('Stranom broju dodat pozivni broj države');
      return { value: `+${DIAL_CODES[country]} ${value.replace(/^\+?0/, '')}`, text: null };
    }
    if (!digits.startsWith('+') || digits.startsWith('+0')) log.warn(`Broj bez pozivnog broja države "${value}"`);
    return { value: value.replace(/\(0\)\s?/g, ''), text: null };
  }

  national = national.replace(/^0/, '');
  if (national.length < 8 || national.length > 9) log.warn(`Neobična dužina BiH broja "${value}"`);
  const formatted = `+387 ${national.slice(0, 2)} ${national.slice(2, 5)} ${national.slice(5)}`;
  if (formatted !== value) log.fix('Telefon u formatu +387');
  return { value: formatted, text: null };
}

export function normalizeEmail(raw, log) {
  const value = clean(raw)?.toLowerCase();
  if (!value) return null;
  if (!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/.test(value)) {
    log.warn(`Neispravan email "${value}"; izostavljen`);
    return null;
  }
  return value;
}

export function normalizeWebsite(raw, log) {
  const value = clean(raw);
  if (!value) return null;
  try {
    const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
    const result = `${url.protocol}//${url.host.toLowerCase()}${url.pathname.replace(/\/$/, '')}`;
    if (url.search) log.fix('Uklonjeni parametri za praćenje iz web adrese');
    return result;
  } catch {
    log.warn(`Neispravna web adresa "${value}"`);
    return value;
  }
}

// BiH ID broj (JIB): 13 digits, starts with 4, mod-11 control digit.
export function isValidBihId(id) {
  if (!/^4\d{12}$/.test(id)) return false;
  const weights = [7, 6, 5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  const sum = weights.reduce((total, weight, i) => total + weight * Number(id[i]), 0);
  const control = (11 - (sum % 11)) % 11;
  return control !== 10 && control === Number(id[12]);
}

// Personal JMBG: 13 digits starting with a day and month (DDMMYYY...).
const looksLikeJmbg = (id) => /^(0[1-9]|[12]\d|3[01])(0[1-9]|1[0-2])\d{9}$/.test(id);

export function normalizeTaxId(raw, country, log) {
  const value = clean(raw);
  if (!value) return null;
  const compact = value.replace(/\s/g, '');
  if (/^(\d)\1*$/.test(compact)) {
    log.fix('Uklonjen lažni ID broj (same nule/jedinice)');
    return null;
  }
  if (!/^\d+$/.test(compact)) return /^[A-Z]{2} \d/.test(value) ? compact : value;

  if (isValidBihId(compact)) return compact;
  if (compact.length === 12 && isValidBihId(`4${compact}`)) {
    log.fix('ID broj dopunjen početnom cifrom 4 (bio je unesen PDV broj)');
    return `4${compact}`;
  }
  if (looksLikeJmbg(compact)) {
    log.fix('ID broj je lični JMBG (fizičko lice)');
    return compact;
  }
  if (country === 'BA') log.warn(`ID broj "${value}" nije ispravan (kontrolna cifra ili dužina)`);
  return compact;
}

const LEGAL_SUFFIX = /\bd\.o\.o\b\.?(?=\s|$)/gi;

export function normalizeCompanyName(raw, log) {
  const value = clean(raw);
  if (!value) return null;
  const result = value.replace(LEGAL_SUFFIX, 'd.o.o.');
  if (result !== value) log.fix('Ujednačeno "d.o.o."');
  return result;
}

export function normalizePersonName(raw) {
  const value = clean(raw);
  if (!value) return null;
  // Short all-caps words ("FAB", "IT") are abbreviations, not shouting.
  return value.length > 3 && isShouting(value) ? titleCase(value) : value;
}

const POSITION_FIXES = { finasije: 'Finansije', kordinator: 'Koordinator' };

export function normalizePosition(raw, log) {
  const value = clean(raw);
  if (!value) return null;
  if (/^\d+$/.test(value)) {
    log.fix('Uklonjena pozicija koja je samo broj (šifra iz starog sistema)');
    return null;
  }
  const fixed = POSITION_FIXES[value.toLowerCase()];
  if (fixed) return fixed;
  return value.length <= 4 ? value : value[0].toUpperCase() + value.slice(1);
}

function levenshtein(a, b) {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diagonal = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const above = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, diagonal + (a[i - 1] === b[j - 1] ? 0 : 1));
      diagonal = above;
    }
  }
  return row[b.length];
}

const entityKey = (text) =>
  String(text ?? '')
    .toLowerCase()
    .replace(/\bd\.?\s?o\.?\s?o\.?|\bd\.d\.?/g, '')
    .replace(/[^\p{L}\p{N}]/gu, '');

// True when a "contact" is really the company name typed into the person field.
export function isSameEntity(name, companyName) {
  const a = entityKey(name);
  const b = entityKey(companyName);
  if (!a || !b) return false;
  return a === b || levenshtein(a, b) <= Math.max(2, Math.floor(Math.min(a.length, b.length) * 0.2));
}
