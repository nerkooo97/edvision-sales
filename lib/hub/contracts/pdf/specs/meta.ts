import { contractEnd, formatDay } from '../../compute';
import { commonPatches } from './common';
import {
  amountOf, at, bold, inWords, km, packageSegments, posts, stories, termsRow, text, value, visualsCount,
  type Spec, type SpecContext,
} from './helpers';

const MONTHS = 6;
const X = 186;

/** Ugovor o digitalnom marketingu: Meta (Facebook i Instagram). */
export function metaSpec(context: SpecContext): Spec {
  const { values } = context;
  const row = termsRow(X);
  const monthly = amountOf(values, 'monthly_fee');
  const end = contractEnd(value(values, 'start_date'), MONTHS) ?? '';

  const patches = [
    ...commonPatches(context, {
      header: 739.2, name: 681.9, seat: 657.7, seatLines: [664.2, 651.3], id: 633.6, vat: 615.7,
      representative: 597.9, contact: 580.1, email: 562.3, bank: 544.4,
      signatureName: 376.0, signatureRepresentative: 326.4,
    }),
    row(470.9, [at(X, 147.5)], packageSegments(value(values, 'meta_package'))),
    row(453.1, [at(X, 172.7)], [text(value(values, 'profiles'))]),
    row(435.3, [at(X, 169.8)], [text(`od ${formatDay(value(values, 'start_date'))} do ${formatDay(end)} (${MONTHS} mjeseci)`)]),
    row(417.4, [at(X, 78.6)], [bold(`${km(monthly)} bez PDV-a`)]),
    row(399.7, [at(X, 78.6), at(266.9, 96)], [bold(`${km(monthly * MONTHS)} bez PDV-a`), text(inWords(monthly * MONTHS))]),
    row(381.8, [at(X, 175.6)], [text(`do ${value(values, 'payment_day')}. dana u mjesecu za prethodni mjesec`)]),
    row(364.0, [at(X, 75.8)], [text(`${posts(value(values, 'feed_posts'))} sedmično`)]),
    row(346.1, [at(X, 98.6)], [text(`${stories(value(values, 'story_posts'))} sedmično`)]),
    row(328.4, [at(X, 76.5)], [text(`${visualsCount(value(values, 'visuals'))} sedmično`)]),
    row(310.5, [at(X, 273.2)], [text(`okvirno ${km(amountOf(values, 'ad_budget'))} mjesečno; plaća: Naručilac karticom direktno Meti`)]),
    row(292.7, [at(X, 156.9)], [text(`${km(amountOf(values, 'hourly_rate'))} bez PDV-a po započetom satu`)]),
  ];

  return { patches, crosses: [] };
}
