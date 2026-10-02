// Client revisions: changes the client asks for after a project was delivered. They are ordinary tasks
// flagged as revisions, with the day they were requested and the time spent on them. Pure helpers only.

import { formatNumber } from './currency';

export const MAX_REVISION_MINUTES = 100_000;

export interface RevisionStats {
  count: number;
  minutes: number;
}

/** Counts the revisions among a project's tasks and adds up the time spent on them. */
export function revisionStats(
  tasks: readonly { is_revision: boolean | null; time_spent_minutes: number | null }[]
): RevisionStats {
  let count = 0;
  let minutes = 0;
  for (const task of tasks) {
    if (!task.is_revision) continue;
    count += 1;
    minutes += task.time_spent_minutes ?? 0;
  }
  return { count, minutes };
}

/** Hours typed in a form ("2.5") as whole minutes; null for an empty field, NaN for nonsense. */
export function hoursToMinutes(text: string): number | null {
  const trimmed = text.trim().replace(',', '.');
  if (trimmed === '') return null;
  const hours = Number(trimmed);
  return Number.isFinite(hours) && hours >= 0 ? Math.round(hours * 60) : NaN;
}

/** Minutes as the hours shown in an input ("150" -> "2.5"). */
export const minutesToHoursText = (minutes: number | null | undefined): string =>
  minutes === null || minutes === undefined ? '' : String(Math.round((minutes / 60) * 100) / 100);

/** "2,5 h". */
export const formatHours = (minutes: number): string => `${formatNumber(minutes / 60)} h`;

/** Bosnian plural: 1 izmjena, 2-4 izmjene, 5+ (and 11-14) izmjena. */
export function revisionsLabel(count: number): string {
  const lastTwo = count % 100;
  const last = count % 10;
  if (last === 1 && lastTwo !== 11) return `${count} izmjena`;
  if (last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14)) return `${count} izmjene`;
  return `${count} izmjena`;
}
