import { contractEnd, formatDay } from '../../compute';
import type { Patch } from '../engine';
import { commonPatches } from './common';
import {
  amountOf, at, bold, inWords, km, termsRow, text, value,
  type BoxCross, type Spec, type SpecContext,
} from './helpers';

const MONTHS = 12;
const X = 181;
const BACKUP_LABELS: Record<string, string> = { daily: 'dnevno', weekly: 'sedmično', monthly: 'mjesečno' };
const BILLING_LABELS: Record<string, string> = { yearly: 'godišnje, unaprijed', quarterly: 'kvartalno', monthly: 'mjesečno' };

// Article 2 (page 2): the placeholders of 2.8 (hosting package) and 2.9 (extra systems) sit inside a sentence
// next to an empty box. When they are filled the placeholder is replaced and the box gets its cross.
const ARTICLE_PAGE = 1;
const BOX_X = 51.0;
const LINE_END = 544.4;

// `x` is where the placeholder starts; `after` is the rest of that line of the sentence, which is written
// again right behind the value so no gap is left when the value is shorter than the placeholder.
const HOSTING = { x: 353.4, baseline: 375.8, after: ', uključujući praćenje dostupnosti' };
const EXTRA_SYSTEMS = { x: 312.3, baseline: 347.8, after: ', u obimu iz tačaka 2.2–' };

function articleText(content: string, spot: { x: number; baseline: number; after: string }): Patch[] {
  if (!content) return [];
  const width = LINE_END - spot.x;
  return [
    {
      page: ARTICLE_PAGE,
      erase: [{ x: spot.x, width, baseline: spot.baseline }],
      run: { x: spot.x, baseline: spot.baseline, maxWidth: width, segments: [text(`${content}${spot.after}`)] },
    },
  ];
}

/** Ugovor o održavanju web stranice. */
export function webMaintenanceSpec(context: SpecContext): Spec {
  const { values } = context;
  const row = termsRow(X);
  const price = amountOf(values, 'price');
  const hosting = value(values, 'hosting_package');
  const extraSystems = value(values, 'extra_systems');
  const end = contractEnd(value(values, 'start_date'), MONTHS) ?? '';

  const crosses: BoxCross[] = [];
  if (hosting) crosses.push({ page: ARTICLE_PAGE, x: BOX_X, baseline: HOSTING.baseline });
  if (extraSystems) crosses.push({ page: ARTICLE_PAGE, x: BOX_X, baseline: EXTRA_SYSTEMS.baseline });

  const patches = [
    ...commonPatches(context, {
      header: 750.0, name: 692.7, seat: 668.6, seatLines: [675.0, 662.1], id: 644.4, vat: 626.5,
      representative: 608.7, contact: 590.9, email: 573.1, bank: 555.2,
      signatureName: 329.1, signatureRepresentative: 279.5,
    }),
    row(481.8, [at(X, 68.6)], [bold(value(values, 'website'))]),
    row(463.9, [at(X, 123.3)], [text(`od ${formatDay(value(values, 'start_date'))} do ${formatDay(end)}`)]),
    row(446.1, [at(X, 78.6), at(261.9, 96)], [bold(`${km(price)} bez PDV-a`), text(inWords(price))]),
    row(428.2, [at(X, 77.7)], [text(BILLING_LABELS[value(values, 'billing')] ?? BILLING_LABELS.yearly)]),
    row(410.5, [at(X, 139.7)], [text(`${value(values, 'payment_days')} dana od dana ispostave fakture`)]),
    row(392.6, [at(X, 123.2)], [text(`do ${value(values, 'content_changes')} manjih izmjena mjesečno`)]),
    row(374.8, [at(X, 39.0)], [text(BACKUP_LABELS[value(values, 'backup')] ?? BACKUP_LABELS.weekly)]),
    row(357.1, [at(X, 66.6)], [text(`do ${value(values, 'support_hours')} h mjesečno`)]),
    row(339.2, [at(X, 156.8)], [text(`${km(amountOf(values, 'hourly_rate'))} bez PDV-a po započetom satu`)]),
    ...articleText(hosting, HOSTING),
    ...articleText(extraSystems, EXTRA_SYSTEMS),
  ];

  return { patches, crosses };
}
