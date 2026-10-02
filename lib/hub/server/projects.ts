import { ID, Query } from 'node-appwrite';
import {
  DEADLINE_WARNING_DAYS,
  RENEWAL_WARNING_DAYS,
  STATUS_DATE_FIELD,
  UNFINISHED_STATUSES,
  type ProjectStatus,
} from '../constants';
import { HUB_TABLES } from '../config';
import type { CreateProjectInput, ProjectFilters, UpdateProjectInput } from '../schemas';
import type { DeadlineAlerts, HubProject, HubProjectSummary } from '../types';
import { nextProjectCode } from './counters';
import { getHubDb, isNotFound, toPlain } from './db';

const DEFAULT_LIST_LIMIT = 200;
const ALERT_LIMIT = 100;
const CASCADE_BATCH = 100;
const CASCADE_MAX_BATCHES = 100;

// Lists and Kanban never need the long text fields, so they are left out of the query.
const SUMMARY_COLUMNS = [
  '$id',
  '$createdAt',
  '$updatedAt',
  'code',
  'name',
  'client_name',
  'type',
  'budget',
  'status',
  'priority',
  'lead_id',
  'client_id',
  'member_ids',
  'team_ids',
  'contract_number',
  'offer_date',
  'agreement_date',
  'start_date',
  'planned_deadline',
  'completion_date',
  'invoice_date',
  'tasks_total',
  'tasks_done',
  'revisions_count',
  'revisions_minutes',
  'monthly_fee',
  'weekly_quota',
] as const;

const startOfTodayUtc = () => {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
};

export async function listProjects(
  filters: ProjectFilters,
  participantTeamIds: string[] = []
): Promise<{ projects: HubProjectSummary[]; total: number }> {
  const { tablesDB, databaseId } = await getHubDb();

  const queries = [
    Query.select([...SUMMARY_COLUMNS]),
    Query.orderDesc('$createdAt'),
    Query.limit(filters.limit ?? DEFAULT_LIST_LIMIT),
    Query.offset(filters.offset ?? 0),
  ];
  if (filters.status) queries.push(Query.equal('status', filters.status));
  if (filters.lead_id) queries.push(Query.equal('lead_id', filters.lead_id));
  if (filters.client_id) queries.push(Query.equal('client_id', filters.client_id));
  if (filters.participant_id) {
    const id = filters.participant_id;
    queries.push(
      Query.or([
        Query.equal('lead_id', id),
        Query.contains('member_ids', [id]),
        // Query.or needs at least two branches; an unused team id keeps the shape valid without teams.
        Query.contains('team_ids', participantTeamIds.length > 0 ? participantTeamIds : [id]),
      ])
    );
  }

  const { rows, total } = await tablesDB.listRows({ databaseId, tableId: HUB_TABLES.projects, queries });
  return { projects: toPlain<HubProjectSummary[]>(rows), total };
}

export async function getProject(projectId: string): Promise<HubProject | null> {
  const { tablesDB, databaseId } = await getHubDb();
  try {
    const row = await tablesDB.getRow({ databaseId, tableId: HUB_TABLES.projects, rowId: projectId });
    return toPlain<HubProject>(row);
  } catch (error) {
    if (isNotFound(error)) return null;
    throw error;
  }
}

export async function createProject(input: CreateProjectInput, createdBy: string): Promise<HubProject> {
  const { tablesDB, databaseId } = await getHubDb();
  const code = await nextProjectCode();
  const row = await tablesDB.createRow({
    databaseId,
    tableId: HUB_TABLES.projects,
    rowId: ID.unique(),
    data: { ...input, code, created_by: createdBy, tasks_total: 0, tasks_done: 0, revisions_count: 0, revisions_minutes: 0 },
  });
  return toPlain<HubProject>(row);
}

export async function updateProject(projectId: string, patch: UpdateProjectInput): Promise<HubProject> {
  const { tablesDB, databaseId } = await getHubDb();
  const row = await tablesDB.updateRow({
    databaseId,
    tableId: HUB_TABLES.projects,
    rowId: projectId,
    data: patch,
  });
  return toPlain<HubProject>(row);
}

/** Changes the status and stamps the matching lifecycle date the first time that status is reached. */
export async function setProjectStatus(project: HubProject, status: ProjectStatus): Promise<HubProject> {
  const { tablesDB, databaseId } = await getHubDb();
  const data: Record<string, unknown> = { status };

  const dateField = STATUS_DATE_FIELD[status];
  if (!project[dateField]) data[dateField] = startOfTodayUtc().toISOString();

  const row = await tablesDB.updateRow({
    databaseId,
    tableId: HUB_TABLES.projects,
    rowId: project.$id,
    data,
  });
  return toPlain<HubProject>(row);
}

/** Deletes a project together with everything that belongs to it, in bounded batches. */
export async function deleteProject(projectId: string): Promise<void> {
  const { tablesDB, databaseId } = await getHubDb();

  for (const tableId of [HUB_TABLES.tasks, HUB_TABLES.comments, HUB_TABLES.activities, HUB_TABLES.deliveries, HUB_TABLES.adBudgets]) {
    for (let batch = 0; batch < CASCADE_MAX_BATCHES; batch += 1) {
      const { rows } = await tablesDB.deleteRows({
        databaseId,
        tableId,
        queries: [Query.equal('project_id', projectId), Query.limit(CASCADE_BATCH)],
      });
      if (rows.length < CASCADE_BATCH) break;
    }
  }

  await tablesDB.deleteRow({ databaseId, tableId: HUB_TABLES.projects, rowId: projectId });
}

