import type { ProjectPermissions } from "@/lib/hub/permissions"
import type { HubActivity, HubAdBudget, HubClient, HubComment, HubDelivery, HubProject, HubTask } from "@/lib/hub/types"

/** What getProjectDetailAction returns, as consumed by the detail screen and its tabs. */
export interface ProjectDetailData {
  project: HubProject
  tasks: HubTask[]
  activities: HubActivity[]
  comments: HubComment[]
  /** The saved client this project is linked to (live data), or null for a one-off client. */
  client: HubClient | null
  /** Posts delivered per week; empty unless the project is a recurring service. */
  deliveries: HubDelivery[]
  /** Ad budget plan and spend per month and platform (client's own money spent on Meta / Google Ads). */
  adBudgets: HubAdBudget[]
  /** Whether this project shows the ad budget tab. */
  showAdBudget: boolean
  permissions: ProjectPermissions
}

/** Resolves a user id to a display name; unknown ids (removed users) get a neutral fallback. */
export type NameResolver = (userId: string) => string
