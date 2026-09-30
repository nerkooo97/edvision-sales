"use client"

import * as React from "react"
import { RiAlertLine, RiLoader4Line } from "@remixicon/react"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { setAdBudgetAction } from "@/lib/hub/actions/ad-budgets"
import { monthLabel, type AdBudgetTable, type AdPlatform, type PlatformAmounts } from "@/lib/hub/ad-budget"
import { formatMoney, fromDisplayAmount, toDisplayAmount, type Currency } from "@/lib/hub/currency"
import { cn } from "@/lib/utils"

interface AdBudgetTableProps {
  projectId: string
  table: AdBudgetTable
  /** Only the platforms this project advertises on. */
  platforms: AdPlatform[]
  /** Amounts are stored in KM; this is the currency they are shown and typed in. */
  currency: Currency
  canManage: boolean
  onChanged: () => void
}

const PLATFORM_NAMES: Record<AdPlatform, string> = { meta: "Meta", google: "Google Ads" }

const parseAmount = (text: string): number => {
  const trimmed = text.trim()
  return trimmed === "" ? 0 : Number(trimmed)
}

/**
 * Plan and actual spend of one platform in one month, shown and typed in the chosen currency and stored in KM.
 * Both inputs are saved together when either loses focus and its value actually changed (retyping the number
 * that is already shown never rewrites the stored amount); a rejected save puts the previous numbers back.
 */
function PlatformCells({
  projectId,
  month,
  platform,
  amounts,
  currency,
  canManage,
  onChanged,
}: {
  projectId: string
  month: string
  platform: AdPlatform
  amounts: PlatformAmounts
  currency: Currency
  canManage: boolean
  onChanged: () => void
}) {
  const shownPlanned = toDisplayAmount(amounts.planned, currency)
  const shownSpent = toDisplayAmount(amounts.spent, currency)

  const [planned, setPlanned] = React.useState(String(shownPlanned))
  const [spent, setSpent] = React.useState(String(shownSpent))
  const [isSaving, setIsSaving] = React.useState(false)
  const over = amounts.spent > amounts.planned

  const restore = () => {
    setPlanned(String(shownPlanned))
    setSpent(String(shownSpent))
  }

  const save = async () => {
    const typedPlanned = parseAmount(planned)
    const typedSpent = parseAmount(spent)
    if (typedPlanned === shownPlanned && typedSpent === shownSpent) return

    if (Number.isNaN(typedPlanned) || Number.isNaN(typedSpent) || typedPlanned < 0 || typedSpent < 0) {
      toast.error("Unesite ispravan iznos (0 ili veći).")
      return restore()
    }

    setIsSaving(true)
    const result = await setAdBudgetAction(projectId, {
      month,
      platform,
      // A field that was not touched keeps its exact stored amount instead of a re-converted one.
      planned: typedPlanned === shownPlanned ? amounts.planned : fromDisplayAmount(typedPlanned, currency),
      spent: typedSpent === shownSpent ? amounts.spent : fromDisplayAmount(typedSpent, currency),
    })
    setIsSaving(false)

    if (result.success) return onChanged()
    toast.error(result.error)
    restore()
  }

  const input = (value: string, setValue: (next: string) => void, label: string, shown: number, tone?: string) =>
    canManage ? (
      <Input
        type="number"
        min={0}
        step="0.01"
        inputMode="decimal"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onBlur={save}
        onKeyDown={(event) => event.key === "Enter" && event.currentTarget.blur()}
        disabled={isSaving}
        aria-label={`${PLATFORM_NAMES[platform]} ${label}, ${monthLabel(month)}, ${currency}`}
        className={cn("h-8 w-24 rounded-lg px-2 text-right font-mono text-sm tabular-nums", tone)}
      />
    ) : (
      <span className={cn("font-mono text-sm tabular-nums", tone)}>{shown}</span>
    )

  return (
    <>
      <TableCell className="text-right">{input(planned, setPlanned, "plan", shownPlanned)}</TableCell>
      <TableCell className="text-right">
        <span className="inline-flex items-center gap-1">
          {isSaving && <RiLoader4Line className="size-3.5 animate-spin text-muted-foreground" />}
          {input(spent, setSpent, "potrošeno", shownSpent, over ? "border-destructive/50 text-destructive" : undefined)}
        </span>
      </TableCell>
    </>
  )
}

