import type { Metadata } from "next"
import { HubPageHeader } from "@/components/hub/hub-page-header"
import { TimelineList } from "@/components/hub/timeline/timeline-list"
import { listProjectsAction } from "@/lib/hub/actions/projects"
import { unwrapResult } from "@/lib/hub/actions/run-action"
import { listHubMembersAction } from "@/lib/hub/actions/users"
import { requireHubUser } from "@/lib/hub/server/session"

export const metadata: Metadata = {
  title: "Vremenski tok | Edvision Hub",
  description: "Hronološki pregled rokova i faza svih projekata",
}

const PROJECT_LIST_LIMIT = 500

export default async function TimelinePage() {
  await requireHubUser()

  const [projectList, members] = await Promise.all([
    listProjectsAction({ limit: PROJECT_LIST_LIMIT }).then(unwrapResult),
    listHubMembersAction().then(unwrapResult),
  ])

  return (
    <>
      <HubPageHeader title="Vremenski tok" />
      <main className="w-full min-w-0 max-w-full flex-1 space-y-6 p-4 lg:p-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Vremenski tok projekata</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Hronološki pregled faza, datuma početka i planiranih rokova isporuke.
          </p>
        </div>

        <TimelineList projects={projectList.projects} members={members} />
      </main>
    </>
  )
}
