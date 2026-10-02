// What each Sales role may do in each area of the Sales module. Pure functions, no I/O.

import type { SalesRole } from './modules';

export const SALES_AREAS = [
  'dashboard',
  'companies',
  'leads',
  'meetings',
  'emails',
  'calls',
  'contact-logs',
  'automations',
  'reports',
  'settings',
  'help',
] as const;
export type SalesArea = (typeof SALES_AREAS)[number];

/** none < view (read) < edit (create and change) < full (also delete / manage). */
export type AccessLevel = 'none' | 'view' | 'edit' | 'full';

const RANK: Record<AccessLevel, number> = { none: 0, view: 1, edit: 2, full: 3 };

export const levelAllows = (have: AccessLevel, needed: AccessLevel): boolean => RANK[have] >= RANK[needed];

type Row = Record<SalesRole, AccessLevel>;
const row = (admin: AccessLevel, manager: AccessLevel, agent: AccessLevel, viewer: AccessLevel): Row => ({
  admin,
  manager,
  agent,
  viewer,
});

/** The agreed matrix. Read-only areas use "view" for everyone who may see them. */
export const SALES_MATRIX: Record<SalesArea, Row> = {
  dashboard: row('view', 'view', 'view', 'view'),
  companies: row('full', 'full', 'edit', 'view'),
  leads: row('full', 'full', 'edit', 'view'),
  meetings: row('full', 'full', 'edit', 'view'),
  emails: row('view', 'view', 'view', 'view'),
  calls: row('full', 'full', 'edit', 'view'),
  'contact-logs': row('full', 'full', 'edit', 'view'),
  automations: row('full', 'view', 'none', 'none'),
  reports: row('view', 'view', 'none', 'view'),
  settings: row('full', 'none', 'none', 'none'),
  help: row('view', 'view', 'view', 'view'),
};

export function getSalesLevel(role: SalesRole | null, area: SalesArea): AccessLevel {
  return role ? SALES_MATRIX[area][role] : 'none';
}

/** Areas a role may open at all; used to build the sidebar. */
export function visibleSalesAreas(role: SalesRole | null): SalesArea[] {
  return SALES_AREAS.filter((area) => getSalesLevel(role, area) !== 'none');
}

export interface SalesAccessContext {
  /** Whether Sales roles are switched on. Off means Sales behaves exactly as before (open to everyone). */
  enforced: boolean;
  loggedIn: boolean;
  role: SalesRole | null;
}

/** The single decision used by pages and server functions. Returns a user-facing reason when denied. */
export function evaluateSalesAccess(
  context: SalesAccessContext,
  area: SalesArea,
  needed: AccessLevel
): { allowed: true } | { allowed: false; reason: string } {
  if (!context.enforced) return { allowed: true };
  if (!context.loggedIn) return { allowed: false, reason: 'Morate se prijaviti.' };
  if (!levelAllows(getSalesLevel(context.role, area), needed)) {
    return { allowed: false, reason: 'Nemate dozvolu za ovu radnju.' };
  }
  return { allowed: true };
}
