import { RiAlertLine, RiCheckboxCircleLine, RiMoneyDollarCircleLine, RiRefreshLine, RiTimeLine } from "@remixicon/react"
import { formatKm } from "@/lib/hub/format"
import type { ReportData } from "@/lib/hub/reports"
import { cn } from "@/lib/utils"

function Kpi({
  label,
  value,
  hint,
  icon,
  tone = "text-foreground",
}: {
  label: string
  value: string
  hint: string
  icon: React.ReactNode
  tone?: string
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="mb-2 flex items-center justify-between text-muted-foreground">
        <span className="text-xs font-semibold">{label}</span>
        {icon}
      </div>
      <div className={cn("font-mono text-2xl font-bold tabular-nums", tone)}>{value}</div>
      <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>
    </div>
  )
}

export function ReportsKpis({ report }: { report: ReportData }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      <Kpi
        label="Ukupna vrijednost projekata"
        value={formatKm(report.totalValue)}
        hint={`${report.totalProjects} projekata u sistemu · ${formatKm(report.inWork.value)} u radu`}
        icon={<RiMoneyDollarCircleLine className="size-4 text-primary" />}
      />
      <Kpi
        label="Fakturisano"
        value={formatKm(report.invoiced.value)}
        hint={`${report.invoiced.count} zatvorenih projekata`}
        icon={<RiCheckboxCircleLine className="size-4 text-emerald-600" />}
        tone="text-emerald-700 dark:text-emerald-400"
      />
      <Kpi
        label="Spremno za fakturu"
        value={formatKm(report.readyToInvoice.value)}
        hint={`${report.readyToInvoice.count} projekata čeka fakturu`}
        icon={<RiTimeLine className="size-4 text-cyan-600" />}
        tone="text-cyan-700 dark:text-cyan-400"
      />
      <Kpi
        label="Mjesečni prihod (stalne usluge)"
        value={formatKm(report.recurring.monthlyValue)}
        hint={`${report.recurring.count} ugovora u toku`}
        icon={<RiRefreshLine className="size-4 text-blue-600" />}
        tone="text-blue-700 dark:text-blue-400"
      />
      <Kpi
        label="Projekti u kašnjenju"
        value={String(report.overdue.length)}
        hint={`${report.dueSoonCount} ističe u narednih 7 dana`}
        icon={<RiAlertLine className="size-4 text-destructive" />}
        tone={report.overdue.length > 0 ? "text-destructive" : "text-foreground"}
      />
    </div>
  )
}
