'use server';

import { monthOf, summarizeAdMonth, type AdPlatform } from '../ad-budget';
import { addDaysUtc, todayUtc } from '../dates';
import { EXPIRING_SOON_DAYS } from '../maintenance';
import { getClientNames } from '../server/clients';
import { listMaintenanceEndingBetween } from '../server/maintenance-contracts';
import { projectsForRole } from '../money';
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

export interface ExpiringMaintenance {
  id: string;
  client_name: string;
  domain: string | null;
  end_date: string;
}

export interface Notifications extends DeadlineAlerts {
  /** Website maintenance contracts ending within EXPIRING_SOON_DAYS, soonest first. */
  maintenanceExpiring: ExpiringMaintenance[];
  /** Projects whose ad spend this month went over the plan on at least one platform. */
  adOverspend: AdOverspend[];
  /** Unfinished tasks assigned to the current user, soonest deadline first. */
  myTasks: NotificationTask[];
}

/** Everything the notification bell shows, in one round trip. */
export async function getNotificationsAction() {
  return runAction(async (): Promise<Notifications> => {
    const user = await requireHubUser();

    const today = todayUtc();
    const [alerts, tasks, adRows, expiring] = await Promise.all([
      listDeadlineAlerts(),
      listOpenTasksForAssignee(user.id),
      listAdBudgetsForMonth(monthOf(today)),
      listMaintenanceEndingBetween(today, addDaysUtc(today, EXPIRING_SOON_DAYS)),
    ]);
    const clientNames = expiring.length ? await getClientNames(expiring.map((contract) => contract.client_id)) : new Map();
    const overspent = summarizeAdMonth(adRows).filter((month) => month.overspentPlatforms.length > 0);
    const labels = await getProjectLabels([...tasks.map((task) => task.project_id), ...overspent.map((month) => month.projectId)]);

    return {
      overdue: projectsForRole(alerts.overdue, user.role),
      dueSoon: projectsForRole(alerts.dueSoon, user.role),
      renewalsSoon: projectsForRole(alerts.renewalsSoon, user.role),
      maintenanceExpiring: expiring.map((contract) => ({
        id: contract.$id,
        client_name: clientNames.get(contract.client_id) ?? 'Nepoznat klijent',
        domain: contract.domain,
        end_date: contract.end_date,
      })),
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
