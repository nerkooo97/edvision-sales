"use client"

import * as React from "react"
import { toast } from "sonner"
import { setDeliveryAction } from "@/lib/hub/actions/deliveries"
import { toDateInputValue, formatKm } from "@/lib/hub/format"
import { buildDeliverySummary } from "@/lib/hub/retainer"
import type { HubDelivery, HubProject } from "@/lib/hub/types"
import { DeliveryMonths } from "./delivery-months"
import { DeliveryWeeks } from "./delivery-weeks"

interface DeliveryTabProps {
  project: HubProject
  deliveries: HubDelivery[]
  canLog: boolean
  onChanged: () => void
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <span className="block text-xs text-muted-foreground">{label}</span>
      <span className="block font-mono text-xl font-bold tabular-nums">{value}</span>
      {hint && <span className="block text-[11px] text-muted-foreground">{hint}</span>}
    </div>
  )
}

/** Weekly delivery log of a recurring service, with the monthly figures needed to invoice it. */
export function DeliveryTab({ project, deliveries, canLog, onChanged }: DeliveryTabProps) {
  // Counts changed here show at once; the server rows replace them after the refresh.
  const [overrides, setOverrides] = React.useState<Record<number, number>>({})
  const [pendingWeek, setPendingWeek] = React.useState<number | null>(null)

  const summary = React.useMemo(() => {
    const byWeek = new Map(deliveries.map((delivery) => [delivery.week, delivery.delivered]))
    for (const [week, delivered] of Object.entries(overrides)) byWeek.set(Number(week), delivered)

    return buildDeliverySummary(
      {
        start: toDateInputValue(project.contract_start_date),
        months: project.contract_months ?? 0,
        weeklyQuota: project.weekly_quota ?? 0,
        monthlyFee: project.monthly_fee ?? 0,
        extraPostPrice: project.extra_post_price,
      },
      [...byWeek].map(([week, delivered]) => ({ week, delivered }))
    )
  }, [project, deliveries, overrides])

  const handleChange = async (week: number, delivered: number) => {
    if (delivered < 0) return
    const previous = overrides[week]

    setPendingWeek(week)
    setOverrides((current) => ({ ...current, [week]: delivered }))

    const result = await setDeliveryAction(project.$id, { week, delivered })
    setPendingWeek(null)

    if (result.success) return onChanged()

    // Put the old value back and say why.
    setOverrides((current) => {
      const next = { ...current }
      if (previous === undefined) delete next[week]
      else next[week] = previous
      return next
    })
    toast.error(result.error)
  }

  const current = summary.weeks.find((week) => week.week === summary.currentWeek)
  const extraAmount = summary.months.reduce((sum, month) => sum + month.extraAmount, 0)

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat
          label="Isporučeno u ugovoru"
          value={`${summary.totals.delivered} / ${summary.totals.contracted}`}
          hint={`${summary.totals.percent.toFixed(0)}% dogovorenog broja objava`}
        />
        <Stat
          label="Tekuća sedmica"
          value={current ? `${current.delivered} / ${current.quota}` : "—"}
          hint={current ? `Sedmica ${current.week} od ${summary.weeks.length}` : "Ugovor trenutno nije u toku"}
        />
        <Stat
          label="Dodatne objave za fakturisanje"
          value={String(summary.totals.extra)}
          hint={project.extra_post_price ? `${formatKm(extraAmount)} ukupno` : "Cijena dodatne objave nije unesena"}
        />
      </div>

      <section className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold">Objave po sedmicama</h3>
          <p className="text-xs text-muted-foreground">
            Dogovoreno je {project.weekly_quota} objava sedmično.
            {canLog ? " Upišite koliko je objavljeno." : " Evidenciju vode članovi tima projekta."}
          </p>
        </div>
        <DeliveryWeeks weeks={summary.weeks} canLog={canLog} pendingWeek={pendingWeek} onChange={handleChange} />
      </section>

      <section className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold">Mjesečni obračun</h3>
          <p className="text-xs text-muted-foreground">Naknada plus dodatne objave, spremno za mjesečnu fakturu.</p>
        </div>
        <DeliveryMonths months={summary.months} hasExtraPrice={Boolean(project.extra_post_price)} />
      </section>
    </div>
  )
}
