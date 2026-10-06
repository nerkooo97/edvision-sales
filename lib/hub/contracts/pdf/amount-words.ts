// An amount in words for the "(slovima: ...)" parts of the contracts, in Bosnian, for convertible marks (KM).
// "marka" is feminine, so 1 and 2 are "jedna" and "dvije" (also before "hiljada", which is feminine too);
// "milion" is masculine.

const ONES_FEMININE = ['', 'jedna', 'dvije', 'tri', 'četiri', 'pet', 'šest', 'sedam', 'osam', 'devet'];
const ONES_MASCULINE = ['', 'jedan', 'dva', 'tri', 'četiri', 'pet', 'šest', 'sedam', 'osam', 'devet'];
const TEENS = [
  'deset', 'jedanaest', 'dvanaest', 'trinaest', 'četrnaest', 'petnaest',
  'šesnaest', 'sedamnaest', 'osamnaest', 'devetnaest',
];
const TENS = ['', '', 'dvadeset', 'trideset', 'četrdeset', 'pedeset', 'šezdeset', 'sedamdeset', 'osamdeset', 'devedeset'];
const HUNDREDS = ['', 'sto', 'dvjesto', 'tristo', 'četiristo', 'petsto', 'šesto', 'sedamsto', 'osamsto', 'devetsto'];

/** 0..999 as words; `feminine` picks "jedna/dvije" over "jedan/dva". */
function belowThousand(value: number, feminine: boolean): string {
  const ones = feminine ? ONES_FEMININE : ONES_MASCULINE;
  const parts: string[] = [HUNDREDS[Math.floor(value / 100)]];
  const rest = value % 100;
  if (rest >= 10 && rest < 20) parts.push(TEENS[rest - 10]);
  else parts.push(TENS[Math.floor(rest / 10)], ones[rest % 10]);
  return parts.filter(Boolean).join(' ');
}

/** The right form of a noun for a count: 1 -> one, 2-4 -> few, otherwise many (11-14 are "many"). */
export function pluralForm(count: number, one: string, few: string, many: string): string {
  const lastTwo = count % 100;
  if (lastTwo >= 11 && lastTwo <= 14) return many;
  if (count % 10 === 1) return one;
  if (count % 10 >= 2 && count % 10 <= 4) return few;
  return many;
}

/** Whole numbers up to 999.999.999 as words ("hiljadu petsto", "dvije hiljade"). Zero is "nula". */
export function integerInWords(value: number): string {
  if (!Number.isInteger(value) || value < 0 || value > 999_999_999) throw new RangeError('Amount out of range');
  if (value === 0) return 'nula';

  const millions = Math.floor(value / 1_000_000);
  const thousands = Math.floor(value / 1000) % 1000;
  const units = value % 1000;
  const parts: string[] = [];

  if (millions > 0) {
    const noun = pluralForm(millions, 'milion', 'miliona', 'miliona');
    parts.push(millions === 1 ? noun : `${belowThousand(millions, false)} ${noun}`);
  }
  if (thousands > 0) {
    const noun = pluralForm(thousands, 'hiljada', 'hiljade', 'hiljada');
    parts.push(thousands === 1 ? 'hiljadu' : `${belowThousand(thousands, true)} ${noun}`);
  }
  if (units > 0) parts.push(belowThousand(units, true));
  return parts.join(' ');
}

/**
 * "tristo pedeset konvertibilnih maraka", "dvije konvertibilne marke i 50/100".
 * Works on the amount rounded to whole pfennigs; the pfennigs are written as a fraction of 100.
 */
export function amountInWords(amount: number): string {
  const cents = Math.round(amount * 100);
  const whole = Math.floor(cents / 100);
  const fraction = cents % 100;
  const noun = pluralForm(whole, 'konvertibilna marka', 'konvertibilne marke', 'konvertibilnih maraka');
  const base = `${integerInWords(whole)} ${noun}`;
  return fraction > 0 ? `${base} i ${String(fraction).padStart(2, '0')}/100` : base;
}
