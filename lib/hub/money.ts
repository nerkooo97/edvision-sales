// Project money is visible to the administrator only (see canViewProjectMoney). Everything that leaves the
// server for another role goes through these helpers, so the amounts never reach their browser at all:
// hiding them on screen would not be protection, because the data would still be in the page.

import { canViewProjectMoney } from './permissions';
import type { HubRole } from './roles';

interface WithProjectMoney {
  budget: number;
  monthly_fee: number | null;
  extra_post_price?: number | null;
}

/** A copy of the project without its amounts: value 0, fee and extra-post price empty. */
export function withoutProjectMoney<T extends WithProjectMoney>(project: T): T {
  const copy = { ...project, budget: 0, monthly_fee: null };
  if ('extra_post_price' in project) copy.extra_post_price = null;
  return copy;
}

/** The project as the given role may see it. */
export function projectForRole<T extends WithProjectMoney>(project: T, role: HubRole): T {
  return canViewProjectMoney(role) ? project : withoutProjectMoney(project);
}

export function projectsForRole<T extends WithProjectMoney>(projects: T[], role: HubRole): T[] {
  return canViewProjectMoney(role) ? projects : projects.map(withoutProjectMoney);
}
