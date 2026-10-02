import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { ClientDetail } from "@/components/hub/clients/client-detail"
import { HubPageHeader } from "@/components/hub/hub-page-header"
import { getClientDetailAction } from "@/lib/hub/actions/clients"
import { unwrapResult } from "@/lib/hub/actions/run-action"
import { canViewProjectMoney } from "@/lib/hub/permissions"
import { requireHubUser } from "@/lib/hub/server/session"

export const metadata: Metadata = {
  title: "Klijent | Edvision Hub",
  description: "Podaci o klijentu i njegovi projekti",
}

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await requireHubUser()

  const result = await getClientDetailAction(id)
  if (!result.success && (result.code === "not_found" || result.code === "validation")) notFound()
  const { client, projects, permissions } = unwrapResult(result)

  return (
    <>
      <HubPageHeader title="Klijenti" />
      <main className="w-full min-w-0 max-w-full flex-1 p-4 lg:p-6">
        <ClientDetail
          client={client}
          projects={projects}
          canManage={permissions.canManage}
          canDelete={permissions.canDelete}
          canViewMoney={canViewProjectMoney(user.role)}
        />
      </main>
    </>
  )
}
