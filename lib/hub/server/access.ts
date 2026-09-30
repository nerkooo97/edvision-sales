import { hubErrors } from '../errors';
import type { HubProject, HubUser } from '../types';
import { getProject } from './projects';
import { getTeamsByIds } from './teams';

/** True when the user is the lead, a listed member, or belongs to a team assigned to the project. */
export async function isProjectParticipant(user: HubUser, project: HubProject): Promise<boolean> {
  if (project.lead_id === user.id || project.member_ids.includes(user.id)) return true;
  if (project.team_ids.length === 0) return false;

  const teams = await getTeamsByIds(project.team_ids);
  return teams.some((team) => team.member_ids.includes(user.id));
}

/** Loads a project (or throws not_found) together with the caller's relationship to it. */
export async function loadProjectAccess(user: HubUser, projectId: string) {
  const project = await getProject(projectId);
  if (!project) throw hubErrors.notFound('Projekat');
  return { project, isParticipant: await isProjectParticipant(user, project) };
}
