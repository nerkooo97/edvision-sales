import { contractEnd, formatDay } from '../../compute';
import { commonPatches } from './common';
import {
  amountOf, at, bold, inWords, km, packageSegments, termsRow, text, value,
  type Spec, type SpecContext,
} from './helpers';

const MONTHS = 6;
const X = 186;

/** Ugovor o digitalnom marketingu: Google Ads. */
export function googleAdsSpec(context: SpecContext): Spec {
  const { values } = context;
  const row = termsRow(X);
  const monthly = amountOf(values, 'monthly_fee');
  const budget = amountOf(values, 'ad_budget');
  const goal = value(values, 'goal');
  const end = contractEnd(value(values, 'start_date'), MONTHS) ?? '';

  const patches = [
    ...commonPatches(context, {
      header: 739.2, name: 681.9, seat: 657.7, seatLines: [664.2, 651.3], id: 633.6, vat: 615.7,
      representative: 597.9, contact: 580.1, email: 562.3, bank: 544.4,
      signatureName: 440.4, signatureRepresentative: 393.6,
    }),
    row(470.9, [at(X, 106.8)], packageSegments(value(values, 'google_package'))),
    row(453.1, [at(X, 232.1)], [bold(value(values, 'website')), text(goal ? `; cilj: ${goal}` : '')]),
    row(435.3, [at(X, 100.8)], [text(value(values, 'area'))]),
    row(417.4, [at(X, 169.8)], [text(`od ${formatDay(value(values, 'start_date'))} do ${formatDay(end)} (${MONTHS} mjeseci)`)]),
    row(399.7, [at(X, 78.6)], [bold(`${km(monthly)} bez PDV-a`)]),
    row(381.8, [at(X, 78.6), at(266.9, 96)], [bold(`${km(monthly * MONTHS)} bez PDV-a`), text(inWords(monthly * MONTHS))]),
    row(364.0, [at(X, 175.6)], [text(`do ${value(values, 'payment_day')}. dana u mjesecu za prethodni mjesec`)]),
    row(346.1, [at(X, 187.3)], [text('do '), bold(`${km(budget)} mjesečno`), text(inWords(budget))]),
    row(310.5, [at(X, 156.8)], [text(`${km(amountOf(values, 'hourly_rate'))} bez PDV-a po započetom satu`)]),
  ];

  return { patches, crosses: [] };
}
