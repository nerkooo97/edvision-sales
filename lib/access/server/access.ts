import { cache } from 'react';
import { redirect } from 'next/navigation';
import { getLoggedInUser } from '../../appwrite/server';
import { resolveAccess, type ResolvedAccess } from '../resolve';
import type { HubRole } from '../../hub/roles';
import {
  evaluateSalesAccess,
  visibleSalesAreas,
  type AccessLevel,
  type SalesArea,
} from '../sales-permissions';

/**
 * Sales roles are only enforced when this switch is on. While it is off (the default), Sales behaves exactly
 * as it did before roles existed, so the new code can be deployed without changing anything for the people
 * using it. Turn it on only after everyone who needs Sales has a role in the access matrix.
 */
export const isSalesEnforced = (): boolean => process.env.SALES_ROLES_ENFORCED === 'true';

export interface CurrentAccess extends ResolvedAccess {
  userId: string;
  name: string;
  email: string;
}

/** Access of the signed-in user, read from the labels that come with the session (no extra query). */
export const getCurrentAccess = cache(async (): Promise<CurrentAccess | null> => {
  const user = await getLoggedInUser();
  if (!user) return null;
  return { userId: user.$id, name: user.name || user.email, email: user.email, ...resolveAccess(user.labels) };
});

/**
 * Checks a Sales area for the current user. Returns a user-facing reason when access is denied, or null
 * when it is allowed. With the switch off it returns null at once, without even looking the user up.
 */
export async function checkSalesAccess(area: SalesArea, needed: AccessLevel): Promise<string | null> {
  const enforced = isSalesEnforced();
  if (!enforced) return null;

  const access = await getCurrentAccess();
  const decision = evaluateSalesAccess(
    { enforced, loggedIn: access !== null, role: access?.roles.sales ?? null },
    area,
    needed
  );
  return decision.allowed ? null : decision.reason;
}

/** For Sales pages: sends people who may not open the area somewhere useful instead of showing data. */
export async function requireSalesArea(area: SalesArea): Promise<void> {
  if ((await checkSalesAccess(area, 'view')) === null) return;

  const access = await getCurrentAccess();
  // Someone with Project Hub access but no Sales role lands in the Hub rather than on a dead end.
  redirect(!access ? '/' : access.roles.hub ? '/hub' : '/access-denied');
}

export interface SidebarAccess {
  hubRole: HubRole | null;
  /** Sales areas to show; null means all of them (roles are not enforced yet). */
  salesAreas: SalesArea[] | null;
  isOrgAdmin: boolean;
}

export async function getSidebarAccess(): Promise<SidebarAccess> {
  const access = await getCurrentAccess();
  return {
    hubRole: access?.roles.hub ?? null,
    salesAreas: isSalesEnforced() ? visibleSalesAreas(access?.roles.sales ?? null) : null,
    isOrgAdmin: access?.isOrgAdmin ?? false,
  };
}
