// Turns Appwrite labels into roles and back. Pure functions, no I/O.

import type { HubRole } from '../hub/roles';
import { MODULES, MODULE_IDS, ORG_ADMIN_LABEL, type ModuleId, type SalesRole } from './modules';

export interface ResolvedAccess {
  isOrgAdmin: boolean;
  roles: { sales: SalesRole | null; hub: HubRole | null };
}

/** The role a user has in one module, or null. If a stray second label exists, the more privileged one wins. */
export function moduleRoleFromLabels(labels: readonly string[] | undefined, moduleId: ModuleId): string | null {
  if (!labels) return null;
  const definition = MODULES[moduleId];
  return definition.roles.find((role) => labels.includes(definition.labels[role])) ?? null;
}

/** Everything the app needs to know about what a user may enter. The main administrator is admin everywhere. */
export function resolveAccess(labels: readonly string[] | undefined): ResolvedAccess {
  if (labels?.includes(ORG_ADMIN_LABEL)) {
    return { isOrgAdmin: true, roles: { sales: 'admin', hub: 'admin' } };
  }
  return {
    isOrgAdmin: false,
    roles: {
      sales: moduleRoleFromLabels(labels, 'sales') as SalesRole | null,
      hub: moduleRoleFromLabels(labels, 'hub') as HubRole | null,
    },
  };
}

/** Sets (or removes, with null) a user's role in one module and leaves every other label untouched. */
export function withModuleRole(labels: readonly string[], moduleId: ModuleId, role: string | null): string[] {
  const definition = MODULES[moduleId];
  const moduleLabels = new Set(Object.values(definition.labels));
  const kept = labels.filter((label) => !moduleLabels.has(label));
  return role ? [...kept, definition.labels[role]] : kept;
}

/** Roles of a user for every module, straight from the labels (the main administrator is not expanded here). */
export function rolesFromLabels(labels: readonly string[] | undefined): Record<ModuleId, string | null> {
  return Object.fromEntries(MODULE_IDS.map((id) => [id, moduleRoleFromLabels(labels, id)])) as Record<
    ModuleId,
    string | null
  >;
}