/** Overdue projects and those due within the warning window, ignoring projects whose work is finished. */
export async function listDeadlineAlerts(): Promise<DeadlineAlerts> {
  const { tablesDB, databaseId } = await getHubDb();
  const today = startOfTodayUtc();
  const windowEnd = new Date(today.getTime() + DEADLINE_WARNING_DAYS * 24 * 60 * 60 * 1000);
  const renewalEnd = new Date(today.getTime() + RENEWAL_WARNING_DAYS * 24 * 60 * 60 * 1000);

  const common = [
    Query.select([...SUMMARY_COLUMNS]),
    Query.equal('status', [...UNFINISHED_STATUSES]),
    Query.orderAsc('planned_deadline'),
    Query.limit(ALERT_LIMIT),
  ];

  const [overdue, dueSoon, renewals] = await Promise.all([
    tablesDB.listRows({
      databaseId,
      tableId: HUB_TABLES.projects,
      queries: [...common, Query.lessThan('planned_deadline', today.toISOString())],
    }),
    tablesDB.listRows({
      databaseId,
      tableId: HUB_TABLES.projects,
      queries: [
        ...common,
        Query.greaterThanEqual('planned_deadline', today.toISOString()),
        Query.lessThanEqual('planned_deadline', windowEnd.toISOString()),
      ],
    }),
    // Recurring contracts ending after the 7-day warning but within 30 days: time to talk about renewal.
    tablesDB.listRows({
      databaseId,
      tableId: HUB_TABLES.projects,
      queries: [
        ...common,
        Query.greaterThan('weekly_quota', 0),
        Query.greaterThan('planned_deadline', windowEnd.toISOString()),
        Query.lessThanEqual('planned_deadline', renewalEnd.toISOString()),
      ],
    }),
  ]);

  return {
    overdue: toPlain<HubProjectSummary[]>(overdue.rows),
    dueSoon: toPlain<HubProjectSummary[]>(dueSoon.rows),
    renewalsSoon: toPlain<HubProjectSummary[]>(renewals.rows),
  };
}

/** Keeps the denormalised task counters on the project in step with its tasks (one atomic write each). */
export async function adjustTaskCounters(
  projectId: string,
  delta: { total?: number; done?: number }
): Promise<void> {
  const { tablesDB, databaseId } = await getHubDb();
  const columns: Array<['tasks_total' | 'tasks_done', number]> = [
    ['tasks_total', delta.total ?? 0],
    ['tasks_done', delta.done ?? 0],
  ];

  try {
    for (const [column, value] of columns) {
      if (value === 0) continue;
      const params = { databaseId, tableId: HUB_TABLES.projects, rowId: projectId, column, value: Math.abs(value) };
      if (value > 0) await tablesDB.incrementRowColumn(params);
      else await tablesDB.decrementRowColumn({ ...params, min: 0 });
    }
  } catch (error) {
    console.error('Hub: task counter update failed, recounting', error);
    await recountTaskCounters(projectId);
  }
}

/** Self-healing fallback: recomputes both counters from the tasks table. */
export async function recountTaskCounters(projectId: string): Promise<void> {
  const { tablesDB, databaseId } = await getHubDb();
  const [all, done] = await Promise.all([
    tablesDB.listRows({
      databaseId,
      tableId: HUB_TABLES.tasks,
      queries: [Query.equal('project_id', projectId), Query.limit(1)],
    }),
    tablesDB.listRows({
      databaseId,
      tableId: HUB_TABLES.tasks,
      queries: [Query.equal('project_id', projectId), Query.equal('status', 'done'), Query.limit(1)],
    }),
  ]);
  await tablesDB.updateRow({
    databaseId,
    tableId: HUB_TABLES.projects,
    rowId: projectId,
    data: { tasks_total: all.total, tasks_done: done.total },
  });
}

/** When a team is deleted, its id is removed from every project so no stale reference is left behind. */
export async function removeTeamFromProjects(teamId: string): Promise<void> {
  const { tablesDB, databaseId } = await getHubDb();

  const { rows } = await tablesDB.listRows({
    databaseId,
    tableId: HUB_TABLES.projects,
    queries: [
      Query.select(['$id', 'team_ids']),
      Query.contains('team_ids', [teamId]),
      Query.limit(CASCADE_BATCH * 5),
    ],
  });

  for (const row of rows) {
    const remaining = (row.team_ids as string[]).filter((id) => id !== teamId);
    await tablesDB.updateRow({
      databaseId,
      tableId: HUB_TABLES.projects,
      rowId: row.$id,
      data: { team_ids: remaining },
    });
  }
}

/** Code and name for a set of project ids, so lists of tasks can say which project they belong to. */
export async function getProjectLabels(projectIds: string[]): Promise<Map<string, { code: string; name: string }>> {
  const unique = [...new Set(projectIds)];
  if (unique.length === 0) return new Map();

  const { tablesDB, databaseId } = await getHubDb();
  const { rows } = await tablesDB.listRows({
    databaseId,
    tableId: HUB_TABLES.projects,
    queries: [Query.select(['$id', 'code', 'name']), Query.equal('$id', unique), Query.limit(unique.length)],
  });
  return new Map(rows.map((row) => [row.$id, { code: String(row.code), name: String(row.name) }]));
}
