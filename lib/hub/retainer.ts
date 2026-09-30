// Recurring services (e.g. social media management): a fixed contract term, a monthly fee and an agreed
// number of deliverables (posts) per week. Pure functions only, so the rules are easy to test and to change.

import { addDaysUtc, addMonthsUtc, diffDaysUtc, toStoredDate, todayUtc } from './dates';
import { HubError } from './errors';

import type { ProjectType } from './constants';

/** Project types sold as a recurring service with a contract term (the form then asks for the contract terms). */
export const RECURRING_PROJECT_TYPES: readonly ProjectType[] = ['social_media'];

export const isRecurringType = (type: ProjectType): boolean => RECURRING_PROJECT_TYPES.includes(type);

export const CONTRACT_MAX_MONTHS = 36;
export const MAX_WEEKLY_QUOTA = 50;
/** 36 months is 157 weeks; the cap keeps the week number safely inside the column and the row id. */
export const MAX_CONTRACT_WEEKS = 160;

/** Project columns that describe a recurring service. All null on an ordinary project. */
export interface ContractColumns {
  contract_start_date: string | null;
  contract_months: number | null;
  monthly_fee: number | null;
  weekly_quota: number | null;
  extra_post_price: number | null;
}

export const isRecurring = (project: Pick<ContractColumns, 'weekly_quota'>): boolean =>
  project.weekly_quota !== null && project.weekly_quota !== undefined && project.weekly_quota > 0;

const round2 = (value: number) => Math.round(value * 100) / 100;

/** Last day of the contract (inclusive): six months from 1 Oct end on 31 Mar. */
export function getContractEnd(start: string, months: number): string {
  return addDaysUtc(addMonthsUtc(start, months), -1);
}

/**
 * Validates the contract fields of a project write (after merging with the stored project) and derives
 * what follows from them: the end date becomes the project's planned deadline and the total value is
 * the monthly fee times the number of months. Returns null for an ordinary project.
 */
export function resolveContractTerms(merged: Partial<ContractColumns>): {
  planned_deadline: string;
  budget: number;
} | null {
  const { contract_start_date: start, contract_months: months, monthly_fee: fee, weekly_quota: quota } = merged;
  const provided = [start, months, fee, quota].filter((value) => value !== null && value !== undefined);

  if (provided.length === 0) return null;
  if (provided.length < 4) {
    throw new HubError(
      'validation',
      'Za stalnu uslugu unesite početak ugovora, trajanje u mjesecima, mjesečnu naknadu i broj objava sedmično.'
    );
  }

  return {
    planned_deadline: toStoredDate(getContractEnd(start as string, months as number)),
    budget: round2((fee as number) * (months as number)),
  };
}

export interface ContractWeek {
  /** 1-based number within the contract. */
  week: number;
  start: string;
  end: string;
}

/**
 * The weekly grid of a contract. Weeks run from the contract start in blocks of 7 days, and the count is
 * the term in days divided by 7 and rounded (26 for six months), so a few spare days never create a
 * separate near-empty week.
 */
export function getContractWeeks(start: string, months: number): ContractWeek[] {
  const days = diffDaysUtc(start, getContractEnd(start, months)) + 1;
  const count = Math.min(MAX_CONTRACT_WEEKS, Math.max(1, Math.round(days / 7)));

  return Array.from({ length: count }, (_, index) => ({
    week: index + 1,
    start: addDaysUtc(start, index * 7),
    end: addDaysUtc(start, index * 7 + 6),
  }));
}

export type WeekState = 'future' | 'current' | 'under' | 'ok' | 'over';

export interface WeekSummary extends ContractWeek {
  quota: number;
  delivered: number;
  state: WeekState;
}

export interface MonthSummary {
  /** 0-based contract month. */
  index: number;
  start: string;
  end: string;
  weeks: number;
  contracted: number;
  delivered: number;
  /** Delivered above what was contracted for the month: this is billed on top of the monthly fee. */
  extra: number;
  /** Contracted but not delivered. */
  shortfall: number;
  monthlyFee: number;
  extraAmount: number;
  invoiceTotal: number;
  /** The month is over, so its numbers are final and it can be invoiced. */
  isClosed: boolean;
}

export interface DeliverySummary {
  weeks: WeekSummary[];
  months: MonthSummary[];
  totals: { contracted: number; delivered: number; extra: number; percent: number };
  /** The week containing today, when the contract is running. */
  currentWeek: number | null;
}

export interface DeliveryContract {
  start: string;
  months: number;
  weeklyQuota: number;
  monthlyFee: number;
  extraPostPrice: number | null;
}

/** Which contract month a week belongs to: the month that contains the week's first day. */
function monthIndexOf(contract: DeliveryContract, weekStart: string): number {
  for (let index = contract.months - 1; index > 0; index -= 1) {
    if (weekStart >= addMonthsUtc(contract.start, index)) return index;
  }
  return 0;
}

/**
 * Turns the logged deliveries into the weekly grid and the monthly invoicing figures.
 *
 * The extra (billable) posts are worked out per month, not per week: a shortfall in one week can be
 * made up by a surplus in another week of the same month, and only the month's net surplus is billed.
 */
export function buildDeliverySummary(
  contract: DeliveryContract,
  deliveries: { week: number; delivered: number }[],
  today: string = todayUtc()
): DeliverySummary {
  const deliveredByWeek = new Map(deliveries.map((entry) => [entry.week, entry.delivered]));
  const quota = contract.weeklyQuota;
  const price = contract.extraPostPrice ?? 0;

  const weeks: WeekSummary[] = getContractWeeks(contract.start, contract.months).map((week) => {
    const delivered = deliveredByWeek.get(week.week) ?? 0;
    let state: WeekState;
    if (week.start > today) state = 'future';
    else if (week.end >= today) state = 'current';
    else state = delivered < quota ? 'under' : delivered > quota ? 'over' : 'ok';
    return { ...week, quota, delivered, state };
  });

  const months: MonthSummary[] = Array.from({ length: contract.months }, (_, index) => {
    const start = addMonthsUtc(contract.start, index);
    const end = addDaysUtc(addMonthsUtc(contract.start, index + 1), -1);
    const inMonth = weeks.filter((week) => monthIndexOf(contract, week.start) === index);

    const contracted = inMonth.length * quota;
    const delivered = inMonth.reduce((sum, week) => sum + week.delivered, 0);
    const extra = Math.max(0, delivered - contracted);
    const extraAmount = round2(extra * price);

    return {
      index,
      start,
      end,
      weeks: inMonth.length,
      contracted,
      delivered,
      extra,
      shortfall: Math.max(0, contracted - delivered),
      monthlyFee: contract.monthlyFee,
      extraAmount,
      invoiceTotal: round2(contract.monthlyFee + extraAmount),
      isClosed: end < today,
    };
  });

  const contracted = months.reduce((sum, month) => sum + month.contracted, 0);
  const delivered = weeks.reduce((sum, week) => sum + week.delivered, 0);

  return {
    weeks,
    months,
    totals: {
      contracted,
      delivered,
      extra: months.reduce((sum, month) => sum + month.extra, 0),
      percent: contracted > 0 ? (delivered / contracted) * 100 : 0,
    },
    currentWeek: weeks.find((week) => week.state === 'current')?.week ?? null,
  };
}
