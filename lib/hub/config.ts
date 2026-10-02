import { appwriteConfig } from '../appwrite/config';

/** Appwrite table ids for the Project Hub. All of them share the `hub_` prefix. */
export const HUB_TABLES = {
  projects: 'hub_projects',
  clients: 'hub_clients',
  tasks: 'hub_tasks',
  activities: 'hub_activities',
  comments: 'hub_comments',
  deliveries: 'hub_deliveries',
  adBudgets: 'hub_ad_budgets',
  teams: 'hub_teams',
  subscriptions: 'hub_subscriptions',
  counters: 'hub_counters',
} as const;

export const PROJECT_CODE_COUNTER_ID = 'project_code';
export const PROJECT_CODE_PREFIX = 'PRJ';

export function getHubDatabaseId(): string {
  return appwriteConfig.databaseId;
}
