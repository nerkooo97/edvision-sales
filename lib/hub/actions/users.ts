'use server';

import { requireHubUser } from '../server/session';
import { listHubMembers } from '../server/users';
import { runAction } from './run-action';

/** The signed-in user with their Hub role, for showing role-aware UI. */
export async function getCurrentHubUserAction() {
  return runAction(() => requireHubUser());
}

/** People who can use the Hub; feeds the lead, member and assignee pickers. */
export async function listHubMembersAction() {
  return runAction(async () => {
    await requireHubUser();
    return listHubMembers();
  });
}
