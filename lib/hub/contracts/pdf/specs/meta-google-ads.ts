import { contractEnd, formatDay } from '../../compute';
import { formatAmount } from '../format';
import { commonPatches } from './common';
import {
  amountOf, at, bold, inWords, km, posts, stories, termsRow, text, value, visualsCount,
  type Spec, type SpecContext,
} from './helpers';

const MONTHS = 12;
const X = 186;

/** The amount without "KM": the template writes the unit as plain text next to the bold number. */
const number = (amount: number) => formatAmount(amount);

/** Ugovor o digitalnom marketingu: Meta i Google Ads. */
export function metaGoogleAdsSpec(context: SpecContext): Spec {
  const { values } = context;
  const row = termsRow(X);
  const feeMeta = amountOf(values, 'fee_meta');
  const feeGoogle = amountOf(values, 'fee_google');
  const monthly = feeMeta + feeGoogle;
  const website = value(values, 'website');
  const area = value(values, 'area');
  const offer = value(values, 'offer_number');
  const extraWork = `dodatni rad ${number(amountOf(values, 'hourly_rate'))} KM/h bez PDV-a`;
  const end = contractEnd(value(values, 'start_date'), MONTHS) ?? '';

  const patches = [
    ...commonPatches(context, {
      header: 739.2, name: 681.9, seat: 657.7, seatLines: [664.2, 651.3], id: 633.6, vat: 615.7,
      representative: 597.9, contact: 580.1, email: 562.3, bank: 544.4,
      signatureName: 422.6, signatureRepresentative: 375.9,
    }),
    row(470.9, [at(X, 146.3)], [
      text('Meta: '), bold(value(values, 'meta_package')), text('   ·   Google Ads: '), bold(value(values, 'google_package')),
    ]),
    row(453.1, [at(X, 286.5)], [text(value(values, 'brands'))]),
    row(435.3, [at(X, 215.2)], [bold(website), text(area ? `${website ? '; ' : ''}područje: ${area}` : '')]),
    row(417.4, [at(X, 174.8)], [text(`od ${formatDay(value(values, 'start_date'))} do ${formatDay(end)} (${MONTHS} mjeseci)`)]),
    row(399.7, [at(X, 263.1)], [
      bold(`${km(monthly)} bez PDV-a`), text(`, od toga Meta ${km(feeMeta)} i Google Ads ${km(feeGoogle)}`),
    ]),
    row(381.8, [at(X, 78.6), at(266.9, 96)], [bold(`${km(monthly * MONTHS)} bez PDV-a`), text(inWords(monthly * MONTHS))]),
    row(364.0, [at(X, 175.6)], [text(`do ${value(values, 'payment_day')}. dana u mjesecu za prethodni mjesec`)]),
    row(346.1, [at(X, 180.0)], [
      text(`${posts(value(values, 'feed_posts'))}, ${stories(value(values, 'story_posts'))} i ${visualsCount(value(values, 'visuals'))} sedmično`),
    ]),
    row(328.4, [at(X, 211.3)], [
      text('Meta do '), bold(number(amountOf(values, 'budget_meta'))), text(' KM, Google Ads do '),
      bold(number(amountOf(values, 'budget_google'))), text(' KM mjesečno'),
    ]),
    row(292.7, [at(X, 249.5)], [
      text(offer ? `Ponuda br. ${offer}; ${extraWork}` : `${extraWork[0].toUpperCase()}${extraWork.slice(1)}`),
    ]),
  ];

  return { patches, crosses: [] };
}
