// Period filter of the reports: a year, optionally a month, applied to one chosen date of the projects.
// Pure functions, shared by the reports page (which filters on the server from the URL) and the filter control.

import type { HubProjectSummary } from './types';

/** Which date of a project decides the month it belongs to. */
export const PERIOD_BASES = ['offer', 'start', 'deadline', 'invoice'] as const;
export type PeriodBasis = (typeof PERIOD_BASES)[number];

export const DEFAULT_PERIOD_BASIS: PeriodBasis = 'offer';

export const PERIOD_BASIS_LABELS: Record<PeriodBasis, string> = {
  offer: 'Datum ponude',
  start: 'Početak rada',
  deadline: 'Planirani rok',
  invoice: 'Datum fakture',
};

export const MONTH_NAMES = [
  'Januar',
  'Februar',
  'Mart',
  'April',
  'Maj',
  'Juni',
  'Juli',
  'August',
  'Septembar',
  'Oktobar',
  'Novembar',
  'Decembar',
] as const;

export interface ReportPeriod {
  basis: PeriodBasis;
  /** null = all years (and then no month either). */
  year: number | null;
  /** 1-12, only together with a year. */
  month: number | null;
}

type DatedProject = Pick<
  HubProjectSummary,
  '$createdAt' | 'offer_date' | 'start_date' | 'planned_deadline' | 'invoice_date'
>;

/** The project's date for the chosen basis (YYYY-MM-DD), or null when it has none. */
export function dateForBasis(project: DatedProject, basis: PeriodBasis): string | null {
  const value =
    basis === 'offer'
      ? (project.offer_date ?? project.$createdAt) // a project without an offer date counts from when it was created
      : basis === 'start'
        ? project.start_date
        : basis === 'deadline'
          ? project.planned_deadline
          : project.invoice_date;
  return value ? value.slice(0, 10) : null;
}

const asNumber = (value: string | undefined): number | null => {
  if (!value || !/^\d+$/.test(value)) return null;
  return Number(value);
};

/** Reads the period from URL parameters; anything invalid falls back to "no filter". */
export function parsePeriod(params: { basis?: string; year?: string; month?: string }): ReportPeriod {
  const basis = (PERIOD_BASES as readonly string[]).includes(params.basis ?? '')
    ? (params.basis as PeriodBasis)
    : DEFAULT_PERIOD_BASIS;

  const year = asNumber(params.year);
  if (year === null || year < 2000 || year > 2100) return { basis, year: null, month: null };

  const month = asNumber(params.month);
  return { basis, year, month: month !== null && month >= 1 && month <= 12 ? month : null };
}

export const isPeriodFiltered = (period: ReportPeriod): boolean => period.year !== null;

export function filterByPeriod<T extends DatedProject>(projects: T[], period: ReportPeriod): T[] {
  if (period.year === null) return projects;
  const prefix = period.month === null ? String(period.year) : `${period.year}-${String(period.month).padStart(2, '0')}`;
  return projects.filter((project) => dateForBasis(project, period.basis)?.startsWith(prefix));
}

/** Years to offer in the filter: those present in the data, the current year and the selected one, newest first. */
export function availableYears(projects: DatedProject[], period: ReportPeriod, now: Date = new Date()): number[] {
  const years = new Set<number>([now.getUTCFullYear()]);
  if (period.year !== null) years.add(period.year);
  for (const project of projects) {
    const date = dateForBasis(project, period.basis);
    if (date) years.add(Number(date.slice(0, 4)));
  }
  return [...years].sort((a, b) => b - a);
}

/** "Oktobar 2026", "2026" or "Sve godine". */
export function describePeriod(period: ReportPeriod): string {
  if (period.year === null) return 'Sve godine';
  return period.month === null ? String(period.year) : `${MONTH_NAMES[period.month - 1]} ${period.year}`;
}
