import type { ReactNode } from "react"
import { RiStackLine, RiTrophyLine, RiWallet3Line } from "@remixicon/react"
import { Card } from "@/components/ui/card"
import { formatKm } from "@/lib/hub/format"
import { summarizeSubscriptions, type ExchangeRates } from "@/lib/hub/subscriptions"
import type { HubSubscription } from "@/lib/hub/types"
import { cn } from "@/lib/utils"

interface StatCardProps {
  icon: ReactNode
  /** Tailwind classes for the icon tile, e.g. "bg-blue-500/10 text-blue-600". */
  tone: string
  label: string
  children: ReactNode
  footerLabel?: string
  footerValue?: string
}

function StatCard({ icon, tone, label, children, footerLabel, footerValue }: StatCardProps) {
  return (
    <Card className="gap-0 border-border bg-card p-5 shadow-xs transition-colors hover:border-primary/40">
      <div className="flex items-center gap-3">
        <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", tone)}>{icon}</div>
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
      </div>

      <div className="mt-4 min-h-10 space-y-0.5">{children}</div>

      {footerLabel && (
        <div className="mt-3 flex items-center justify-between gap-3 border-t border-border/50 pt-3 text-[11px] text-muted-foreground">
          <span className="shrink-0">{footerLabel}</span>
          <span className="truncate font-medium text-foreground">{footerValue}</span>
        </div>
      )}
    </Card>
  )
}

const BIG_VALUE = "block truncate text-2xl font-bold tracking-tight text-foreground tabular-nums"

interface SubscriptionsSummaryProps {
  subscriptions: HubSubscription[]
  rates: ExchangeRates | null
}

export function SubscriptionsSummary({ subscriptions, rates }: SubscriptionsSummaryProps) {
  const summary = summarizeSubscriptions(subscriptions, rates)
  const { top } = summary

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <StatCard
        icon={<RiWallet3Line className="size-5" />}
        tone="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
        label="Ukupna vrijednost"
        // Only worth a note when dollar subscriptions had to be left out because the rate was unavailable.
        footerLabel={summary.unconverted > 0 ? "Kurs dolara nedostupan" : undefined}
        footerValue={summary.unconverted > 0 ? `${summary.unconverted} izostavljeno` : undefined}
      >
        <span className={BIG_VALUE}>{formatKm(summary.totalKm)}</span>
      </StatCard>

      <StatCard
        icon={<RiStackLine className="size-5" />}
        tone="bg-blue-500/10 text-blue-600 dark:text-blue-400"
        label="Ukupno pretplata"
        footerLabel="Različitih usluga"
        footerValue={String(summary.uniqueNames)}
      >
        <span className={BIG_VALUE}>{summary.count}</span>
      </StatCard>

      <StatCard
        icon={<RiTrophyLine className="size-5" />}
        tone="bg-amber-500/10 text-amber-600 dark:text-amber-400"
        label="Najskuplja pretplata"
        footerLabel="Udio u ukupnoj vrijednosti"
        footerValue={top && summary.totalKm > 0 ? `${Math.round((top.totalKm / summary.totalKm) * 100)}%` : "—"}
      >
        {top ? (
          <div className="flex items-baseline justify-between gap-3">
            <span className={cn(BIG_VALUE, "min-w-0")}>{top.name}</span>
            <span className="shrink-0 text-sm font-semibold tabular-nums text-muted-foreground">
              {formatKm(top.totalKm)}
              {top.count > 1 && <span className="ml-1 text-[11px] font-normal">({top.count}×)</span>}
            </span>
          </div>
        ) : (
          <span className={BIG_VALUE}>—</span>
        )}
      </StatCard>
    </div>
  )
}
