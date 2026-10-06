'use server';

import { hubErrors } from '../errors';
import {
  canCreateProject,
  canDeleteProject,
  canViewProjectMoney,
  PROJECT_MONEY_FIELDS,
  canSetProjectStatus,
  describeProjectPermissions,
  getEditableProjectFields,
} from '../permissions';
import {
  changeStatusSchema,
  createProjectSchema,
  idSchema,
  projectFiltersSchema,
  updateProjectSchema,
} from '../schemas';
import { loadProjectAccess } from '../server/access';
import { listActivities, logActivity } from '../server/activities';
import { hasAdBudget } from '../ad-budget';
import { projectForRole, projectsForRole } from '../money';
import { listAdBudgets } from '../server/ad-budgets';
import { applyContractTerms } from '../server/contract-terms';
import { listDeliveries } from '../server/deliveries';
import { resolveClientLink, withoutSaveClient } from '../server/client-link';
import { getPrimaryContact } from '../server/client-contacts';
import { getClient } from '../server/clients';
import { listComments } from '../server/comments';
import {
  createProject,
  deleteProject,
  listDeadlineAlerts,
  listProjects,
  setProjectStatus,
  updateProject,
} from '../server/projects';
import { requireHubUser } from '../server/session';
import { getTeamIdsOfUser } from '../server/teams';
import { listTasks } from '../server/tasks';
import { getMember } from '../server/users';
import { parseInput, runAction } from './run-action';

async function assertLeadIsHubMember(leadId: string) {
  const lead = await getMember(leadId);
  if (!lead?.role) throw hubErrors.validation('Odabrani voditelj nema pristup modulu za projekte.');
}

export async function listProjectsAction(filters: unknown = {}) {
  return runAction(async () => {
    const user = await requireHubUser();
    const parsed = parseInput(projectFiltersSchema, filters);
    const teamIds = parsed.participant_id ? await getTeamIdsOfUser(parsed.participant_id) : [];
    const list = await listProjects(parsed, teamIds);
    return { ...list, projects: projectsForRole(list.projects, user.role) };
  });
}

/** Everything the project detail screen needs in one round trip, plus what the caller may do on it. */
export async function getProjectDetailAction(projectId: unknown) {
  return runAction(async () => {
    const user = await requireHubUser();
    const id = parseInput(idSchema, projectId);
    const { project, isParticipant } = await loadProjectAccess(user, id);

    const [tasks, activities, comments, client, clientContact, deliveries, adBudgets] = await Promise.all([
      listTasks(id),
      listActivities(id),
      listComments(id),
      project.client_id ? getClient(project.client_id) : Promise.resolve(null),
      project.client_id ? getPrimaryContact(project.client_id) : Promise.resolve(null),
      project.weekly_quota ? listDeliveries(id) : Promise.resolve([]),
      // Also loaded when data exists, so a project that changed type never hides what was entered.
      listAdBudgets(id),
    ]);

    return {
      project: projectForRole(project, user.role),
      tasks,
      activities: activities.items,
      activitiesHaveMore: activities.hasMore,
      comments: comments.items,
      commentsHaveMore: comments.hasMore,
      client,
      clientContact,
      deliveries,
      adBudgets,
      showAdBudget: hasAdBudget(project.type) || adBudgets.length > 0,
      permissions: describeProjectPermissions(user.role, isParticipant),
    };
  });
}

export async function listDeadlineAlertsAction() {
  return runAction(async () => {
    const user = await requireHubUser();
    const alerts = await listDeadlineAlerts();
    return {
      overdue: projectsForRole(alerts.overdue, user.role),
      dueSoon: projectsForRole(alerts.dueSoon, user.role),
      renewalsSoon: projectsForRole(alerts.renewalsSoon, user.role),
    };
  });
}

