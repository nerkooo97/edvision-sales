// Pure permission rules, shared by the server (enforcement) and the UI (hiding controls).
// The server is the only place that actually enforces them; the UI must never be trusted.

import type { HubRole } from './roles';
import type { ProjectStatus } from './constants';

/** Roles allowed to move a project INTO a status. Admin is always allowed. */
export const STATUS_ROLES: Record<ProjectStatus, readonly HubRole[]> = {
  offer_sent: ['admin', 'account_manager'],
  agreed: ['admin', 'account_manager'],
  in_progress: ['admin', 'project_lead', 'team_member'],
  completed: ['admin', 'project_lead'],
  ready_to_invoice: ['admin', 'account_manager'],
  invoiced: ['admin', 'finance'],
};

/** These roles only act on projects they take part in (as lead, member or via a team). */
const PARTICIPANT_BOUND_ROLES: readonly HubRole[] = ['project_lead', 'team_member'];

export const INVOICE_FIELDS = ['invoice_number', 'invoice_date'] as const;

const isAdmin = (role: HubRole) => role === 'admin';

export function canCreateProject(role: HubRole): boolean {
  return role === 'admin' || role === 'account_manager' || role === 'project_lead';
}

export function canDeleteProject(role: HubRole): boolean {
  return isAdmin(role);
}

export function canSetProjectStatus(role: HubRole, status: ProjectStatus, isParticipant: boolean): boolean {
  if (!STATUS_ROLES[status].includes(role)) return false;
  return PARTICIPANT_BOUND_ROLES.includes(role) ? isParticipant : true;
}

/**
 * Which project fields a role may edit: everything, only the invoice fields, or nothing.
 * Status is changed through its own action and is not part of this.
 */
export function getEditableProjectFields(role: HubRole, isParticipant: boolean): 'all' | readonly string[] {
  if (role === 'admin' || role === 'account_manager') return 'all';
  if (role === 'project_lead' && isParticipant) return 'all';
  if (role === 'finance') return INVOICE_FIELDS;
  return [];
}

export function canCreateTask(role: HubRole, isParticipant: boolean): boolean {
  if (role === 'admin' || role === 'account_manager') return true;
  return PARTICIPANT_BOUND_ROLES.includes(role) && isParticipant;
}

export function canUpdateTask(role: HubRole, isParticipant: boolean, isAssignee: boolean): boolean {
  if (role === 'admin' || role === 'account_manager') return true;
  if (role === 'project_lead') return isParticipant;
  if (role === 'team_member') return isParticipant && isAssignee;
  return false;
}

/** A team member may only change the status and comment of a task, never reassign or retitle it. */
export const TEAM_MEMBER_TASK_FIELDS = ['status', 'comment', 'time_spent_minutes'] as const;

export function canDeleteTask(role: HubRole, isParticipant: boolean): boolean {
  if (role === 'admin' || role === 'account_manager') return true;
  return role === 'project_lead' && isParticipant;
}

/** Logging how many posts were delivered in a week: the people doing the work and those managing the client. */
export function canLogDeliveries(role: HubRole, isParticipant: boolean): boolean {
  if (role === 'admin' || role === 'account_manager') return true;
  return PARTICIPANT_BOUND_ROLES.includes(role) && isParticipant;
}

/** Entering the ad budget plan and the actual spend: the same people who log deliveries. */
export const canManageAdBudget = canLogDeliveries;

export function canComment(role: HubRole): boolean {
  return role !== 'viewer';
}

export function canDeleteComment(role: HubRole, isAuthor: boolean): boolean {
  return isAdmin(role) || (isAuthor && role !== 'viewer');
}

/**
 * Project money (value, monthly fee, price of an extra post, and everything computed from them) is for the
 * administrator only. The ad budget is the client's own money and is not covered by this rule.
 */
export const PROJECT_MONEY_FIELDS = ['budget', 'monthly_fee', 'extra_post_price'] as const;

export function canViewProjectMoney(role: HubRole): boolean {
  return isAdmin(role);
}

export interface ProjectPermissions {
  editableFields: 'all' | readonly string[];
  canViewMoney: boolean;
  allowedStatuses: readonly ProjectStatus[];
  canDelete: boolean;
  canCreateTask: boolean;
  canDeleteTask: boolean;
  canLogDeliveries: boolean;
  canManageAdBudget: boolean;
  canComment: boolean;
}

/** Everything the UI needs to know about what a user may do on one project, computed once on the server. */
export function describeProjectPermissions(role: HubRole, isParticipant: boolean): ProjectPermissions {
  return {
    editableFields: getEditableProjectFields(role, isParticipant),
    canViewMoney: canViewProjectMoney(role),
    allowedStatuses: (Object.keys(STATUS_ROLES) as ProjectStatus[]).filter((status) =>
      canSetProjectStatus(role, status, isParticipant)
    ),
    canDelete: canDeleteProject(role),
    canCreateTask: canCreateTask(role, isParticipant),
    canDeleteTask: canDeleteTask(role, isParticipant),
    canLogDeliveries: canLogDeliveries(role, isParticipant),
    canManageAdBudget: canManageAdBudget(role, isParticipant),
    canComment: canComment(role),
  };
}

/** Creating and editing saved clients; deleting is admin-only (see canDeleteClient). */
export function canManageClients(role: HubRole): boolean {
  return role === 'admin' || role === 'account_manager' || role === 'project_lead';
}

export function canDeleteClient(role: HubRole): boolean {
  return isAdmin(role);
}

export function canManageTeams(role: HubRole): boolean {
  return isAdmin(role);
}

/** Subscriptions are open to every Hub user: they may view, add, edit and delete them. */
export function canManageSubscriptions(_role: HubRole): boolean {
  return true;
}

/** Maintenance contracts are visible to every Hub user; the people who run clients may change them. */
export function canManageMaintenance(role: HubRole): boolean {
  return canManageClients(role);
}
