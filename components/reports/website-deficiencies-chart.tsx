"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { RiSparklingLine, RiAlertLine } from "@remixicon/react"
import type { WebsiteDeficiency } from "@/lib/appwrite/reports"

interface WebsiteDeficienciesChartProps {
  deficiencies: WebsiteDeficiency[]
}

export function WebsiteDeficienciesChart({ deficiencies }: WebsiteDeficienciesChartProps) {
  return (
    <Card className="border-border bg-card shadow-xs">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <RiSparklingLine className="size-4 text-primary" />
              AI Analiza: Najčešći problemi na web stranicama
            </CardTitle>
            <CardDescription className="text-xs">
              Uočeni tehnički i dizajnerski nedostaci kod analiziranih firmi (Pain Points za prodaju).
            </CardDescription>
          </div>
          <Badge variant="outline" className="text-primary bg-primary/10 border-primary/20 text-xs gap-1">
            <RiAlertLine className="size-3" /> Tržišni uvid
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 pt-1">
        {deficiencies.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">Nema unesenih parametara analize.</p>
        ) : (
          deficiencies.map((item, idx) => (
            <div key={item.name} className="space-y-1.5 group">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="size-5 rounded-md bg-muted flex items-center justify-center font-mono text-[10px] text-muted-foreground font-semibold">
                    0{idx + 1}
                  </span>
                  <span className="font-semibold text-foreground">{item.name}</span>
                </div>
                <div className="flex items-center gap-1.5 font-mono">
                  <span className="font-bold text-foreground">{item.count}</span>
                  <span className="text-[11px] text-muted-foreground">({item.percentage}%)</span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-2 bg-muted/50 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700 bg-linear-to-r from-amber-500 to-primary"
                  style={{ width: `${Math.max(item.percentage, 10)}%` }}
                />
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}
