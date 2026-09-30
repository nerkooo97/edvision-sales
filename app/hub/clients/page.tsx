import type { Metadata } from "next"
import { ClientsTable } from "@/components/hub/clients/clients-table"
import { HubPageHeader } from "@/components/hub/hub-page-header"
import { listClientsAction } from "@/lib/hub/actions/clients"
import { listProjectsAction } from "@/lib/hub/actions/projects"
import { unwrapResult } from "@/lib/hub/actions/run-action"
import { canDeleteClient, canManageClients } from "@/lib/hub/permissions"
import { requireHubUser } from "@/lib/hub/server/session"

export const metadata: Metadata = {
  title: "Klijenti | Edvision Hub",
  description: "Baza klijenata i njihovi projekti",
}

const PROJECT_LIST_LIMIT = 500

export default async function ClientsPage() {
  const user = await requireHubUser()

  const [clients, projectList] = await Promise.all([
    listClientsAction().then(unwrapResult),
    listProjectsAction({ limit: PROJECT_LIST_LIMIT }).then(unwrapResult),
  ])

  return (
    <>
      <HubPageHeader title="Klijenti" />
      <main className="w-full min-w-0 max-w-full flex-1 space-y-6 overflow-hidden p-4 lg:p-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Klijenti</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Baza klijenata s kontakt podacima. Odabirom klijenta pri kreiranju projekta podaci se popune sami.
          </p>
        </div>

        <ClientsTable
          clients={clients}
          projects={projectList.projects}
          canManage={canManageClients(user.role)}
          canDelete={canDeleteClient(user.role)}
        />
      </main>
    </>
  )
}
