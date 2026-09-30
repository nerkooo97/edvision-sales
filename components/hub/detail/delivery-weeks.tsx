"use client"

import { RiAddLine, RiLoader4Line, RiSubtractLine } from "@remixicon/react"
import { Button } from "@/components/ui/button"
import type { WeekState, WeekSummary } from "@/lib/hub/retainer"
import { cn } from "@/lib/utils"

interface DeliveryWeeksProps {
  weeks: WeekSummary[]
  canLog: boolean
  /** Week currently being saved; its buttons are disabled so a double click cannot send two updates. */
  pendingWeek: number | null
  onChange: (week: number, delivered: number) => void
}

const CARD_STYLES: Record<WeekState, string> = {
  future: "border-border bg-card opacity-60",
  current: "border-primary bg-primary/5 ring-2 ring-primary/20",
  under: "border-destructive/40 bg-destructive/5",
  ok: "border-emerald-500/40 bg-emerald-500/5",
  over: "border-amber-500/50 bg-amber-500/5",
}

const STATE_HINT: Record<WeekState, string> = {
  future: "Predstoji",
  current: "U toku",
  under: "Manjak",
  ok: "Ispunjeno",
  over: "Iznad dogovora",
}

/** "05.11." from a YYYY-MM-DD date. */
const shortDate = (date: string) => `${date.slice(8, 10)}.${date.slice(5, 7)}.`

export function DeliveryWeeks({ weeks, canLog, pendingWeek, onChange }: DeliveryWeeksProps) {
  return (
    <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {weeks.map((week) => {
        const difference = week.delivered - week.quota
        // A running week may still be caught up, so a shortfall only counts once it has ended; a surplus is already certain.
        const showDifference = week.state === "current" ? difference > 0 : week.state !== "future" && difference !== 0
        const busy = pendingWeek === week.week

        return (
          <div key={week.week} className={cn("space-y-2 rounded-xl border p-3", CARD_STYLES[week.state])}>
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-sm font-semibold">Sedmica {week.week}</span>
              <span className="font-mono text-[11px] text-muted-foreground">
                {shortDate(week.start)} – {shortDate(week.end)}
              </span>
            </div>

            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1">
                {canLog && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="size-7 cursor-pointer"
                    disabled={busy || week.delivered === 0}
                    onClick={() => onChange(week.week, week.delivered - 1)}
                    aria-label={`Smanji broj objava, sedmica ${week.week}`}
                  >
                    <RiSubtractLine className="size-3.5" />
                  </Button>
                )}
                <span className="min-w-14 text-center font-mono text-lg font-bold tabular-nums">
                  {busy ? <RiLoader4Line className="mx-auto size-5 animate-spin" /> : `${week.delivered}/${week.quota}`}
                </span>
                {canLog && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="size-7 cursor-pointer"
                    disabled={busy}
                    onClick={() => onChange(week.week, week.delivered + 1)}
                    aria-label={`Povećaj broj objava, sedmica ${week.week}`}
                  >
                    <RiAddLine className="size-3.5" />
                  </Button>
                )}
              </div>

              <span className="text-right text-[11px] text-muted-foreground">
                {STATE_HINT[week.state]}
                {showDifference && (
                  <span className={cn("ml-1 font-mono font-semibold", difference > 0 ? "text-amber-600" : "text-destructive")}>
                    {difference > 0 ? `+${difference}` : difference}
                  </span>
                )}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
