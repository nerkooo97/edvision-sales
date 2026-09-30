// Hub roles are stored as Appwrite user labels. Labels may only contain letters and digits,
// and the `hub` prefix keeps them apart from any labels the sales side may use.

export const HUB_ROLES = [
  'admin',
  'account_manager',
  'project_lead',
  'team_member',
  'finance',
  'viewer',
] as const;
export type HubRole = (typeof HUB_ROLES)[number];

export const ROLE_LABELS: Record<HubRole, string> = {
  admin: 'hubadmin',
  account_manager: 'hubaccountmanager',
  project_lead: 'hubprojectlead',
  team_member: 'hubteammember',
  finance: 'hubfinance',
  viewer: 'hubviewer',
};

const ALL_HUB_LABELS = new Set<string>(Object.values(ROLE_LABELS));

/** Returns the role of a user, or null when the user has no hub label (= no access to the Hub). */
export function getRoleFromLabels(labels: readonly string[] | undefined): HubRole | null {
  if (!labels) return null;
  // HUB_ROLES is ordered from most to least privileged, so a stray second label never escalates.
  return HUB_ROLES.find((role) => labels.includes(ROLE_LABELS[role])) ?? null;
}

/** Replaces the hub label in a label list and leaves every non-hub label untouched. */
export function withRoleLabel(labels: readonly string[], role: HubRole | null): string[] {
  const kept = labels.filter((label) => !ALL_HUB_LABELS.has(label));
  return role ? [...kept, ROLE_LABELS[role]] : kept;
}
