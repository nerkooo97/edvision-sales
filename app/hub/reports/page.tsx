import type { Metadata } from "next"
import { HubPageHeader } from "@/components/hub/hub-page-header"
import { LeadWorkload, StatusBreakdown, TopClients, TypeBreakdown } from "@/components/hub/reports/reports-breakdowns"
import { ReportsFilter } from "@/components/hub/reports/reports-filter"
import { ReportsKpis } from "@/components/hub/reports/reports-kpis"
import { AdBudgetsPanel } from "@/components/hub/reports/reports-ad-budgets"
import { OverdueProjects } from "@/components/hub/reports/reports-overdue"
import { getCurrentMonthAdBudgetsAction } from "@/lib/hub/actions/ad-budgets"
import { listProjectsAction } from "@/lib/hub/actions/projects"
import { unwrapResult } from "@/lib/hub/actions/run-action"
import { listHubMembersAction } from "@/lib/hub/actions/users"
import { canViewProjectMoney } from "@/lib/hub/permissions"
import {
  PERIOD_BASIS_LABELS,
  availableYears,
  describePeriod,
  filterByPeriod,
  isPeriodFiltered,
  parsePeriod,
} from "@/lib/hub/report-period"
import { buildReport } from "@/lib/hub/reports"
import { requireHubUser } from "@/lib/hub/server/session"

export const metadata: Metadata = {
  title: "Izvještaji | Edvision Hub",
  description: "Pregled vrijednosti, faza, kašnjenja i opterećenosti tima",
}

const PROJECT_LIST_LIMIT = 500

interface ReportsPageProps {
  searchParams: Promise<{ year?: string; month?: string; basis?: string }>
}

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const user = await requireHubUser()
  const period = parsePeriod(await searchParams)
  const showMoney = canViewProjectMoney(user.role)

  // The ad budget is the client's money of one calendar month, so it follows a chosen month and otherwise shows the current one.
  const adMonthKey =
    period.year !== null && period.month !== null
      ? `${period.year}-${String(period.month).padStart(2, "0")}`
      : undefined

  const [projectList, members, adMonth] = await Promise.all([
    listProjectsAction({ limit: PROJECT_LIST_LIMIT }).then(unwrapResult),
    listHubMembersAction().then(unwrapResult),
    getCurrentMonthAdBudgetsAction(adMonthKey).then(unwrapResult),
  ])

  const filtered = filterByPeriod(projectList.projects, period)
  const report = buildReport(filtered)
  const names = new Map(members.map((member) => [member.id, member.name]))
  const leadNameOf = (id: string) => names.get(id) ?? "Nepoznat korisnik"

  return (
    <>
      <HubPageHeader title="Izvještaji" />
      <main className="w-full min-w-0 max-w-full flex-1 space-y-6 p-4 lg:p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Izvještaji</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {showMoney
                ? "Vrijednost projekata, faze, kašnjenja i opterećenost tima."
                : "Pregled projekata po fazama, kašnjenja i opterećenost tima."}
            </p>
          </div>
          <ReportsFilter period={period} years={availableYears(projectList.projects, period)} />
        </div>

        {isPeriodFiltered(period) && (
          <p className="rounded-xl border border-primary/20 bg-primary/5 px-3.5 py-2 text-sm">
            Prikazano: <strong>{describePeriod(period)}</strong> (po datumu: {PERIOD_BASIS_LABELS[period.basis].toLowerCase()}),{" "}
            <strong>{filtered.length}</strong> od {projectList.projects.length} projekata.
          </p>
        )}

        <ReportsKpis report={report} showMoney={showMoney} />
        <StatusBreakdown report={report} showMoney={showMoney} />

        <div className="grid gap-6 lg:grid-cols-2">
          <TypeBreakdown report={report} showMoney={showMoney} />
          <div className="space-y-6">
            <LeadWorkload report={report} leadNameOf={leadNameOf} showMoney={showMoney} />
            {showMoney && <TopClients report={report} />}
          </div>
        </div>

        <AdBudgetsPanel month={adMonth.month} rows={adMonth.rows} projects={projectList.projects} />

        <OverdueProjects report={report} leadNameOf={leadNameOf} showMoney={showMoney} />

        {projectList.total > projectList.projects.length && (
          <p className="text-xs text-muted-foreground">
            Izvještaj obuhvata prvih {projectList.projects.length} od {projectList.total} projekata.
          </p>
        )}
      </main>
    </>
  )
}
