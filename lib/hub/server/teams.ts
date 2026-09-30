import { ID, Query } from 'node-appwrite';
import { HUB_TABLES } from '../config';
import type { TeamInput } from '../schemas';
import type { HubTeam } from '../types';
import { getHubDb, isNotFound, toPlain } from './db';

// Teams are few (a company, not a platform), so the whole table is read in one bounded query.
const MAX_TEAMS = 200;

export async function listTeams(): Promise<HubTeam[]> {
  const { tablesDB, databaseId } = await getHubDb();
  const { rows } = await tablesDB.listRows({
    databaseId,
    tableId: HUB_TABLES.teams,
    queries: [Query.orderAsc('name'), Query.limit(MAX_TEAMS)],
  });
  return toPlain<HubTeam[]>(rows);
}

export async function getTeam(teamId: string): Promise<HubTeam | null> {
  const { tablesDB, databaseId } = await getHubDb();
  try {
    const row = await tablesDB.getRow({ databaseId, tableId: HUB_TABLES.teams, rowId: teamId });
    return toPlain<HubTeam>(row);
  } catch (error) {
    if (isNotFound(error)) return null;
    throw error;
  }
}

/** Teams that a project is assigned to; ids of deleted teams are simply skipped. */
export async function getTeamsByIds(teamIds: string[]): Promise<HubTeam[]> {
  if (teamIds.length === 0) return [];
  const { tablesDB, databaseId } = await getHubDb();
  const { rows } = await tablesDB.listRows({
    databaseId,
    tableId: HUB_TABLES.teams,
    queries: [Query.equal('$id', teamIds), Query.limit(teamIds.length)],
  });
  return toPlain<HubTeam[]>(rows);
}

/** Ids of the teams a user belongs to. Used to find the projects a user takes part in. */
export async function getTeamIdsOfUser(userId: string): Promise<string[]> {
  const teams = await listTeams();
  return teams.filter((team) => team.member_ids.includes(userId)).map((team) => team.$id);
}

export async function createTeam(data: TeamInput): Promise<HubTeam> {
  const { tablesDB, databaseId } = await getHubDb();
  const row = await tablesDB.createRow({
    databaseId,
    tableId: HUB_TABLES.teams,
    rowId: ID.unique(),
    data,
  });
  return toPlain<HubTeam>(row);
}

export async function updateTeam(teamId: string, data: Partial<TeamInput>): Promise<HubTeam> {
  const { tablesDB, databaseId } = await getHubDb();
  const row = await tablesDB.updateRow({ databaseId, tableId: HUB_TABLES.teams, rowId: teamId, data });
  return toPlain<HubTeam>(row);
}

export async function deleteTeam(teamId: string): Promise<void> {
  const { tablesDB, databaseId } = await getHubDb();
  await tablesDB.deleteRow({ databaseId, tableId: HUB_TABLES.teams, rowId: teamId });
}
