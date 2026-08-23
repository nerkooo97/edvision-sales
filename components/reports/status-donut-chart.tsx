"use client"

import * as React from "react"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { RiPieChartLine } from "@remixicon/react"

interface StatusDonutChartProps {
  data: { name: string; count: number; color: string }[]
  totalLeads: number
}

export function StatusDonutChart({ data, totalLeads }: StatusDonutChartProps) {
  return (
    <Card className="border-border bg-card shadow-xs flex flex-col justify-between">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <RiPieChartLine className="size-4 text-primary" />
          Distribucija statusa leadova
        </CardTitle>
        <CardDescription className="text-xs">
          Udio leadova po fazama u prodajnom cjevovodu.
        </CardDescription>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col items-center justify-center pt-2">
        <div className="relative h-[200px] w-full flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const item = payload[0].payload
                    const pct = totalLeads > 0 ? Math.round((item.count / totalLeads) * 100) : 0
                    return (
                      <div className="rounded-xl border border-border bg-popover/95 backdrop-blur-md p-2.5 shadow-lg text-xs space-y-1">
                        <div className="flex items-center gap-2">
                          <span
                            className="size-2.5 rounded-full"
                            style={{ backgroundColor: item.color }}
                          />
                          <span className="font-semibold text-popover-foreground">{item.name}</span>
                        </div>
                        <div className="flex items-center justify-between gap-3 text-muted-foreground font-mono">
                          <span>{item.count} leadova</span>
                          <span className="font-bold text-foreground">({pct}%)</span>
                        </div>
                      </div>
                    )
                  }
                  return null
                }}
              />
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={80}
                paddingAngle={4}
                dataKey="count"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} stroke="transparent" />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>

          {/* Center Label */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-2xl font-bold tracking-tight font-mono text-foreground">
              {totalLeads}
            </span>
            <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">
              Leadova
            </span>
          </div>
        </div>

        {/* Legend Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 w-full pt-3 mt-2 border-t border-border/50 text-xs">
          {data.map((entry) => (
            <div key={entry.name} className="flex items-center gap-1.5 min-w-0">
              <span
                className="size-2 rounded-full shrink-0"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-muted-foreground truncate text-[11px]">{entry.name}</span>
              <span className="font-bold font-mono text-[11px] text-foreground ml-auto">
                {entry.count}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
