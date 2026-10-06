// Small calculations shared by the contract templates. Pure functions, no I/O.

import { addMonthsUtc } from '../dates';
import { formatKm } from '../format';
import type { ComputedRow, ContractValues } from './types';

/** Reads "1.234,50" or "1234.5" from a form field; empty or invalid text counts as 0. */
export function parseMoney(text: string | undefined): number {
  if (!text) return 0;
  const cleaned = text.trim().replace(/\s/g, '');
  // "1.234,50": dots are thousands separators when a comma is present.
  const normalized = cleaned.includes(',') ? cleaned.replace(/\./g, '').replace(',', '.') : cleaned;
  const value = Number(normalized);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

/** Contract end as the tables in this app use it: the start date plus the length (15.12.2025 -> 15.12.2026). */
export function contractEnd(start: string | undefined, months: number): string | null {
  return start ? addMonthsUtc(start, months) : null;
}

/** "Kraj perioda" row, shown once a start date is entered. */
export function endRow(values: ContractValues, months: number): ComputedRow[] {
  const end = contractEnd(values.start_date, months);
  return end ? [{ label: `Period trajanja (${months} mjeseci)`, value: `${formatDay(values.start_date)} – ${formatDay(end)}` }] : [];
}

export function totalRow(monthlyFee: number, months: number): ComputedRow[] {
  return monthlyFee > 0 ? [{ label: 'Ukupna vrijednost', value: `${formatKm(monthlyFee * months)} bez PDV-a` }] : [];
}

/** YYYY-MM-DD as DD.MM.YYYY. */
export function formatDay(date: string | undefined): string {
  if (!date) return '';
  const [year, month, day] = date.slice(0, 10).split('-');
  return `${day}.${month}.${year}.`;
}
