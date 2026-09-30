import type { Metadata } from "next"
import { HubPageHeader } from "@/components/hub/hub-page-header"
import { LeadWorkload, StatusBreakdown, TopClients, TypeBreakdown } from "@/components/hub/reports/reports-breakdowns"
import { ReportsKpis } from "@/components/hub/reports/reports-kpis"
import { AdBudgetsPanel } from "@/components/hub/reports/reports-ad-budgets"
import { OverdueProjects } from "@/components/hub/reports/reports-overdue"
import { getCurrentMonthAdBudgetsAction } from "@/lib/hub/actions/ad-budgets"
import { listProjectsAction } from "@/lib/hub/actions/projects"
import { unwrapResult } from "@/lib/hub/actions/run-action"
import { listHubMembersAction } from "@/lib/hub/actions/users"
import { buildReport } from "@/lib/hub/reports"
import { requireHubUser } from "@/lib/hub/server/session"

export const metadata: Metadata = {
  title: "Izvještaji | Edvision Hub",
  description: "Pregled vrijednosti, faza, kašnjenja i opterećenosti tima",
}

const PROJECT_LIST_LIMIT = 500

export default async function ReportsPage() {
  await requireHubUser()

  const [projectList, members, adMonth] = await Promise.all([
    listProjectsAction({ limit: PROJECT_LIST_LIMIT }).then(unwrapResult),
    listHubMembersAction().then(unwrapResult),
    getCurrentMonthAdBudgetsAction().then(unwrapResult),
  ])

  const report = buildReport(projectList.projects)
  const names = new Map(members.map((member) => [member.id, member.name]))
  const leadNameOf = (id: string) => names.get(id) ?? "Nepoznat korisnik"

  return (
    <>
      <HubPageHeader title="Izvještaji" />
      <main className="w-full min-w-0 max-w-full flex-1 space-y-6 p-4 lg:p-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Izvještaji</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Vrijednost projekata, faze, kašnjenja i opterećenost tima.
          </p>
        </div>

        <ReportsKpis report={report} />
        <StatusBreakdown report={report} />

        <div className="grid gap-6 lg:grid-cols-2">
          <TypeBreakdown report={report} />
          <div className="space-y-6">
            <LeadWorkload report={report} leadNameOf={leadNameOf} />
            <TopClients report={report} />
          </div>
        </div>

        <AdBudgetsPanel month={adMonth.month} rows={adMonth.rows} projects={projectList.projects} />

        <OverdueProjects report={report} leadNameOf={leadNameOf} />

        {projectList.total > projectList.projects.length && (
          <p className="text-xs text-muted-foreground">
            Izvještaj obuhvata prvih {projectList.projects.length} od {projectList.total} projekata.
          </p>
        )}
      </main>
    </>
  )
}
