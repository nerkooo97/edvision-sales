import Link from "next/link"
import { RiAlertLine } from "@remixicon/react"
import { formatKm } from "@/lib/hub/format"
import type { ReportData } from "@/lib/hub/reports"
import { formatDate } from "@/lib/utils"

export function OverdueProjects({ report, leadNameOf }: { report: ReportData; leadNameOf: (id: string) => string }) {
  if (report.overdue.length === 0) return null

  return (
    <section className="space-y-3 rounded-xl border border-destructive/20 bg-destructive/5 p-5">
      <h3 className="flex items-center gap-2 text-xs font-bold tracking-wider text-destructive uppercase">
        <RiAlertLine className="size-4" />
        Projekti koji kasne
      </h3>

      <ul className="divide-y divide-destructive/15 overflow-hidden rounded-lg border border-destructive/20 bg-card text-xs">
        {report.overdue.map(({ project, daysOverdue }) => (
          <li key={project.$id}>
            <Link
              href={`/hub/projects/${project.$id}`}
              className="flex flex-col gap-2 p-3.5 transition-colors hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <span className="text-sm font-semibold">
                  {project.code} · {project.name}
                </span>
                <span className="block text-muted-foreground">
                  {project.client_name} · rok <span className="font-mono">{formatDate(project.planned_deadline)}</span>
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono font-semibold tabular-nums">{formatKm(project.budget)}</span>
                <span className="rounded bg-destructive/10 px-2 py-0.5 font-semibold text-destructive">
                  kasni {daysOverdue} d
                </span>
                <span className="text-muted-foreground">Voditelj: {leadNameOf(project.lead_id)}</span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
