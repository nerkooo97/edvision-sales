// Calendar-date helpers. Dates are handled as "YYYY-MM-DD" strings in UTC so results never depend on
// the time zone of the server or the browser.

const DAY_MS = 86_400_000;

const toMs = (date: string) => Date.parse(`${date.slice(0, 10)}T00:00:00Z`);
const fromMs = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** How a date is stored in the database: an ISO datetime at UTC midnight. */
export function toStoredDate(date: string): string {
  return `${date.slice(0, 10)}T00:00:00.000+00:00`;
}

export function addDaysUtc(date: string, days: number): string {
  return fromMs(toMs(date) + days * DAY_MS);
}

/** Whole days from `from` to `to` (negative when `to` is earlier). */
export function diffDaysUtc(from: string, to: string): number {
  return Math.round((toMs(to) - toMs(from)) / DAY_MS);
}

/** Adds calendar months and clamps the day, so 31 Jan + 1 month is 28/29 Feb rather than 3 March. */
export function addMonthsUtc(date: string, months: number): string {
  const [year, month, day] = date.slice(0, 10).split('-').map(Number);
  const target = new Date(Date.UTC(year, month - 1 + months, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(day, lastDay));
  return target.toISOString().slice(0, 10);
}

export function todayUtc(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}
