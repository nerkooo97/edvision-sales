"use client"

import * as React from "react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import type { DashboardStats } from "@/lib/appwrite/stats"
import Link from "next/link"
import { RiKanbanView, RiArrowRightLine } from "@remixicon/react"

interface DashboardPipelineChartProps {
  stats: DashboardStats
}

const STAGES = [
  { key: "Novi", label: "1. Novi", color: "bg-blue-500", text: "text-blue-500" },
  { key: "Kontaktiran", label: "2. Kontaktiran", color: "bg-amber-500", text: "text-amber-500" },
  { key: "Kvalifikovan", label: "3. Kvalifikovan", color: "bg-purple-500", text: "text-purple-500" },
  { key: "U pregovorima", label: "4. U pregovorima", color: "bg-indigo-500", text: "text-indigo-500" },
  { key: "Zaključeno - Dobijeno", label: "5. Dobijeno", color: "bg-emerald-500", text: "text-emerald-500" },
  { key: "Odbijeno", label: "Odbijeno", color: "bg-rose-500", text: "text-rose-500" },
  { key: "Ne javlja se", label: "Ne javlja se", color: "bg-zinc-400", text: "text-zinc-400" },
]

export function DashboardPipelineChart({ stats }: DashboardPipelineChartProps) {
  const total = stats.totalLeads || 1

  return (
    <Card className="border-border bg-card shadow-xs">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div className="space-y-1">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <RiKanbanView className="size-4 text-primary" />
            Prodajni Lijevak (Pipeline po fazama)
          </CardTitle>
          <CardDescription className="text-xs">
            Distribucija svih leadova kroz prodajne statuse.
          </CardDescription>
        </div>

        <Link
          href="/leads?view=kanban"
          className="text-xs text-primary hover:underline flex items-center gap-1 font-medium"
        >
          Scrum Board <RiArrowRightLine className="size-3" />
        </Link>
      </CardHeader>

      <CardContent className="space-y-3.5 pt-2">
        {STAGES.map((stage) => {
          const count = stats.statusBreakdown[stage.key] || 0
          const percentage = Math.round((count / total) * 100)

          return (
            <div key={stage.key} className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-medium text-foreground flex items-center gap-2">
                  <span className={`size-2 rounded-full ${stage.color}`} />
                  {stage.label}
                </span>
                <span className="text-muted-foreground font-mono">
                  <span className="font-semibold text-foreground">{count}</span> ({percentage}%)
                </span>
              </div>

              {/* Progress bar */}
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${stage.color}`}
                  style={{ width: `${Math.max(percentage > 0 ? 4 : 0, percentage)}%` }}
                />
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
