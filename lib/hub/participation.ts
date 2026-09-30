import type { HubTeam } from './types';

interface ParticipationFields {
  lead_id: string;
  member_ids: string[];
  team_ids: string[];
}

/** Ids of the teams a user belongs to, from an already loaded team list (no extra request). */
export function getUserTeamIds(teams: readonly HubTeam[], userId: string): string[] {
  return teams.filter((team) => team.member_ids.includes(userId)).map((team) => team.$id);
}

/**
 * Client-side mirror of the server's participation rule, used only to decide which controls to show.
 * The server repeats the check on every action, so this can never grant anything by itself.
 */
export function isParticipant(project: ParticipationFields, userId: string, userTeamIds: readonly string[]): boolean {
  return (
    project.lead_id === userId ||
    project.member_ids.includes(userId) ||
    project.team_ids.some((teamId) => userTeamIds.includes(teamId))
  );
}
