"use client"

import * as React from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { RiCalendarEventLine } from "@remixicon/react"

export function DashboardPeriodSelector() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const currentPeriod = searchParams.get("period") || "this_week"

  const handlePeriodChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value === "this_week") {
      params.delete("period") // Default is this week
    } else {
      params.set("period", value)
    }
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="flex items-center gap-2">
      <RiCalendarEventLine className="size-4 text-muted-foreground hidden sm:block" />
      <Select value={currentPeriod} onValueChange={handlePeriodChange}>
        <SelectTrigger className="w-[150px] sm:w-[180px] h-9 text-xs bg-card border-border shadow-xs">
          <SelectValue placeholder="Odaberi period" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="this_week" className="text-xs">Ova sedmica</SelectItem>
          <SelectItem value="this_month" className="text-xs">Ovaj mjesec</SelectItem>
          <SelectItem value="this_year" className="text-xs">Ova godina</SelectItem>
          <SelectItem value="all_time" className="text-xs">Sve vrijeme</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
