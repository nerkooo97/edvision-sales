"use client"

import * as React from "react"
import { usePathname, useRouter } from "next/navigation"
import { RiCloseLine, RiLoader4Line } from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  DEFAULT_PERIOD_BASIS,
  MONTH_NAMES,
  PERIOD_BASES,
  PERIOD_BASIS_LABELS,
  isPeriodFiltered,
  type PeriodBasis,
  type ReportPeriod,
} from "@/lib/hub/report-period"

const ALL = "all"

interface ReportsFilterProps {
  period: ReportPeriod
  years: number[]
}

/** Year, month and the date they apply to. The choice lives in the URL, so a filtered report can be shared. */
export function ReportsFilter({ period, years }: ReportsFilterProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [isPending, startTransition] = React.useTransition()

  const apply = (next: ReportPeriod) => {
    const params = new URLSearchParams()
    if (next.year !== null) {
      params.set("year", String(next.year))
      if (next.month !== null) params.set("month", String(next.month))
    }
    if (next.basis !== DEFAULT_PERIOD_BASIS) params.set("basis", next.basis)
    const query = params.toString()
    startTransition(() => router.replace(query ? `${pathname}?${query}` : pathname))
  }

  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="space-y-1">
        <span className="block text-[11px] text-muted-foreground">Godina</span>
        <Select
          value={period.year === null ? ALL : String(period.year)}
          onValueChange={(value) =>
            // Without a year there is no month, so the month is dropped together with it.
            apply({ ...period, year: value === ALL ? null : Number(value), month: value === ALL ? null : period.month })
          }
        >
          <SelectTrigger size="sm" className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Sve godine</SelectItem>
            {years.map((year) => (
              <SelectItem key={year} value={String(year)}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <span className="block text-[11px] text-muted-foreground">Mjesec</span>
        <Select
          value={period.month === null ? ALL : String(period.month)}
          disabled={period.year === null}
          onValueChange={(value) => apply({ ...period, month: value === ALL ? null : Number(value) })}
        >
          <SelectTrigger size="sm" className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Svi mjeseci</SelectItem>
            {MONTH_NAMES.map((name, index) => (
              <SelectItem key={name} value={String(index + 1)}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <span className="block text-[11px] text-muted-foreground">Po datumu</span>
        <Select value={period.basis} onValueChange={(value) => apply({ ...period, basis: value as PeriodBasis })}>
          <SelectTrigger size="sm" className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PERIOD_BASES.map((basis) => (
              <SelectItem key={basis} value={basis}>
                {PERIOD_BASIS_LABELS[basis]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isPending && <RiLoader4Line className="mb-2 size-4 animate-spin text-muted-foreground" />}
      {isPeriodFiltered(period) && (
        <Button
          variant="ghost"
          size="sm"
          className="cursor-pointer gap-1 text-muted-foreground"
          onClick={() => apply({ basis: period.basis, year: null, month: null })}
        >
          <RiCloseLine className="size-4" />
          Poništi
        </Button>
      )}
    </div>
  )
}
