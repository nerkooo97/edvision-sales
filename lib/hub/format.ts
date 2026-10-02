import { FINISHED_STATUSES, type ProjectStatus } from './constants';
import { formatNumber } from './currency';

/** Project values are entered in convertible marks (KM). */
export function formatKm(value: number): string {
  return `${formatNumber(value)} KM`;
}

/** Stored dates are ISO datetimes at UTC midnight; <input type="date"> wants YYYY-MM-DD. */
export function toDateInputValue(stored: string | null | undefined): string {
  return stored ? stored.slice(0, 10) : '';
}

/** A project is late when its deadline day has passed and its work is not finished yet. */
export function isProjectOverdue(
  project: { status: ProjectStatus; planned_deadline: string | null },
  now: Date = new Date()
): boolean {
  if (!project.planned_deadline || FINISHED_STATUSES.includes(project.status)) return false;
  return project.planned_deadline.slice(0, 10) < now.toISOString().slice(0, 10);
}

/** Whole days between the deadline and today; 0 when the project is not late. */
export function getDaysOverdue(
  project: { status: ProjectStatus; planned_deadline: string | null },
  now: Date = new Date()
): number {
  if (!isProjectOverdue(project, now) || !project.planned_deadline) return 0;
  const deadline = Date.parse(`${project.planned_deadline.slice(0, 10)}T00:00:00Z`);
  const today = Date.parse(`${now.toISOString().slice(0, 10)}T00:00:00Z`);
  return Math.round((today - deadline) / 86_400_000);
}

/**
 * Turns a stored website into a safe link target. Only http(s) links are produced: a bare "example.ba"
 * gets https://, and anything with another scheme (javascript:, data:...) yields null (shown as text).
 */
export function toSafeWebUrl(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return /^[a-z][a-z0-9+.-]*:/i.test(trimmed) ? null : `https://${trimmed}`;
}

/** True when a stored deadline (ISO datetime or YYYY-MM-DD) is before today. */
export function isPastDeadline(deadline: string | null | undefined, now: Date = new Date()): boolean {
  return Boolean(deadline) && deadline!.slice(0, 10) < now.toISOString().slice(0, 10);
}

/** Bosnian plural: 1 nedovršen zadatak, 2-4 nedovršena zadatka, 5+ (and 11-14) nedovršenih zadataka. */
export function openTasksLabel(count: number): string {
  const lastTwo = count % 100;
  const last = count % 10;
  if (last === 1 && lastTwo !== 11) return `${count} nedovršen zadatak`;
  if (last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14)) return `${count} nedovršena zadatka`;
  return `${count} nedovršenih zadataka`;
}
