import type { Metadata } from "next"
import { HubPageHeader } from "@/components/hub/hub-page-header"
import { TeamsList } from "@/components/hub/teams/teams-list"
import { unwrapResult } from "@/lib/hub/actions/run-action"
import { listTeamsAction } from "@/lib/hub/actions/teams"
import { listHubMembersAction } from "@/lib/hub/actions/users"
import { canManageTeams } from "@/lib/hub/permissions"
import { requireHubPageUser } from "@/lib/hub/server/session"

export const metadata: Metadata = {
  title: "Timovi | Edvision Hub",
  description: "Timovi koji se dodjeljuju projektima",
}

export default async function TeamsPage() {
  const user = await requireHubPageUser()

  const [teams, members] = await Promise.all([
    listTeamsAction().then(unwrapResult),
    listHubMembersAction().then(unwrapResult),
  ])

  return (
    <>
      <HubPageHeader title="Timovi" />
      <main className="w-full min-w-0 max-w-full flex-1 space-y-6 p-4 lg:p-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Timovi</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Grupe korisnika koje se dodjeljuju projektima. Članovi tima učestvuju u svim njegovim projektima.
          </p>
        </div>

        <TeamsList teams={teams} members={members} canManage={canManageTeams(user.role)} />
      </main>
    </>
  )
}
