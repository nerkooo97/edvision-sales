// Building blocks for the template specs. Every number here is a measurement of the template PDF
// (x, baseline and width of the placeholder text), taken from the text layer of the file.

import { parseMoney } from '../../compute';
import type { ContractValues } from '../../types';
import { amountInWords, pluralForm } from '../amount-words';
import type { Patch, Segment } from '../engine';
import { formatAmount } from '../format';

export interface SpecContext {
  values: ContractValues;
  /** Width of a text at the standard size, to decide things like splitting an address in two lines. */
  textWidth: (text: string, bold?: boolean) => number;
}

export interface BoxCross {
  page: number;
  x: number;
  baseline: number;
}

export interface Spec {
  patches: Patch[];
  crosses: BoxCross[];
}

/** Right edge of the value columns; text is scaled down rather than crossing the table border. */
export const TABLE_RIGHT_EDGE = 540;

export const text = (value: string): Segment => ({ text: value });
export const bold = (value: string): Segment => ({ text: value, bold: true });

export const value = (values: ContractValues, key: string): string => (values[key] ?? '').trim();

/** Covers the placeholder text of one cell and writes `segments` at the same place; no segments = blank cell. */
export function cell(
  page: number,
  x: number,
  baseline: number,
  placeholders: { x: number; width: number }[],
  segments: Segment[] | null,
  maxWidth: number
): Patch {
  return {
    page,
    erase: placeholders.map((box) => ({ ...box, baseline })),
    run: segments && segments.some((segment) => segment.text.trim()) ? { x, baseline, segments, maxWidth } : undefined,
  };
}

/** One placeholder starting at `x` with the measured `width`. */
export const at = (x: number, width: number) => ({ x, width });

/** A form field as an amount (0 when empty). */
export const amountOf = (values: ContractValues, key: string): number => parseMoney(values[key]);

/** Money in the contract: "1.234,50 KM". */
export const km = (amount: number): string => `${formatAmount(amount)} KM`;

/** " (slovima: tristo pedeset konvertibilnih maraka)". */
export const inWords = (amount: number): string => ` (slovima: ${amountInWords(amount)})`;

/** Makes the patch builder of the "Osnovni uslovi ugovora" table: values start at `x` and may reach the table edge. */
export function termsRow(x: number) {
  return (baseline: number, placeholders: { x: number; width: number }[], segments: Segment[]): Patch =>
    cell(0, x, baseline, placeholders, segments, TABLE_RIGHT_EDGE - x);
}

/** "START paket – Google Ads": the first word is bold, as in the template. */
export function packageSegments(packageName: string): Segment[] {
  const [first, ...rest] = packageName.split(' ');
  return rest.length ? [bold(first), text(` ${rest.join(' ')}`)] : [bold(first)];
}

export const joinFilled = (parts: string[], separator = ', '): string => parts.filter(Boolean).join(separator);

/** "2 objave", "5 objava" for the weekly counts. */
export const posts = (count: string): string => `${count} ${pluralForm(Number(count), 'objava', 'objave', 'objava')}`;
export const stories = (count: string): string =>
  `${count} ${pluralForm(Number(count), 'story objava', 'story objave', 'story objava')}`;
export const visualsCount = (count: string): string =>
  `${count} ${pluralForm(Number(count), 'vizual', 'vizuala', 'vizuala')}`;
