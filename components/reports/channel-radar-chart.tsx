"use client"

import * as React from "react"
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { RiRadarLine } from "@remixicon/react"
import type { ChannelStatusBreakdown } from "@/lib/appwrite/reports"

interface ChannelRadarChartProps {
  email: ChannelStatusBreakdown
  whatsapp: ChannelStatusBreakdown
}

function pct(part: number, total: number): number {
  return total > 0 ? Math.round((part / total) * 100) : 0
}

export function ChannelRadarChart({ email, whatsapp }: ChannelRadarChartProps) {
  const maxVolume = Math.max(email.total, whatsapp.total, 1)

  const data = [
    {
      axis: "Stopa odgovora",
      Email: pct(email.odgovoreno, email.total),
      WhatsApp: pct(whatsapp.odgovoreno, whatsapp.total),
    },
    {
      axis: "Otvorenost",
      Email: pct(email.otvoreno, email.total),
      WhatsApp: pct(whatsapp.otvoreno, whatsapp.total),
    },
    {
      axis: "Bez grešaka",
      Email: 100 - pct(email.greska, email.total),
      WhatsApp: 100 - pct(whatsapp.greska, whatsapp.total),
    },
    {
      axis: "Obim poruka",
      Email: Math.round((email.total / maxVolume) * 100),
      WhatsApp: Math.round((whatsapp.total / maxVolume) * 100),
    },
  ]

  const hasAnyData = email.total > 0 || whatsapp.total > 0

  return (
    <Card className="border-border bg-card shadow-xs flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <RiRadarLine className="size-4 text-primary" />
          Poređenje kanala: Email vs WhatsApp
        </CardTitle>
        <CardDescription className="text-xs leading-relaxed">
          Odziv, otvorenost i pouzdanost svakog kanala, jedan naspram drugog.
        </CardDescription>
      </CardHeader>

      <CardContent className="flex-1 pt-2 flex items-center justify-center">
        {!hasAnyData ? (
          <p className="text-xs text-muted-foreground py-8 text-center">Nema još podataka za poređenje kanala.</p>
        ) : (
          <div className="h-full min-h-[380px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={data} outerRadius="82%" margin={{ top: 30, bottom: 15, left: 30, right: 30 }}>
                <PolarGrid stroke="var(--border)" />
                <PolarAngleAxis dataKey="axis" tick={{ fontSize: 13, fill: "var(--foreground)", fontWeight: 500 }} />
                <PolarRadiusAxis angle={45} domain={[0, 100]} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
                <Radar name="Email" dataKey="Email" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.35} strokeWidth={2} />
                <Radar name="WhatsApp" dataKey="WhatsApp" stroke="#10b981" fill="#10b981" fillOpacity={0.35} strokeWidth={2} />
                <Legend wrapperStyle={{ fontSize: 13, paddingTop: 12 }} />
                <Tooltip
                  formatter={(value) => `${value}%`}
                  contentStyle={{
                    borderRadius: "0.75rem",
                    border: "1px solid var(--border)",
                    background: "var(--popover)",
                    fontSize: 12,
                  }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
