import { RiAlertLine, RiCheckLine } from "@remixicon/react"
import { PROJECT_STATUSES, type ProjectStatus } from "@/lib/hub/constants"
import { getDaysOverdue } from "@/lib/hub/format"
import { STATUS_ROLES } from "@/lib/hub/permissions"
import { ROLE_DISPLAY_NAMES, STATUS_LABELS } from "@/lib/hub/labels"
import type { HubProject } from "@/lib/hub/types"
import { cn, formatDate } from "@/lib/utils"

/** The date that belongs to each phase; "ready to invoice" has none of its own. */
function getPhaseDate(project: HubProject, status: ProjectStatus): string | null {
  switch (status) {
    case "offer_sent":
      return project.offer_date
    case "agreed":
      return project.agreement_date
    case "in_progress":
      return project.start_date
    case "completed":
      return project.completion_date
    case "invoiced":
      return project.invoice_date
    default:
      return null
  }
}

export function PhasesTab({ project }: { project: HubProject }) {
  const currentIndex = PROJECT_STATUSES.indexOf(project.status)
  const daysOverdue = getDaysOverdue(project)

  return (
    <div className="space-y-4">
      <div className="space-y-4 rounded-xl border border-border bg-card p-5">
        <div>
          <h3 className="text-sm font-semibold">Tok projekta</h3>
          <p className="text-xs text-muted-foreground">Faze od ponude do fakturisanja i ko je odgovoran za svaku.</p>
        </div>

        <ol className="grid gap-3 md:grid-cols-6">
          {PROJECT_STATUSES.map((status, index) => {
            const isCurrent = index === currentIndex
            const isPassed = index < currentIndex
            return (
              <li
                key={status}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-xl border p-3 text-center",
                  isCurrent && "border-primary bg-primary/5 ring-2 ring-primary/20",
                  isPassed && "border-emerald-500/40",
                  !isCurrent && !isPassed && "border-border opacity-60"
                )}
              >
                <span
                  className={cn(
                    "flex size-7 items-center justify-center rounded-full text-xs font-bold",
                    isCurrent && "bg-primary text-primary-foreground",
                    isPassed && "bg-emerald-600 text-white",
                    !isCurrent && !isPassed && "bg-muted text-muted-foreground"
                  )}
                >
                  {isPassed ? <RiCheckLine className="size-4" /> : index + 1}
                </span>
                <span className="text-xs font-semibold">{STATUS_LABELS[status]}</span>
                <span className="font-mono text-[11px] text-muted-foreground">
                  {formatDate(getPhaseDate(project, status))}
                </span>
                <span className="text-[10px] text-primary">{ROLE_DISPLAY_NAMES[STATUS_ROLES[status][0]]}</span>
              </li>
            )
          })}
        </ol>
      </div>

      <div className="space-y-3 rounded-xl border border-border bg-card p-5">
        <h3 className="text-sm font-semibold">Planirano i stvarno</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-border p-3.5">
            <span className="block text-xs text-muted-foreground">Planirani rok završetka</span>
            <span className="font-mono text-lg font-bold">{formatDate(project.planned_deadline, "Nije definisan")}</span>
          </div>
          <div className="rounded-lg border border-border p-3.5">
            <span className="block text-xs text-muted-foreground">Stvarni završetak</span>
            <span className="font-mono text-lg font-bold">{formatDate(project.completion_date, "U toku")}</span>
          </div>
        </div>

        {daysOverdue > 0 && (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
            <RiAlertLine className="size-4" />
            Kašnjenje od <strong>{daysOverdue} dana</strong> u odnosu na planirani rok.
          </div>
        )}
      </div>
    </div>
  )
}
