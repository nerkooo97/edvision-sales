"use client"

import * as React from "react"
import { RiAddLine } from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  buildAdBudgetTable,
  getAdPlatforms,
  isMonthKey,
  monthOf,
  resolveAdMonths,
  type AdEntry,
} from "@/lib/hub/ad-budget"
import { CURRENCIES, KM_PER_EUR, formatMoney, type Currency } from "@/lib/hub/currency"
import { toDateInputValue } from "@/lib/hub/format"
import type { HubAdBudget, HubProject } from "@/lib/hub/types"
import { cn } from "@/lib/utils"
import { AdBudgetTableView } from "./ad-budget-table"

interface AdBudgetTabProps {
  project: HubProject
  adBudgets: HubAdBudget[]
  canManage: boolean
  onChanged: () => void
}

function Stat({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <span className="block text-xs text-muted-foreground">{label}</span>
      <span className={`block font-mono text-xl font-bold tabular-nums ${tone ?? ""}`}>{value}</span>
      {hint && <span className="block text-[11px] text-muted-foreground">{hint}</span>}
    </div>
  )
}

const PLATFORM_NAMES = { meta: "Meta", google: "Google Ads" } as const

/**
 * Advertising money the client spends directly on Meta and Google Ads. It changes from month to month, so
 * plan and actual spend are kept per month and platform. It is not the agency's revenue and is kept apart
 * from the project value everywhere. Platforms bill in euros, so it is shown and typed in EUR by default,
 * with KM one click away (fixed rate); amounts are stored in KM.
 */
export function AdBudgetTab({ project, adBudgets, canManage, onChanged }: AdBudgetTabProps) {
  const [currency, setCurrency] = React.useState<Currency>("EUR")
  const [addedMonths, setAddedMonths] = React.useState<string[]>([])
  const [monthToAdd, setMonthToAdd] = React.useState("")

  const money = (km: number) => formatMoney(km, currency)

  const entries: AdEntry[] = adBudgets.map((row) => ({
    month: row.month,
    platform: row.platform,
    planned: row.planned,
    spent: row.spent,
  }))

  const months = React.useMemo(
    () =>
      [
        ...new Set([
          ...resolveAdMonths(
            {
              startDate:
                toDateInputValue(project.contract_start_date) ||
                toDateInputValue(project.start_date) ||
                toDateInputValue(project.offer_date) ||
                null,
              endDate: toDateInputValue(project.planned_deadline) || null,
            },
            adBudgets.map((row) => row.month)
          ),
          ...addedMonths,
        ]),
      ].sort(),
    [project, adBudgets, addedMonths]
  )

  const platforms = React.useMemo(
    () => getAdPlatforms(project.type, adBudgets.map((row) => row.platform)),
    [project.type, adBudgets]
  )
  const table = React.useMemo(() => buildAdBudgetTable(entries, months), [entries, months])
  const remaining = Math.round((table.totals.planned - table.totals.spent) * 100) / 100

  const addMonth = () => {
    if (!isMonthKey(monthToAdd)) return
    setAddedMonths((current) => (current.includes(monthToAdd) ? current : [...current, monthToAdd]))
    setMonthToAdd("")
  }

  const current = table.rows.find((row) => row.month === monthOf(new Date().toISOString()))

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Planirano ukupno" value={money(table.totals.planned)} hint="Svi prikazani mjeseci" />
        <Stat label="Potrošeno ukupno" value={money(table.totals.spent)} hint="Stvarna potrošnja na platformama" />
        <Stat
          label="Preostalo"
          value={money(remaining)}
          tone={remaining < 0 ? "text-destructive" : "text-emerald-700 dark:text-emerald-400"}
          hint={remaining < 0 ? "Potrošnja je iznad plana" : "Plan minus potrošnja"}
        />
        <Stat
          label="Tekući mjesec"
          value={current ? `${money(current.spent)} / ${money(current.planned)}` : "—"}
          tone={current?.overspent ? "text-destructive" : undefined}
          hint={platforms.map((platform) => `${PLATFORM_NAMES[platform]} ${money(current?.platforms[platform].spent ?? 0)}`).join(" · ")}
        />
      </div>

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold">Oglasni budžet po mjesecima</h3>
            <p className="text-xs text-muted-foreground">
              Novac koji klijent sam troši na oglase. Ne ulazi u vrijednost projekta ni u vaš prihod.
              {canManage && ` Upišite plan i potrošnju u ${currency === "EUR" ? "eurima" : "KM"}, sprema se čim napustite polje.`}
            </p>
            <p className="text-[11px] text-muted-foreground">Kurs: 1 € = {KM_PER_EUR.toString().replace(".", ",")} KM (fiksni).</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-full border border-border bg-card p-1" role="group" aria-label="Valuta prikaza i unosa">
              {CURRENCIES.map((option) => (
                <Button
                  key={option}
                  size="sm"
                  variant={currency === option ? "default" : "ghost"}
                  onClick={() => setCurrency(option)}
                  aria-pressed={currency === option}
                  className={cn("h-7 cursor-pointer px-3 text-xs")}
                >
                  {option === "EUR" ? "€ EUR" : "KM"}
                </Button>
              ))}
            </div>

            {canManage && (
              <>
                <Input
                  type="month"
                  value={monthToAdd}
                  onChange={(event) => setMonthToAdd(event.target.value)}
                  className="h-9 w-44"
                  aria-label="Mjesec koji se dodaje"
                />
                <Button size="sm" variant="outline" onClick={addMonth} disabled={!isMonthKey(monthToAdd)} className="cursor-pointer gap-1.5">
                  <RiAddLine className="size-4" />
                  Dodaj mjesec
                </Button>
              </>
            )}
          </div>
        </div>

        <AdBudgetTableView
          projectId={project.$id}
          table={table}
          platforms={platforms}
          currency={currency}
          canManage={canManage}
          onChanged={onChanged}
        />
      </section>
    </div>
  )
}
