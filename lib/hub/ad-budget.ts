// Ad budget: money the client spends directly on advertising platforms (Meta, Google Ads). It is planned and
// tracked per month and per platform, and it is NOT agency revenue, so it never enters project value or reports
// on income. Pure functions only.

import { addMonthsUtc, todayUtc } from './dates';
import type { ProjectType } from './constants';

export const AD_PLATFORMS = ['meta', 'google'] as const;
export type AdPlatform = (typeof AD_PLATFORMS)[number];

/** Project types that manage advertising for a client, so their detail screen offers the ad budget. */
export const AD_BUDGET_PROJECT_TYPES: readonly ProjectType[] = ['social_media', 'google_ads', 'marketing_campaign'];

export const hasAdBudget = (type: ProjectType): boolean => AD_BUDGET_PROJECT_TYPES.includes(type);

/** Platforms a project type advertises on: social media is Meta, Google Ads is Google, a campaign may use both. */
const PLATFORMS_BY_TYPE: Partial<Record<ProjectType, readonly AdPlatform[]>> = {
  social_media: ['meta'],
  google_ads: ['google'],
  marketing_campaign: ['meta', 'google'],
};

/**
 * The platforms to show for a project: those that fit its type, plus any platform that already has data,
 * so a project whose type was changed later never hides what was entered.
 */
export function getAdPlatforms(type: ProjectType, withData: readonly AdPlatform[] = []): AdPlatform[] {
  const wanted = new Set<AdPlatform>([...(PLATFORMS_BY_TYPE[type] ?? AD_PLATFORMS), ...withData]);
  return AD_PLATFORMS.filter((platform) => wanted.has(platform));
}

export const AD_BUDGET_MAX_MONTHS = 36;
export const AD_AMOUNT_MAX = 10_000_000;

const MONTH_NAMES = [
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
];

/** A calendar month as "YYYY-MM". */
export const monthOf = (date: string): string => date.slice(0, 7);

export const isMonthKey = (value: string): boolean => /^\d{4}-(0[1-9]|1[0-2])$/.test(value);

export function monthLabel(month: string): string {
  const [year, monthNumber] = month.split('-').map(Number);
  return `${MONTH_NAMES[monthNumber - 1]} ${year}`;
}

const shiftMonth = (month: string, by: number): string => monthOf(addMonthsUtc(`${month}-01`, by));

/** Every month from `start` to `end` inclusive, capped so a wrong date can never produce a huge list. */
export function monthsBetween(start: string, end: string, cap: number = AD_BUDGET_MAX_MONTHS): string[] {
  const months: string[] = [];
  for (let month = start; month <= end && months.length < cap; month = shiftMonth(month, 1)) months.push(month);
  return months;
}

/**
 * The months shown for a project: its own period (start to deadline, or a few months ahead when it has
 * no deadline), plus any month that already has data and the current month, in order.
 */
export function resolveAdMonths(
  period: { startDate: string | null; endDate: string | null },
  entryMonths: string[],
  today: string = todayUtc()
): string[] {
  const current = monthOf(today);
  const start = monthOf(period.startDate ?? today);
  const end = period.endDate ? monthOf(period.endDate) : shiftMonth(start, 5);

  const months = new Set<string>([current, ...entryMonths]);
  if (end >= start) monthsBetween(start, end).forEach((month) => months.add(month));

  return [...months].sort();
}

export interface AdEntry {
  month: string;
  platform: AdPlatform;
  planned: number;
  spent: number;
}

export interface PlatformAmounts {
  planned: number;
  spent: number;
}

export interface AdMonthRow {
  month: string;
  platforms: Record<AdPlatform, PlatformAmounts>;
  planned: number;
  spent: number;
  /** planned - spent; negative means the plan was exceeded. */
  remaining: number;
  /** At least one platform spent more than planned. */
  overspent: boolean;
  isCurrent: boolean;
  isClosed: boolean;
}

export interface AdBudgetTable {
  rows: AdMonthRow[];
  totals: { platforms: Record<AdPlatform, PlatformAmounts>; planned: number; spent: number };
}

const emptyPlatforms = (): Record<AdPlatform, PlatformAmounts> => ({
  meta: { planned: 0, spent: 0 },
  google: { planned: 0, spent: 0 },
});

const round2 = (value: number) => Math.round(value * 100) / 100;

export const isOverspent = (amounts: PlatformAmounts): boolean => amounts.spent > amounts.planned;

export function buildAdBudgetTable(entries: AdEntry[], months: string[], today: string = todayUtc()): AdBudgetTable {
  const current = monthOf(today);
  const totals = { platforms: emptyPlatforms(), planned: 0, spent: 0 };

  const rows = months.map((month): AdMonthRow => {
    const platforms = emptyPlatforms();
    for (const entry of entries) {
      if (entry.month !== month) continue;
      platforms[entry.platform].planned += entry.planned;
      platforms[entry.platform].spent += entry.spent;
    }

    const planned = round2(AD_PLATFORMS.reduce((sum, platform) => sum + platforms[platform].planned, 0));
    const spent = round2(AD_PLATFORMS.reduce((sum, platform) => sum + platforms[platform].spent, 0));

    for (const platform of AD_PLATFORMS) {
      totals.platforms[platform].planned = round2(totals.platforms[platform].planned + platforms[platform].planned);
      totals.platforms[platform].spent = round2(totals.platforms[platform].spent + platforms[platform].spent);
    }
    totals.planned = round2(totals.planned + planned);
    totals.spent = round2(totals.spent + spent);

    return {
      month,
      platforms,
      planned,
      spent,
      remaining: round2(planned - spent),
      overspent: AD_PLATFORMS.some((platform) => isOverspent(platforms[platform])),
      isCurrent: month === current,
      isClosed: month < current,
    };
  });

  return { rows, totals };
}

export interface ProjectAdMonth {
  projectId: string;
  platforms: Record<AdPlatform, PlatformAmounts>;
  planned: number;
  spent: number;
  /** Platforms that went over their plan this month. */
  overspentPlatforms: AdPlatform[];
}

/** One month across many projects: per project, what was planned and spent and where the plan was exceeded. */
export function summarizeAdMonth(entries: (AdEntry & { project_id: string })[]): ProjectAdMonth[] {
  const byProject = new Map<string, { entries: AdEntry[] }>();
  for (const entry of entries) {
    const group = byProject.get(entry.project_id) ?? { entries: [] };
    group.entries.push(entry);
    byProject.set(entry.project_id, group);
  }

  return [...byProject].map(([projectId, group]) => {
    const platforms = emptyPlatforms();
    for (const entry of group.entries) {
      platforms[entry.platform].planned += entry.planned;
      platforms[entry.platform].spent += entry.spent;
    }
    return {
      projectId,
      platforms,
      planned: round2(AD_PLATFORMS.reduce((sum, platform) => sum + platforms[platform].planned, 0)),
      spent: round2(AD_PLATFORMS.reduce((sum, platform) => sum + platforms[platform].spent, 0)),
      overspentPlatforms: AD_PLATFORMS.filter((platform) => isOverspent(platforms[platform])),
    };
  });
}
