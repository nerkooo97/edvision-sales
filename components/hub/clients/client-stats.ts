import { FINISHED_STATUSES } from "@/lib/hub/constants"
import type { HubClient, HubProjectSummary } from "@/lib/hub/types"

export interface ClientStats {
  count: number
  /** Projects whose work is not finished yet. */
  active: number
  value: number
  /** Creation time of the client's newest project (ISO), for "last project". */
  lastProjectAt: string | null
}

export interface ClientsOverview {
  totalClients: number
  activeClients: number
  clientsWithActiveProjects: number
  totalValue: number
  topClient: { name: string; value: number } | null
}

/** Groups the project list by client once, so the table and the summary cards share the same numbers. */
export function buildClientStats(projects: HubProjectSummary[]): Map<string, ClientStats> {
  const stats = new Map<string, ClientStats>()

  for (const project of projects) {
    if (!project.client_id) continue
    const current = stats.get(project.client_id) ?? { count: 0, active: 0, value: 0, lastProjectAt: null }
    stats.set(project.client_id, {
      count: current.count + 1,
      active: current.active + (FINISHED_STATUSES.includes(project.status) ? 0 : 1),
      value: current.value + project.budget,
      lastProjectAt:
        current.lastProjectAt && current.lastProjectAt > project.$createdAt ? current.lastProjectAt : project.$createdAt,
    })
  }
  return stats
}

export function buildClientsOverview(clients: Pick<HubClient, "$id" | "name" | "is_active">[], stats: Map<string, ClientStats>): ClientsOverview {
  let topClient: ClientsOverview["topClient"] = null
  let clientsWithActiveProjects = 0
  let totalValue = 0

  for (const client of clients) {
    const clientStats = stats.get(client.$id)
    if (!clientStats) continue
    totalValue += clientStats.value
    if (clientStats.active > 0) clientsWithActiveProjects += 1
    if (!topClient || clientStats.value > topClient.value) topClient = { name: client.name, value: clientStats.value }
  }

  return {
    totalClients: clients.length,
    activeClients: clients.filter((client) => client.is_active).length,
    clientsWithActiveProjects,
    totalValue,
    topClient,
  }
}
