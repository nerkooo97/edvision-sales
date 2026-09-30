import { formatKm } from "@/lib/hub/format"
import { STATUS_ACCENTS, STATUS_LABELS, TYPE_LABELS } from "@/lib/hub/labels"
import type { ReportData } from "@/lib/hub/reports"
import { cn } from "@/lib/utils"

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4 rounded-xl border border-border bg-card p-5">
      <h3 className="text-sm font-semibold">{title}</h3>
      {children}
    </section>
  )
}

function Bar({ percent }: { percent: number }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
      <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, percent)}%` }} />
    </div>
  )
}

function Empty({ text }: { text: string }) {
  return <p className="py-4 text-center text-xs text-muted-foreground">{text}</p>
}

export function StatusBreakdown({ report }: { report: ReportData }) {
  return (
    <Panel title="Projekti po fazama">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {report.byStatus.map((row) => (
          <div
            key={row.status}
            className={cn("space-y-1.5 rounded-xl border border-border border-t-4 bg-muted/20 p-3.5", STATUS_ACCENTS[row.status])}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold">{STATUS_LABELS[row.status]}</span>
              <span className="rounded border border-border bg-card px-1.5 font-mono text-xs font-bold">{row.count}</span>
            </div>
            <div className="flex items-baseline justify-between border-t border-border pt-1.5">
              <span className="font-mono text-sm font-bold tabular-nums">{formatKm(row.value)}</span>
              <span className="font-mono text-[10px] text-muted-foreground">{row.percent.toFixed(0)}%</span>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  )
}

export function TypeBreakdown({ report }: { report: ReportData }) {
  return (
    <Panel title="Vrijednost po vrsti usluge">
      {report.byType.length === 0 ? (
        <Empty text="Još nema projekata." />
      ) : (
        <div className="space-y-3">
          {report.byType.map((row) => (
            <div key={row.type} className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">
                  {TYPE_LABELS[row.type]} <span className="text-muted-foreground">({row.count})</span>
                </span>
                <span className="font-mono font-bold tabular-nums">
                  {formatKm(row.value)} <span className="font-normal text-muted-foreground">({row.percent.toFixed(1)}%)</span>
                </span>
              </div>
              <Bar percent={row.percent} />
            </div>
          ))}
        </div>
      )}
    </Panel>
  )
}

export function LeadWorkload({ report, leadNameOf }: { report: ReportData; leadNameOf: (id: string) => string }) {
  return (
    <Panel title="Opterećenost voditelja">
      {report.byLead.length === 0 ? (
        <Empty text="Još nema projekata." />
      ) : (
        <ul className="space-y-2.5">
          {report.byLead.map((row) => (
            <li key={row.leadId} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/20 p-3 text-xs">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 font-bold text-primary">
                  {leadNameOf(row.leadId).charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0">
                  <span className="block truncate text-sm font-semibold">{leadNameOf(row.leadId)}</span>
                  <span className="text-muted-foreground">
                    {row.count} projekata · {row.active} u toku
                  </span>
                </div>
              </div>
              <span className="font-mono text-sm font-bold tabular-nums">{formatKm(row.value)}</span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}

export function TopClients({ report }: { report: ReportData }) {
  const max = report.topClients[0]?.value ?? 0

  return (
    <Panel title="Najvredniji klijenti">
      {report.topClients.length === 0 ? (
        <Empty text="Još nema projekata." />
      ) : (
        <div className="space-y-3">
          {report.topClients.map((client) => (
            <div key={client.key} className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate font-medium">
                  {client.name} <span className="text-muted-foreground">({client.count})</span>
                </span>
                <span className="font-mono font-bold tabular-nums">{formatKm(client.value)}</span>
              </div>
              <Bar percent={max > 0 ? (client.value / max) * 100 : 0} />
            </div>
          ))}
        </div>
      )}
    </Panel>
  )
}
