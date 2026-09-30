'use server';

import { monthOf, summarizeAdMonth, type AdPlatform } from '../ad-budget';
import { todayUtc } from '../dates';
import { listAdBudgetsForMonth } from '../server/ad-budgets';
import { listDeadlineAlerts, getProjectLabels } from '../server/projects';
import { requireHubUser } from '../server/session';
import { listOpenTasksForAssignee } from '../server/tasks';
import type { DeadlineAlerts, HubTask } from '../types';
import { runAction } from './run-action';

export interface NotificationTask extends HubTask {
  project_code: string;
  project_name: string;
}

export interface AdOverspend {
  project_id: string;
  project_code: string;
  project_name: string;
  platforms: AdPlatform[];
}

export interface Notifications extends DeadlineAlerts {
  /** Projects whose ad spend this month went over the plan on at least one platform. */
  adOverspend: AdOverspend[];
  /** Unfinished tasks assigned to the current user, soonest deadline first. */
  myTasks: NotificationTask[];
}

/** Everything the notification bell shows, in one round trip. */
export async function getNotificationsAction() {
  return runAction(async (): Promise<Notifications> => {
    const user = await requireHubUser();

    const [alerts, tasks, adRows] = await Promise.all([
      listDeadlineAlerts(),
      listOpenTasksForAssignee(user.id),
      listAdBudgetsForMonth(monthOf(todayUtc())),
    ]);
    const overspent = summarizeAdMonth(adRows).filter((month) => month.overspentPlatforms.length > 0);
    const labels = await getProjectLabels([...tasks.map((task) => task.project_id), ...overspent.map((month) => month.projectId)]);

    return {
      ...alerts,
      adOverspend: overspent.map((month) => ({
        project_id: month.projectId,
        project_code: labels.get(month.projectId)?.code ?? '',
        project_name: labels.get(month.projectId)?.name ?? 'Nepoznat projekat',
        platforms: month.overspentPlatforms,
      })),
      myTasks: tasks.map((task) => ({
        ...task,
        project_code: labels.get(task.project_id)?.code ?? '',
        project_name: labels.get(task.project_id)?.name ?? 'Nepoznat projekat',
      })),
    };
  });
}
