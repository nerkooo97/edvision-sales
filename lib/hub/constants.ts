// Enumerations stored in the database. Keys are English; Bosnian labels live in the UI layer.

export const PROJECT_STATUSES = [
  'offer_sent',
  'agreed',
  'in_progress',
  'completed',
  'ready_to_invoice',
  'invoiced',
] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

/** Statuses in which the work is done, so a passed deadline is no longer a delay. */
export const FINISHED_STATUSES: readonly ProjectStatus[] = ['completed', 'ready_to_invoice', 'invoiced'];

/** Complement of FINISHED_STATUSES; queried with "equal" because this Appwrite rejects multi-value "notEqual". */
export const UNFINISHED_STATUSES: readonly ProjectStatus[] = PROJECT_STATUSES.filter(
  (status) => !FINISHED_STATUSES.includes(status)
);

export const PROJECT_PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;
export type ProjectPriority = (typeof PROJECT_PRIORITIES)[number];

export const PROJECT_TYPES = [
  'website',
  'application',
  'marketing_campaign',
  'hosting',
  'graphic_design',
  'maintenance',
  'google_ads',
  'seo',
  'social_media',
  'other',
] as const;
export type ProjectType = (typeof PROJECT_TYPES)[number];

export const TASK_STATUSES = ['todo', 'in_progress', 'done'] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const ACTIVITY_TYPES = [
  'project_created',
  'project_updated',
  'status_changed',
  'task_created',
  'task_updated',
  'task_deleted',
  'comment_added',
  'delivery_logged',
  'ad_budget_updated',
] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export type ProjectDateField =
  | 'offer_date'
  | 'agreement_date'
  | 'start_date'
  | 'planned_deadline'
  | 'completion_date'
  | 'invoice_date';

/** Date that is stamped automatically the first time a project enters a status. */
export const STATUS_DATE_FIELD: Record<ProjectStatus, ProjectDateField> = {
  offer_sent: 'offer_date',
  agreed: 'agreement_date',
  in_progress: 'start_date',
  completed: 'completion_date',
  ready_to_invoice: 'completion_date',
  invoiced: 'invoice_date',
};

/** Maximum number of days ahead that counts as "deadline approaching". */
export const DEADLINE_WARNING_DAYS = 7;

/** How far ahead a recurring contract that is about to end is flagged, so it can be renewed in time. */
export const RENEWAL_WARNING_DAYS = 30;
