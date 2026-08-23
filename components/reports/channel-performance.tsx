"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  RiMailLine,
  RiWhatsappLine,
  RiPhoneLine,
  RiUserVoiceLine,
  RiMapPin2Line,
  RiPieChartLine,
} from "@remixicon/react"
import type { ChannelMetric, CityMetric } from "@/lib/appwrite/reports"

interface ChannelPerformanceProps {
  channels: ChannelMetric[]
  cities: CityMetric[]
  statusDistribution: { name: string; count: number; color: string }[]
}

export function ChannelPerformance({
  channels,
  cities,
  statusDistribution,
}: ChannelPerformanceProps) {
  const getChannelIcon = (ch: string) => {
    switch (ch.toLowerCase()) {
      case "whatsapp":
        return <RiWhatsappLine className="size-4 text-emerald-500" />
      case "telefon":
        return <RiPhoneLine className="size-4 text-purple-500" />
      case "sastanak":
        return <RiUserVoiceLine className="size-4 text-amber-500" />
      default:
        return <RiMailLine className="size-4 text-blue-500" />
    }
  }

  const totalStatusCount = Math.max(
    statusDistribution.reduce((acc, curr) => acc + curr.count, 0),
    1
  )

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* 1. Efikasnost po kanalima */}
      <Card className="border-border bg-card shadow-xs lg:col-span-2">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <RiUserVoiceLine className="size-4 text-primary" />
            Efikasnost komunikacionih kanala
          </CardTitle>
          <CardDescription className="text-xs">
            Stopa uspješnosti i odziva klijenata po vrsti kontakta.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {channels.map((ch) => (
              <div
                key={ch.channel}
                className="p-4 rounded-xl border border-border bg-muted/20 space-y-3 hover:border-primary/40 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-medium text-xs">
                    <div className="p-1.5 rounded-lg bg-background border border-border/60">
                      {getChannelIcon(ch.channel)}
                    </div>
                    <span className="font-semibold text-foreground text-sm">{ch.channel}</span>
                  </div>
                  <Badge variant="outline" className="text-xs font-mono font-bold">
                    {ch.rate}% odziv
                  </Badge>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Poslano / Pokušano</span>
                    <span className="font-semibold text-foreground font-mono">{ch.total}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Odgovoreno / Uspješno</span>
                    <span className="font-semibold text-emerald-600 font-mono">{ch.answered}</span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(ch.rate, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 2. Geografska pokrivenost (Top Gradovi) */}
      <Card className="border-border bg-card shadow-xs">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <RiMapPin2Line className="size-4 text-primary" />
            Geografska pokrivenost
          </CardTitle>
          <CardDescription className="text-xs">
            Distribucija baze kompanija po gradovima.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-3">
          {cities.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">Nema podataka o gradovima.</p>
          ) : (
            cities.map((city) => (
              <div key={city.city} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-foreground">{city.city}</span>
                  <div className="flex items-center gap-1.5 text-muted-foreground font-mono">
                    <span className="font-semibold text-foreground">{city.count}</span>
                    <span className="text-[10px]">({city.percentage}%)</span>
                  </div>
                </div>
                <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary/80 rounded-full transition-all duration-500"
                    style={{ width: `${city.percentage}%` }}
                  />
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
