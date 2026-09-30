// Report numbers are computed from the lightweight project rows the list screens already load,
// so no extra database queries (or aggregate tables) are needed at this scale.

import {
  DEADLINE_WARNING_DAYS,
  FINISHED_STATUSES,
  PROJECT_STATUSES,
  PROJECT_TYPES,
  type ProjectStatus,
  type ProjectType,
} from './constants';
import { getDaysOverdue } from './format';
import type { HubProjectSummary } from './types';

export interface StatusRow {
  status: ProjectStatus;
  count: number;
  value: number;
  percent: number;
}

export interface TypeRow {
  type: ProjectType;
  count: number;
  value: number;
  percent: number;
}

export interface LeadRow {
  leadId: string;
  count: number;
  active: number;
  value: number;
}

export interface ClientRow {
  key: string;
  name: string;
  count: number;
  value: number;
}

export interface OverdueRow {
  project: HubProjectSummary;
  daysOverdue: number;
}

export interface ReportData {
  totalProjects: number;
  totalValue: number;
  invoiced: { count: number; value: number };
  readyToInvoice: { count: number; value: number };
  /** Agreed or in progress: money that is committed and being worked on. */
  inWork: { count: number; value: number };
  /** Recurring services that are still running: how many, and the monthly income they bring. */
  recurring: { count: number; monthlyValue: number };
  overdue: OverdueRow[];
  dueSoonCount: number;
  byStatus: StatusRow[];
  byType: TypeRow[];
  byLead: LeadRow[];
  topClients: ClientRow[];
}

const TOP_CLIENTS = 5;
const DAY_MS = 86_400_000;

const percentOf = (part: number, whole: number) => (whole > 0 ? (part / whole) * 100 : 0);

const sumBudget = (projects: HubProjectSummary[]) => projects.reduce((sum, project) => sum + project.budget, 0);

const summarize = (projects: HubProjectSummary[]) => ({ count: projects.length, value: sumBudget(projects) });

function isDueSoon(project: HubProjectSummary, now: Date): boolean {
  if (!project.planned_deadline || FINISHED_STATUSES.includes(project.status)) return false;
  const today = now.toISOString().slice(0, 10);
  const limit = new Date(now.getTime() + DEADLINE_WARNING_DAYS * DAY_MS).toISOString().slice(0, 10);
  const deadline = project.planned_deadline.slice(0, 10);
  return deadline >= today && deadline <= limit;
}

/** Linked projects group by client id; one-off clients group by their (case-insensitive) name. */
const clientKey = (project: HubProjectSummary) => project.client_id ?? `name:${project.client_name.trim().toLowerCase()}`;

export function buildReport(projects: HubProjectSummary[], now: Date = new Date()): ReportData {
  const totalValue = sumBudget(projects);

  const byStatus = PROJECT_STATUSES.map((status) => {
    const matching = projects.filter((project) => project.status === status);
    return { status, ...summarize(matching), percent: percentOf(sumBudget(matching), totalValue) };
  });

  const byType = PROJECT_TYPES.map((type) => {
    const matching = projects.filter((project) => project.type === type);
    return { type, ...summarize(matching), percent: percentOf(sumBudget(matching), totalValue) };
  })
    .filter((row) => row.count > 0)
    .sort((a, b) => b.value - a.value);

  const leads = new Map<string, LeadRow>();
  const clients = new Map<string, ClientRow>();
  for (const project of projects) {
    const lead = leads.get(project.lead_id) ?? { leadId: project.lead_id, count: 0, active: 0, value: 0 };
    lead.count += 1;
    lead.value += project.budget;
    if (!FINISHED_STATUSES.includes(project.status)) lead.active += 1;
    leads.set(project.lead_id, lead);

    const key = clientKey(project);
    const client = clients.get(key) ?? { key, name: project.client_name, count: 0, value: 0 };
    client.count += 1;
    client.value += project.budget;
    clients.set(key, client);
  }

  const running = projects.filter(
    (project) => project.weekly_quota && project.weekly_quota > 0 && !FINISHED_STATUSES.includes(project.status)
  );

  const overdue = projects
    .map((project) => ({ project, daysOverdue: getDaysOverdue(project, now) }))
    .filter((row) => row.daysOverdue > 0)
    .sort((a, b) => b.daysOverdue - a.daysOverdue);

  return {
    totalProjects: projects.length,
    totalValue,
    invoiced: summarize(projects.filter((project) => project.status === 'invoiced')),
    readyToInvoice: summarize(projects.filter((project) => project.status === 'ready_to_invoice')),
    inWork: summarize(projects.filter((project) => project.status === 'agreed' || project.status === 'in_progress')),
    recurring: {
      count: running.length,
      monthlyValue: running.reduce((sum, project) => sum + (project.monthly_fee ?? 0), 0),
    },
    overdue,
    dueSoonCount: projects.filter((project) => isDueSoon(project, now)).length,
    byStatus,
    byType,
    byLead: [...leads.values()].sort((a, b) => b.value - a.value),
    topClients: [...clients.values()].sort((a, b) => b.value - a.value).slice(0, TOP_CLIENTS),
  };
}
