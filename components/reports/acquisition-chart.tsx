"use client"

import * as React from "react"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { RiLineChartLine } from "@remixicon/react"
import type { AcquisitionDay } from "@/lib/appwrite/reports"

interface AcquisitionChartProps {
  data: AcquisitionDay[]
  period: "7d" | "30d" | "year"
}

export function AcquisitionChart({ data, period }: AcquisitionChartProps) {
  const getPeriodLabel = () => {
    switch (period) {
      case "year":
        return "Trenutna godina po sedmicama"
      case "30d":
        return "Posljednjih 30 dana"
      default:
        return "Posljednjih 7 dana"
    }
  }

  return (
    <Card className="border-border bg-card shadow-xs flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-foreground">
          Akvizicija Leadova ({getPeriodLabel()})
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col justify-end pb-4 pt-1">
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{
                top: 15,
                right: 15,
                left: -20,
                bottom: period === "7d" ? 0 : 15,
              }}
            >
              <defs>
                <linearGradient id="colorLeadsBlue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="colorContactedGreen" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border/40" />

              <XAxis
                dataKey="dayName"
                stroke="#888888"
                fontSize={period === "7d" ? 11 : 10}
                tickLine={false}
                axisLine={false}
                angle={period === "7d" ? 0 : -60}
                textAnchor={period === "7d" ? "middle" : "end"}
                height={period === "7d" ? 30 : 45}
                dy={period === "7d" ? 8 : 2}
                interval={period === "year" && data.length > 25 ? 1 : 0}
              />

              <YAxis
                stroke="#888888"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />

              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const fullDateLabel = payload[0]?.payload?.date || label
                    const contactedVal = payload.find((p) => p.dataKey === "kontaktirano")?.value || 0
                    const leadsVal = payload.find((p) => p.dataKey === "noviLeadovi")?.value || 0

                    return (
                      <div className="rounded-xl border border-border bg-popover/95 backdrop-blur-md p-3 shadow-lg text-xs space-y-1.5 min-w-[170px]">
                        <p className="font-semibold text-popover-foreground">{fullDateLabel}</p>
                        <div className="flex items-center justify-between gap-4 text-emerald-500 font-medium">
                          <span>Kontaktirano:</span>
                          <span className="font-bold font-mono">{contactedVal}</span>
                        </div>
                        <div className="flex items-center justify-between gap-4 text-blue-500 font-medium">
                          <span>Novi Leadovi:</span>
                          <span className="font-bold font-mono">{leadsVal}</span>
                        </div>
                      </div>
                    )
                  }
                  return null
                }}
              />

              {/* Plavi sloj: Novi Leadovi */}
              <Area
                type="monotone"
                dataKey="noviLeadovi"
                stroke="#3b82f6"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#colorLeadsBlue)"
                name="Novi Leadovi"
                dot={{ r: 3, fill: "#3b82f6", strokeWidth: 1.5, stroke: "#fff" }}
                activeDot={{ r: 5 }}
              />

              {/* Zeleni sloj: Kontaktirano */}
              <Area
                type="monotone"
                dataKey="kontaktirano"
                stroke="#10b981"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#colorContactedGreen)"
                name="Kontaktirano"
                dot={{ r: 3, fill: "#10b981", strokeWidth: 1.5, stroke: "#fff" }}
                activeDot={{ r: 5 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Legend at Bottom Center matching prototype */}
        <div className="flex items-center justify-center gap-6 text-xs pt-3 border-t border-border/40 mt-1">
          <div className="flex items-center gap-2 font-medium text-foreground">
            <span className="size-3 rounded-full bg-[#10b981]" />
            <span>Kontaktirano</span>
          </div>
          <div className="flex items-center gap-2 font-medium text-foreground">
            <span className="size-3 rounded-full bg-[#3b82f6]" />
            <span>Novi Leadovi</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
