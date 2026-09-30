'use server';

import { hubErrors } from '../errors';
import { canManageTeams } from '../permissions';
import { idSchema, teamSchema } from '../schemas';
import { removeTeamFromProjects } from '../server/projects';
import { requireHubUser } from '../server/session';
import { createTeam, deleteTeam, getTeam, listTeams, updateTeam } from '../server/teams';
import { parseInput, runAction } from './run-action';

async function requireTeamAdmin() {
  const user = await requireHubUser();
  if (!canManageTeams(user.role)) throw hubErrors.forbidden('upravljanje timovima');
  return user;
}

export async function listTeamsAction() {
  return runAction(async () => {
    await requireHubUser();
    return listTeams();
  });
}

export async function createTeamAction(input: unknown) {
  return runAction(async () => {
    await requireTeamAdmin();
    return createTeam(parseInput(teamSchema, input));
  });
}

export async function updateTeamAction(teamId: unknown, input: unknown) {
  return runAction(async () => {
    await requireTeamAdmin();
    const id = parseInput(idSchema, teamId);
    const data = parseInput(teamSchema, input);
    if (!(await getTeam(id))) throw hubErrors.notFound('Tim');
    return updateTeam(id, data);
  });
}

export async function deleteTeamAction(teamId: unknown) {
  return runAction(async () => {
    await requireTeamAdmin();
    const id = parseInput(idSchema, teamId);
    if (!(await getTeam(id))) throw hubErrors.notFound('Tim');
    await deleteTeam(id);
    await removeTeamFromProjects(id);
    return { id };
  });
}
