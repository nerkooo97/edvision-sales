// Project Hub table definitions. Data only, no side effects.
// Every table id must start with TABLE_PREFIX so the runner can never touch sales tables.

export const TABLE_PREFIX = 'hub_';

const ID_SIZE = 36;

const str = (key, size, { required = false, array = false, defaultValue = null } = {}) => ({  key,  type: 'string',  size,  required,  array,  default: required ? null : defaultValue,});

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
      // Client revisions after delivery: how many and how many minutes they took (kept in step with the tasks).
      int('revisions_count', { defaultValue: 0 }),
      int('revisions_minutes', { defaultValue: 0, max: 100_000_000 }),
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
      key('idx_client_id', ['client_id']),
      // No index on member_ids: this Appwrite version does not support indexes on array columns.
    ],
  },
  {
    id: 'hub_clients',
    name: 'Hub clients',
    columns: [
      str('name', 300, { required: true }),
      // Name lowercased, without accents and repeated spaces: the duplicate check reads one indexed row
      // instead of the whole table, and the unique index stops two clients with the same name.
      str('name_key', 300, { required: true }),
      str('email', 320),
      str('phone', 50),
      str('address', 300),
      str('postal_code', 20),
      str('city', 100),
      str('region', 100),
      str('country', 2, { defaultValue: 'BA' }),
      // ID broj (JIB), a person's JMBG, or a foreign tax number.
      str('tax_id', 50),
      bool('vat_registered', { defaultValue: false }),
      str('website', 500),
      str('notes', 3000),
      bool('is_active'),
    ],
    // Lists are read whole (a few hundred rows, only the needed columns) and searched in the browser.
    indexes: [unique('uq_name_key', ['name_key'])],
  },
  {
    id: 'hub_client_contacts',
    name: 'Hub client contacts',
    columns: [
      id('client_id', { required: true }),
      str('first_name', 100, { required: true }),
      str('last_name', 100),
      str('email', 320),
      str('phone', 50),
      str('position', 150),
      bool('is_primary', { defaultValue: false }),
      bool('is_active'),
    ],
    // Always read per client (detail screen, project overview, contract generator).
    indexes: [key('idx_client_id', ['client_id'])],
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
      // A task created because the client asked for a change after delivery.
      bool('is_revision', { defaultValue: false }),
      date('requested_date'),
      int('time_spent_minutes', { max: 100_000 }),
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
    id: 'hub_subscriptions',
    name: 'Hub subscriptions',
    columns: [
      str('name', 200, { required: true }),
      date('payment_date', { required: true }),
      id('holder_id', { required: true }),
      float('price', { required: true, max: 10_000_000 }),
      // Price is kept in its own currency (USD/EUR/KM); the default keeps rows entered before this column in KM.
      str('currency', 3, { defaultValue: 'KM' }),
    ],
    // A company has a few dozen subscriptions at most: read whole, sorted and searched in the browser.
    indexes: [],
  },
  {
    id: 'hub_marketing_contracts',
    name: 'Hub marketing contracts',
    columns: [
      id('client_id', { required: true }),
      str('category', 30, { required: true }),
      str('service', 200, { required: true }),
      str('contract_status', 20, { required: true }),
      date('contract_start'),
      date('contract_end'),
      // The list is always read for one calendar year; months is a 12-bit mask (bit 0 = January).
      int('year', { required: true, min: 2000, max: 2100 }),
      int('months', { required: true, min: 0, max: 4095 }),
    ],
    // idx_client_id: "does this client have contracts?" before a client is deleted.
    indexes: [key('idx_year', ['year']), key('idx_client_id', ['client_id'])],
  },
  {
    id: 'hub_maintenance_contracts',
    name: 'Hub maintenance contracts',
    columns: [
      id('client_id', { required: true }),
      str('domain', 300),
      str('service', 200, { required: true }),
      date('start_date', { required: true }),
      date('end_date', { required: true }),
    ],
    // The list is read whole (a few hundred rows at most); idx_client_id answers "does this client have
    // contracts?" before a client is deleted; idx_end_date finds contracts about to expire for the
    // notification bell, which runs on every Hub page.
    indexes: [key('idx_client_id', ['client_id']), key('idx_end_date', ['end_date'])],
  },
  {
    id: 'hub_generated_contracts',
    name: 'Hub generated contracts',
    // What the contract generator produced. The PDF itself is never stored: it is made again from
    // contract_values (the form as filled in, including the client's data on that day) when downloaded.
    columns: [
      id('client_id', { required: true }),
      str('template', 30, { required: true }),
      str('contract_number', 30, { required: true }),
      date('concluded_date', { required: true }),
      date('start_date', { required: true }),
      date('end_date', { required: true }),
      str('contract_values', 10000, { required: true }),
      id('created_by', { required: true }),
    ],
    // idx_client_id: a client's contracts (client page, delete guard); uq_contract_number: no two
    // contracts with the same number, enforced by the database.
    indexes: [key('idx_client_id', ['client_id']), unique('uq_contract_number', ['contract_number'])],
  },
  {
    id: 'hub_counters',
    name: 'Hub counters',
    columns: [str('key', 50, { required: true }), int('value', { required: true, max: 2_000_000_000 })],
    indexes: [],
  },
];
