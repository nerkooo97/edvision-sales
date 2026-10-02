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

