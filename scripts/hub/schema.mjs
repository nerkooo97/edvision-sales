// Project Hub table definitions. Data only, no side effects.
// Every table id must start with TABLE_PREFIX so the runner can never touch sales tables.

export const TABLE_PREFIX = 'hub_';

const ID_SIZE = 36;

const str = (key, size, { required = false, array = false } = {}) => ({
  key,
  type: 'string',
  size,
  required,
  array,
});

const id = (key, opts) => str(key, ID_SIZE, opts);

const int = (key, { required = false, defaultValue = null, min = 0, max = 1_000_000 } = {}) => ({
  key,
  type: 'integer',
  required,
  min,
  max,
  default: required ? null : defaultValue,
});

const float = (key, { required = false, min = 0, max = 1_000_000_000 } = {}) => ({
  key,
  type: 'float',
  required,
  min,
  max,
});

const bool = (key, { defaultValue = true } = {}) => ({
  key,
  type: 'boolean',
  required: false,
  default: defaultValue,
});

const date = (key, { required = false } = {}) => ({ key, type: 'datetime', required });

const key = (name, columns) => ({ key: name, type: 'key', columns });
const unique = (name, columns) => ({ key: name, type: 'unique', columns });

export const HUB_TABLES = [
  {
    id: 'hub_projects',
    name: 'Hub projects',
    columns: [
      str('code', 20, { required: true }),
      str('name', 200, { required: true }),
      str('description', 5000),
      str('client_name', 300, { required: true }),
      str('client_contact', 200),
      str('client_email', 320),
      str('client_phone', 50),
      str('type', 40, { required: true }),
      float('budget', { required: true }),
      str('status', 30, { required: true }),
      str('priority', 20, { required: true }),
      id('lead_id', { required: true }),
      id('client_id'),
      id('member_ids', { array: true }),
      id('team_ids', { array: true }),
      str('contract_number', 100),
      str('contract_url', 2000),
      str('proposal_url', 2000),
      str('invoice_number', 100),
      date('offer_date'),
      date('agreement_date'),
      date('start_date'),
      date('planned_deadline'),
      date('completion_date'),
      date('invoice_date'),
      str('notes', 5000),
      int('tasks_total', { defaultValue: 0 }),
      int('tasks_done', { defaultValue: 0 }),
      // Recurring services (e.g. social media): all empty on an ordinary project.
      date('contract_start_date'),
      int('contract_months', { min: 1, max: 36 }),
      float('monthly_fee'),
      int('weekly_quota', { min: 1, max: 50 }),
      float('extra_post_price'),
      id('created_by', { required: true }),
    ],
    indexes: [
      unique('uq_code', ['code']),
      key('idx_status', ['status']),
      key('idx_planned_deadline', ['planned_deadline']),
      key('idx_lead_id', ['lead_id']),
      key('idx_client_id', ['client_id']),
      // No index on member_ids: this Appwrite version does not support indexes on array columns.
    ],
  },
  {
    id: 'hub_clients',
    name: 'Hub clients',
    columns: [
      str('name', 300, { required: true }),
      str('contact_person', 200),
      str('email', 320),
      str('phone', 50),
      str('address', 300),
      str('city', 100),
      str('tax_id', 50),
      str('website', 500),
      str('notes', 3000),
      bool('is_active'),
    ],
    // Small table read whole and searched in the browser; no index is needed until it grows large.
    indexes: [],
  },
  {
    id: 'hub_tasks',
    name: 'Hub tasks',
    columns: [
      id('project_id', { required: true }),
      str('title', 300, { required: true }),
      str('description', 3000),
      id('assignee_id', { required: true }),
      str('status', 20, { required: true }),
      str('priority', 20, { required: true }),
      date('deadline'),
      str('comment', 1000),
      id('created_by', { required: true }),
    ],
    indexes: [key('idx_project_id', ['project_id']), key('idx_assignee_id', ['assignee_id'])],
  },
  {
    id: 'hub_deliveries',
    name: 'Hub deliveries',
    // One row per project and contract week; the row id is `${projectId}_${week}`, so no unique index is needed.
    columns: [
      id('project_id', { required: true }),
      int('week', { required: true, min: 1, max: 200 }),
      int('delivered', { required: true, min: 0, max: 1000 }),
      id('updated_by', { required: true }),
    ],
    indexes: [key('idx_project_id', ['project_id'])],
  },
  {
    id: 'hub_ad_budgets',
    name: 'Hub ad budgets',
    // One row per project, month and platform; the row id is `${projectId}_${YYYYMM}_${platform}`.
    columns: [
      id('project_id', { required: true }),
      str('month', 7, { required: true }),
      str('platform', 20, { required: true }),
      float('planned', { required: true, max: 10_000_000 }),
      float('spent', { required: true, max: 10_000_000 }),
      id('updated_by', { required: true }),
    ],
    indexes: [key('idx_project_id', ['project_id']), key('idx_month', ['month'])],
  },
  {
    id: 'hub_activities',
    name: 'Hub activities',
    columns: [
      id('project_id', { required: true }),
      id('user_id', { required: true }),
      str('type', 40, { required: true }),
      str('details', 1000, { required: true }),
    ],
    indexes: [key('idx_project_id', ['project_id'])],
  },
  {
    id: 'hub_comments',
    name: 'Hub comments',
    columns: [
      id('project_id', { required: true }),
      id('author_id', { required: true }),
      str('text', 3000, { required: true }),
    ],
    indexes: [key('idx_project_id', ['project_id'])],
  },
  {
    id: 'hub_teams',
    name: 'Hub teams',
    columns: [
      str('name', 100, { required: true }),
      str('description', 500),
      id('member_ids', { array: true }),
    ],
    indexes: [],
  },
  {
    id: 'hub_counters',
    name: 'Hub counters',
    columns: [str('key', 50, { required: true }), int('value', { required: true, max: 2_000_000_000 })],
    indexes: [],
  },
];
