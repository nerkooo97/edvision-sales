// Access model: every user has one role per module (or none = no access to that module), and one
// "main administrator" has everything everywhere. Roles are stored as Appwrite user labels, one label
// per module, so they arrive with the session and need no extra database lookup.
//
// Adding a module later means adding one entry to MODULES (name, roles, labels, descriptions); the access
// matrix screen picks it up as a new column by itself.

import { HUB_ROLES, ROLE_LABELS as HUB_ROLE_LABELS } from '../hub/roles';
import { ROLE_DESCRIPTIONS as HUB_ROLE_DESCRIPTIONS, ROLE_DISPLAY_NAMES as HUB_ROLE_NAMES } from '../hub/labels';

/** The single account that manages access and can do everything in every module. */
export const ORG_ADMIN_LABEL = 'orgadmin';

export const SALES_ROLES = ['admin', 'manager', 'agent', 'viewer'] as const;
export type SalesRole = (typeof SALES_ROLES)[number];

export const SALES_ROLE_LABELS: Record<SalesRole, string> = {
  admin: 'salesadmin',
  manager: 'salesmanager',
  agent: 'salesagent',
  viewer: 'salesviewer',
};

export const SALES_ROLE_NAMES: Record<SalesRole, string> = {
  admin: 'Administrator',
  manager: 'Manager',
  agent: 'Agent',
  viewer: 'Posmatrač',
};

export const SALES_ROLE_DESCRIPTIONS: Record<SalesRole, string> = {
  admin: 'Sve u salesu, uključujući Automatizacije i Podešavanja te brisanje.',
  manager: 'Sve u salesu uz brisanje; Automatizacije samo pregled; bez Podešavanja.',
  agent: 'Uređuje firme, leadove, sastanke, pozive i dnevnik kontakata, ali ne briše; bez Izvještaja, Automatizacija i Podešavanja.',
  viewer: 'Samo pregled; bez Automatizacija i Podešavanja.',
};

export const MODULE_IDS = ['sales', 'hub'] as const;
export type ModuleId = (typeof MODULE_IDS)[number];

export interface ModuleDefinition {
  id: ModuleId;
  name: string;
  /** Ordered from the most to the least privileged role. */
  roles: readonly string[];
  /** Role -> Appwrite label. */
  labels: Record<string, string>;
  roleNames: Record<string, string>;
  roleDescriptions: Record<string, string>;
}

export const MODULES: Record<ModuleId, ModuleDefinition> = {
  sales: {
    id: 'sales',
    name: 'Sales',
    roles: SALES_ROLES,
    labels: SALES_ROLE_LABELS,
    roleNames: SALES_ROLE_NAMES,
    roleDescriptions: SALES_ROLE_DESCRIPTIONS,
  },
  // The Project Hub keeps its original `hub*` labels, so nobody who already has a role loses it.
  hub: {
    id: 'hub',
    name: 'Projekti',
    roles: HUB_ROLES,
    labels: HUB_ROLE_LABELS,
    roleNames: HUB_ROLE_NAMES,
    roleDescriptions: HUB_ROLE_DESCRIPTIONS,
  },
};

export const isModuleId = (value: string): value is ModuleId => (MODULE_IDS as readonly string[]).includes(value);

export const isRoleOf = (moduleId: ModuleId, role: string): boolean => MODULES[moduleId].roles.includes(role);
