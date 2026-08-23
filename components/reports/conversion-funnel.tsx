"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { RiFilter3Line } from "@remixicon/react"
import type { FunnelStep } from "@/lib/appwrite/reports"

interface ConversionFunnelProps {
  steps: FunnelStep[]
}

export function ConversionFunnel({ steps }: ConversionFunnelProps) {
  const maxCount = Math.max(...steps.map((s) => s.count), 1)

  return (
    <Card className="border-border bg-card shadow-xs">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div className="space-y-1">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <RiFilter3Line className="size-4 text-primary" />
            Lijevak konverzije (Cijeli proces)
          </CardTitle>
          <CardDescription className="text-xs">
            Pregled prolaznosti leadova kroz faze prodajnog toka.
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="space-y-3.5 pt-1">
        {steps.map((step, idx) => {
          // Calculate width percentage relative to maxCount (with minimum 6% width for visual clarity)
          const barWidth = Math.max(Math.round((step.count / maxCount) * 100), step.count > 0 ? 8 : 4)

          // Step colors with smooth gradient / tone
          const getBarColor = (index: number) => {
            switch (index) {
              case 0:
                return "bg-blue-500 hover:bg-blue-600"
              case 1:
                return "bg-sky-500 hover:bg-sky-600"
              case 2:
                return "bg-teal-500 hover:bg-teal-600"
              case 3:
                return "bg-purple-500 hover:bg-purple-600"
              case 4:
                return "bg-amber-500 hover:bg-amber-600"
              case 5:
                return "bg-emerald-600 hover:bg-emerald-700"
              default:
                return "bg-primary"
            }
          }

          return (
            <div key={step.name} className="space-y-1.5 group">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-foreground text-xs">{step.name}</span>
                  <span className="text-[11px] text-muted-foreground hidden sm:inline">
                    — {step.description}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-foreground font-mono">{step.count}</span>
                  <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-mono">
                    {step.percentage}%
                  </Badge>
                </div>
              </div>

              {/* Progress Bar Container */}
              <div className="w-full h-7 bg-muted/40 rounded-lg p-0.5 overflow-hidden border border-border/40">
                <div
                  className={`h-full rounded-md transition-all duration-700 flex items-center justify-end px-2 text-[10px] font-bold text-white shadow-xs ${getBarColor(
                    idx
                  )}`}
                  style={{ width: `${barWidth}%` }}
                >
                  {barWidth >= 15 && `${step.count}`}
                </div>
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
