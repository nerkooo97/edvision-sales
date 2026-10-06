import type { Metadata } from "next"
import { HubPageHeader } from "@/components/hub/hub-page-header"
import { KanbanBoard } from "@/components/hub/kanban/kanban-board"
import { listProjectsAction } from "@/lib/hub/actions/projects"
import { unwrapResult } from "@/lib/hub/actions/run-action"
import { listClientOptionsAction } from "@/lib/hub/actions/clients"
import { listTeamsAction } from "@/lib/hub/actions/teams"
import { listHubMembersAction } from "@/lib/hub/actions/users"
import { requireHubPageUser } from "@/lib/hub/server/session"

export const metadata: Metadata = {
  title: "Kanban | Edvision Hub",
  description: "Projekti po fazama",
}

const PROJECT_LIST_LIMIT = 500

export default async function KanbanPage() {
  const user = await requireHubPageUser()

  const [projectList, members, teams, clients] = await Promise.all([
    listProjectsAction({ limit: PROJECT_LIST_LIMIT }).then(unwrapResult),
    listHubMembersAction().then(unwrapResult),
    listTeamsAction().then(unwrapResult),
    listClientOptionsAction().then(unwrapResult),
  ])

  return (
    <>
      <HubPageHeader title="Kanban" />
      <main className="w-full min-w-0 max-w-full flex-1 space-y-6 overflow-hidden p-4 lg:p-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Kanban tabla</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">Svi projekti raspoređeni po fazama, od ponude do fakturisanja.</p>
        </div>

        <KanbanBoard
          projects={projectList.projects}
          hasMore={projectList.hasMore}
          members={members}
          teams={teams}
          clients={clients}
          currentUser={user}
        />
      </main>
    </>
  )
}
