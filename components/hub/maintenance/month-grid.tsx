"use client"

import { countMonths, hasMonth, MONTH_SHORT_NAMES } from "@/lib/hub/maintenance"
import { cn } from "@/lib/utils"

/** Column header for the month grid: one letter per month, aligned with the cells below. */
export function MonthGridHeader() {
  return (
    <div className="grid w-max grid-cols-12 gap-[3px] text-center text-[10px] font-normal text-muted-foreground">
      {MONTH_SHORT_NAMES.map((name) => (
        <span key={name} className="w-4" title={name}>
          {name[0]}
        </span>
      ))}
    </div>
  )
}

interface MonthGridProps {
  months: number
  /** Month (0-11) to outline as "now", or null when the list is not for the current year. */
  currentMonth: number | null
  /** When set, each cell is a button that adds or removes that month. */
  onToggle?: (month: number) => void
  busy?: boolean
  muted?: boolean
}

/** Twelve cells, filled for the months worked on, so rows can be compared at a glance. */
export function MonthGrid({ months, currentMonth, onToggle, busy, muted }: MonthGridProps) {
  const count = countMonths(months)
  return (
    <div
      className={cn("grid w-max grid-cols-12 gap-[3px]", muted && "opacity-50", busy && "cursor-wait opacity-60")}
      title={`${count} ${count === 1 ? "mjesec" : count < 5 && count > 1 ? "mjeseca" : "mjeseci"}`}
    >
      {MONTH_SHORT_NAMES.map((name, month) => {
        const filled = hasMonth(months, month)
        const className = cn(
          "size-4 rounded-[3px] border",
          filled ? "border-emerald-600 bg-emerald-600 dark:border-emerald-500 dark:bg-emerald-500" : "border-border bg-muted/40",
          month === currentMonth && "ring-2 ring-primary/70 ring-offset-1 ring-offset-background"
        )
        if (!onToggle) return <span key={name} className={className} aria-label={`${name}: ${filled ? "da" : "ne"}`} />
        return (
          <button
            key={name}
            type="button"
            disabled={busy}
            onClick={() => onToggle(month)}
            title={`${filled ? "Ukloni" : "Dodaj"} mjesec: ${name}`}
            aria-label={`${filled ? "Ukloni" : "Dodaj"} mjesec ${name}`}
            aria-pressed={filled}
            className={cn(className, "cursor-pointer transition-transform hover:scale-110 disabled:cursor-wait")}
          />
        )
      })}
    </div>
  )
}