export function AdBudgetTableView({ projectId, table, platforms, currency, canManage, onChanged }: AdBudgetTableProps) {
  // With a single platform the overall plan and spend would only repeat its own columns.
  const showTotals = platforms.length > 1
  const symbol = currency === "EUR" ? "€" : "KM"
  const money = (km: number) => formatMoney(km, currency)

  const headers: { label: string; align?: "right" }[] = [
    { label: "Mjesec" },
    ...platforms.flatMap((platform) => [
      { label: `${PLATFORM_NAMES[platform]} plan (${symbol})`, align: "right" as const },
      { label: `${PLATFORM_NAMES[platform]} potrošeno (${symbol})`, align: "right" as const },
    ]),
    ...(showTotals
      ? [
          { label: "Ukupno plan", align: "right" as const },
          { label: "Ukupno potrošeno", align: "right" as const },
        ]
      : []),
    { label: "Preostalo", align: "right" as const },
  ]

  return (
    <div className="w-full max-w-full overflow-x-auto rounded-xl border border-border bg-card">
      <Table className={showTotals ? "min-w-[1000px]" : "min-w-[560px]"}>
        <TableHeader>
          <TableRow className="bg-muted/40 hover:bg-transparent">
            {headers.map((header) => (
              <TableHead
                key={header.label}
                className={cn(
                  "text-xs font-semibold tracking-wider text-muted-foreground uppercase",
                  header.align === "right" && "text-right"
                )}
              >
                {header.label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {table.rows.map((row) => (
            <TableRow key={row.month} className={cn(row.isCurrent && "bg-primary/5")}>
              <TableCell>
                <span className="text-sm font-semibold">{monthLabel(row.month)}</span>
                {row.isCurrent && <span className="block text-[11px] text-primary">Tekući mjesec</span>}
              </TableCell>

              {platforms.map((platform) => (
                <PlatformCells
                  // Remounted when the stored numbers or the currency change, so the inputs always match.
                  key={`${platform}-${currency}-${row.platforms[platform].planned}-${row.platforms[platform].spent}`}
                  projectId={projectId}
                  month={row.month}
                  platform={platform}
                  amounts={row.platforms[platform]}
                  currency={currency}
                  canManage={canManage}
                  onChanged={onChanged}
                />
              ))}

              {showTotals && (
                <>
                  <TableCell className="text-right font-mono text-sm tabular-nums">{money(row.planned)}</TableCell>
                  <TableCell className="text-right font-mono text-sm font-semibold tabular-nums">{money(row.spent)}</TableCell>
                </>
              )}
              <TableCell
                className={cn(
                  "text-right font-mono text-sm font-semibold tabular-nums",
                  row.overspent ? "text-destructive" : "text-emerald-700 dark:text-emerald-400"
                )}
              >
                <span
                  className="inline-flex items-center justify-end gap-1"
                  title={row.overspent ? "Potrošnja je premašila plan na barem jednoj platformi" : undefined}
                >
                  {row.overspent && <RiAlertLine className="size-3.5" />}
                  {money(row.remaining)}
                </span>
              </TableCell>
            </TableRow>
          ))}

          <TableRow className="bg-muted/40 font-semibold hover:bg-muted/40">
            <TableCell className="text-xs tracking-wider uppercase">Ukupno</TableCell>
            {platforms.map((platform) => (
              <React.Fragment key={platform}>
                <TableCell className="text-right font-mono text-sm tabular-nums">
                  {money(table.totals.platforms[platform].planned)}
                </TableCell>
                <TableCell className="text-right font-mono text-sm tabular-nums">
                  {money(table.totals.platforms[platform].spent)}
                </TableCell>
              </React.Fragment>
            ))}
            {showTotals && (
              <>
                <TableCell className="text-right font-mono text-sm tabular-nums">{money(table.totals.planned)}</TableCell>
                <TableCell className="text-right font-mono text-sm tabular-nums">{money(table.totals.spent)}</TableCell>
              </>
            )}
            <TableCell className="text-right font-mono text-sm tabular-nums">
              {money(Math.round((table.totals.planned - table.totals.spent) * 100) / 100)}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  )
}
