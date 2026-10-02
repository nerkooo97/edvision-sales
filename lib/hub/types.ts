import type {
  ActivityType,
  ProjectPriority,
  ProjectStatus,
  ProjectType,
  TaskStatus,
} from './constants';
import type { HubRole } from './roles';

interface RowMeta {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
}

export interface HubProject extends RowMeta {
  code: string;
  name: string;
  description: string | null;
  client_name: string;
  client_contact: string | null;
  client_email: string | null;
  client_phone: string | null;
  type: ProjectType;
  budget: number;
  status: ProjectStatus;
  priority: ProjectPriority;
  lead_id: string;
  /** Set when the project belongs to a saved client; then client_name is kept in sync with it. */
  client_id: string | null;
  member_ids: string[];
  team_ids: string[];
  contract_number: string | null;
  contract_url: string | null;
  proposal_url: string | null;
  invoice_number: string | null;
  offer_date: string | null;
  agreement_date: string | null;
  start_date: string | null;
  planned_deadline: string | null;
  completion_date: string | null;
  invoice_date: string | null;
  notes: string | null;
  tasks_total: number;
  tasks_done: number;
  /** Client revisions after delivery; null on projects older than the columns. */
  revisions_count: number | null;
  revisions_minutes: number | null;
  /** Recurring service (e.g. social media): contract start, term, fee and agreed posts per week. */
  contract_start_date: string | null;
  contract_months: number | null;
  monthly_fee: number | null;
  weekly_quota: number | null;
  /** Price of one post beyond the agreed number; used to work out what to invoice on top. */
  extra_post_price: number | null;
  created_by: string;
}

/** Lightweight project row for lists and Kanban (no description/notes/contact details). */
export type HubProjectSummary = Pick<
  HubProject,
  | keyof RowMeta
  | 'code'
  | 'name'
  | 'client_name'
  | 'type'
  | 'budget'
  | 'status'
  | 'priority'
  | 'lead_id'
  | 'client_id'
  | 'member_ids'
  | 'team_ids'
  | 'contract_number'
  | 'offer_date'
  | 'agreement_date'
  | 'start_date'
  | 'planned_deadline'
  | 'completion_date'
  | 'invoice_date'
  | 'tasks_total'
  | 'tasks_done'
  | 'revisions_count'
  | 'revisions_minutes'
  | 'monthly_fee'
  | 'weekly_quota'
>;

export interface HubClient extends RowMeta {
  name: string;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  tax_id: string | null;
  website: string | null;
  notes: string | null;
  is_active: boolean;
}

export interface HubTask extends RowMeta {
  project_id: string;
  title: string;
  description: string | null;
  assignee_id: string;
  status: TaskStatus;
  priority: ProjectPriority;
  deadline: string | null;
  comment: string | null;
  /** A change the client asked for after delivery; null on tasks older than the column. */
  is_revision: boolean | null;
  /** Day the client asked for the change (ISO datetime at UTC midnight). */
  requested_date: string | null;
  time_spent_minutes: number | null;
  created_by: string;
}

/**
 * `details` by type: status_changed = "<from> -> <to>" (status keys),
 * task_* = task title, everything else = short free text.
 */
export interface HubActivity extends RowMeta {
  project_id: string;
  user_id: string;
  type: ActivityType;
  details: string;
}

export interface HubComment extends RowMeta {
  project_id: string;
  author_id: string;
  text: string;
}

export interface HubTeam extends RowMeta {
  name: string;
  description: string | null;
  member_ids: string[];
}

/** A company subscription (tool, service...). */
export interface HubSubscription extends RowMeta {
  name: string;
  /** ISO datetime at UTC midnight (see toStoredDate). */
  payment_date: string;
  /** Id of the user the subscription is registered to. */
  holder_id: string;
  /** Amount in `currency`, not converted to KM. */
  price: number;
  /** EUR, USD or KM; rows created before the column existed read as KM. */
  currency: string | null;
}

/** The only user fields the Hub ever exposes to the client. */
export interface HubMember {
  id: string;
  name: string;
  email: string;
  role: HubRole | null;
}

export interface HubUser {
  id: string;
  name: string;
  email: string;
  role: HubRole;
}

export interface DeadlineAlerts {
  overdue: HubProjectSummary[];
  dueSoon: HubProjectSummary[];
  /** Recurring-service contracts that end within the next 30 days (beyond the 7-day warning). */
  renewalsSoon: HubProjectSummary[];
}

/** Ad budget of one month on one platform: what was planned and what was actually spent (client's own money). */
export interface HubAdBudget extends RowMeta {
  project_id: string;
  /** Calendar month, "YYYY-MM". */
  month: string;
  platform: 'meta' | 'google';
  planned: number;
  spent: number;
  updated_by: string;
}

/** Posts delivered in one week of a recurring contract (week numbers start at 1). */
export interface HubDelivery extends RowMeta {
  project_id: string;
  week: number;
  delivered: number;
  updated_by: string;
}
