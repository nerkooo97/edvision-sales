"use client"

import { cn } from "@/lib/utils"

/** Colour of a status, shared by the badges in the rows and the filter chips above the tables. */
export type StatusTone = "positive" | "attention" | "neutral" | "negative"

const TONES: Record<StatusTone, string> = {
  positive: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  attention: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  neutral: "bg-muted text-muted-foreground",
  negative: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300",
}

export function StatusBadge({ tone, children }: { tone: StatusTone; children: React.ReactNode }) {
  return (
    <span className={cn("inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium whitespace-nowrap", TONES[tone])}>
      {children}
    </span>
  )
}

export interface StatusChip<K extends string> {
  key: K
  label: string
  count: number
  tone: StatusTone
}

/**
 * Counts per status above a table; clicking one shows only that status, clicking it again shows all.
 * Chips with no rows are left out.
 */
export function StatusChips<K extends string>({
  chips,
  selected,
  onSelect,
}: {
  chips: StatusChip<K>[]
  selected: K | null
  onSelect: (key: K | null) => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter po statusu">
      {chips
        .filter((chip) => chip.count > 0)
        .map((chip) => {
          const active = selected === chip.key
          return (
            <button
              key={chip.key}
              type="button"
              aria-pressed={active}
              onClick={() => onSelect(active ? null : chip.key)}
              className={cn(
                "inline-flex cursor-pointer items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-shadow",
                TONES[chip.tone],
                active ? "ring-2 ring-primary/60" : selected && "opacity-60 hover:opacity-100"
              )}
            >
              {chip.label}
              <span className="tabular-nums">{chip.count}</span>
            </button>
          )
        })}
      {selected && (
        <button
          type="button"
          onClick={() => onSelect(null)}
          className="cursor-pointer text-xs text-muted-foreground underline-offset-2 hover:underline"
        >
          Prikaži sve
        </button>
      )}
    </div>
  )
}
