import type { Metadata } from "next"
import { HubPageHeader } from "@/components/hub/hub-page-header"
import { ProjectsTable } from "@/components/hub/projects/projects-table"
import { listProjectsAction } from "@/lib/hub/actions/projects"
import { unwrapResult } from "@/lib/hub/actions/run-action"
import { listClientsAction } from "@/lib/hub/actions/clients"
import { listTeamsAction } from "@/lib/hub/actions/teams"
import { listHubMembersAction } from "@/lib/hub/actions/users"
import { requireHubUser } from "@/lib/hub/server/session"

export const metadata: Metadata = {
  title: "Registar projekata | Edvision Hub",
  description: "Pregled i evidencija svih projekata",
}

// Lists are small (lightweight rows, capped), so filtering and sorting happen in the browser.
const PROJECT_LIST_LIMIT = 500

export default async function ProjectsPage() {
  const user = await requireHubUser()

  const [projectList, members, teams, clients] = await Promise.all([
    listProjectsAction({ limit: PROJECT_LIST_LIMIT }).then(unwrapResult),
    listHubMembersAction().then(unwrapResult),
    listTeamsAction().then(unwrapResult),
    listClientsAction().then(unwrapResult),
  ])

  return (
    <>
      <HubPageHeader title="Projekti" />
      <main className="w-full min-w-0 max-w-full flex-1 space-y-6 overflow-hidden p-4 lg:p-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Registar projekata</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Evidencija, pretraga i upravljanje svim projektima, klijentima i rokovima.
          </p>
        </div>

        <ProjectsTable
          projects={projectList.projects}
          total={projectList.total}
          members={members}
          teams={teams}
          clients={clients}
          currentUser={user}
        />
      </main>
    </>
  )
}
