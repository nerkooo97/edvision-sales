import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { HubPageHeader } from "@/components/hub/hub-page-header"
import { ProjectDetail } from "@/components/hub/detail/project-detail"
import { getProjectDetailAction } from "@/lib/hub/actions/projects"
import { unwrapResult } from "@/lib/hub/actions/run-action"
import { listClientOptionsAction } from "@/lib/hub/actions/clients"
import { listTeamsAction } from "@/lib/hub/actions/teams"
import { listHubMembersAction } from "@/lib/hub/actions/users"
import { requireHubPageUser } from "@/lib/hub/server/session"

export const metadata: Metadata = {
  title: "Projekat | Edvision Hub",
  description: "Detalji projekta, zadaci, komentari i historija aktivnosti",
}

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await requireHubPageUser()

  const detailResult = await getProjectDetailAction(id)
  // A malformed id or a missing project both mean "there is nothing at this address".
  if (!detailResult.success && (detailResult.code === "not_found" || detailResult.code === "validation")) {
    notFound()
  }

  const [detail, members, teams, clients] = await Promise.all([
    Promise.resolve(unwrapResult(detailResult)),
    listHubMembersAction().then(unwrapResult),
    listTeamsAction().then(unwrapResult),
    listClientOptionsAction().then(unwrapResult),
  ])

  return (
    <>
      <HubPageHeader title="Projekti" />
      <main className="w-full min-w-0 max-w-full flex-1 p-4 lg:p-6">
        <ProjectDetail data={detail} members={members} teams={teams} clients={clients} currentUser={user} />
      </main>
    </>
  )
}