export async function createProjectAction(input: unknown) {
  return runAction(async () => {
    const user = await requireHubUser();
    if (!canCreateProject(user.role)) throw hubErrors.forbidden('kreiranje projekata');

    const data = parseInput(createProjectSchema, input);
    const canSeeMoney = canViewProjectMoney(user.role);
    if (!canSeeMoney && (data.budget !== 0 || data.monthly_fee != null || data.extra_post_price != null)) {
      throw hubErrors.forbidden('unos vrijednosti projekta');
    }
    await assertLeadIsHubMember(data.lead_id);

    // Creating directly into a later stage follows the same rules as moving a project there.
    const isParticipant = data.lead_id === user.id || data.member_ids.includes(user.id);
    if (!canSetProjectStatus(user.role, data.status, isParticipant)) {
      throw hubErrors.forbidden('postavljanje ovog statusa');
    }

    const clientFields = await resolveClientLink(user, data);
    const contractFields = applyContractTerms(data, undefined, { feeRequired: canSeeMoney });
    const project = await createProject({ ...withoutSaveClient(data), ...clientFields, ...contractFields }, user.id);
    await logActivity({
      projectId: project.$id,
      userId: user.id,
      type: 'project_created',
      details: project.code,
    });
    return projectForRole(project, user.role);
  });
}

export async function updateProjectAction(projectId: unknown, input: unknown) {
  return runAction(async () => {
    const user = await requireHubUser();
    const id = parseInput(idSchema, projectId);
    const patch = parseInput(updateProjectSchema, input);
    const { project, isParticipant } = await loadProjectAccess(user, id);

    const changedFields = Object.keys(patch)
      .filter((key) => patch[key as keyof typeof patch] !== undefined)
      // save_client is part of choosing the client, so it needs the same right as client_id.
      .map((key) => (key === 'save_client' ? 'client_id' : key));
    if (changedFields.length === 0) return projectForRole(project, user.role);

    const editable = getEditableProjectFields(user.role, isParticipant);
    if (editable !== 'all' && !changedFields.every((field) => editable.includes(field))) {
      throw hubErrors.forbidden('izmjenu ovih podataka projekta');
    }
    const canSeeMoney = canViewProjectMoney(user.role);
    if (!canSeeMoney && changedFields.some((field) => (PROJECT_MONEY_FIELDS as readonly string[]).includes(field))) {
      throw hubErrors.forbidden('izmjenu vrijednosti projekta');
    }
    if (patch.lead_id && patch.lead_id !== project.lead_id) await assertLeadIsHubMember(patch.lead_id);

    const clientFields = await resolveClientLink(user, patch, project);
    const contractFields = applyContractTerms(patch, project, { feeRequired: canSeeMoney });
    const updated = await updateProject(id, { ...withoutSaveClient(patch), ...clientFields, ...contractFields });
    await logActivity({
      projectId: id,
      userId: user.id,
      type: 'project_updated',
      details: [...new Set(changedFields)].join(', '),
    });
    return projectForRole(updated, user.role);
  });
}

export async function changeProjectStatusAction(projectId: unknown, input: unknown) {
  return runAction(async () => {
    const user = await requireHubUser();
    const id = parseInput(idSchema, projectId);
    const { status } = parseInput(changeStatusSchema, input);
    const { project, isParticipant } = await loadProjectAccess(user, id);

    if (!canSetProjectStatus(user.role, status, isParticipant)) {
      throw hubErrors.forbidden('postavljanje ovog statusa');
    }
    if (project.status === status) return projectForRole(project, user.role);

    const updated = await setProjectStatus(project, status);
    await logActivity({
      projectId: id,
      userId: user.id,
      type: 'status_changed',
      details: `${project.status} -> ${status}`,
    });
    return projectForRole(updated, user.role);
  });
}

export async function deleteProjectAction(projectId: unknown) {
  return runAction(async () => {
    const user = await requireHubUser();
    if (!canDeleteProject(user.role)) throw hubErrors.forbidden('brisanje projekata');

    const id = parseInput(idSchema, projectId);
    const { project } = await loadProjectAccess(user, id);
    await deleteProject(project.$id);
    return { id: project.$id };
  });
}

/** Older entries of a project's history, after the oldest one already shown. */
export async function listOlderActivitiesAction(projectId: unknown, beforeId: unknown) {
  return runAction(async () => {
    const user = await requireHubUser();
    const id = parseInput(idSchema, projectId);
    await loadProjectAccess(user, id);
    return listActivities(id, parseInput(idSchema, beforeId));
  });
}
