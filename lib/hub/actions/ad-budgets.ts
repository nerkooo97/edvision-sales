'use server';

import { getAdPlatforms, hasAdBudget, monthLabel, monthOf } from '../ad-budget';
import { todayUtc } from '../dates';
import { hubErrors } from '../errors';
import { canManageAdBudget } from '../permissions';
import { adBudgetSchema, idSchema } from '../schemas';
import { loadProjectAccess } from '../server/access';
import { logActivity } from '../server/activities';
import { listAdBudgets, listAdBudgetsForMonth, setAdBudget } from '../server/ad-budgets';
import { requireHubUser } from '../server/session';
import { parseInput, runAction } from './run-action';

const PLATFORM_NAMES = { meta: 'Meta', google: 'Google Ads' } as const;

/** Every project's ad plan and spend for the current month (feeds the report). */
export async function getCurrentMonthAdBudgetsAction() {
  return runAction(async () => {
    await requireHubUser();
    const month = monthOf(todayUtc());
    return { month, rows: await listAdBudgetsForMonth(month) };
  });
}

/** Saves the planned and the actual ad spend of one month on one platform. */
export async function setAdBudgetAction(projectId: unknown, input: unknown) {
  return runAction(async () => {
    const user = await requireHubUser();
    const id = parseInput(idSchema, projectId);
    const data = parseInput(adBudgetSchema, input);
    const { project, isParticipant } = await loadProjectAccess(user, id);

    if (!canManageAdBudget(user.role, isParticipant)) throw hubErrors.forbidden('unos oglasnog budžeta');
    if (!hasAdBudget(project.type)) {
      throw hubErrors.validation('Oglasni budžet se vodi na projektima društvenih mreža, Google Ads i marketing kampanja.');
    }

    const existing = await listAdBudgets(id);
    const allowed = getAdPlatforms(project.type, existing.map((row) => row.platform));
    if (!allowed.includes(data.platform)) {
      throw hubErrors.validation(`${PLATFORM_NAMES[data.platform]} se ne koristi za ovaj tip projekta.`);
    }

    const saved = await setAdBudget(id, data, user.id);
    await logActivity({
      projectId: id,
      userId: user.id,
      type: 'ad_budget_updated',
      details: `${monthLabel(data.month)}, ${PLATFORM_NAMES[data.platform]}: plan ${data.planned} KM, potrošeno ${data.spent} KM`,
    });
    return saved;
  });
}
