"use client"

import * as React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  RiBuilding2Line,
  RiUserSearchLine,
  RiHistoryLine,
  RiTrophyLine,
  RiArrowRightUpLine,
  RiFireLine,
} from "@remixicon/react"
import type { DashboardStats } from "@/lib/appwrite/stats"
import Link from "next/link"

interface DashboardKpiCardsProps {
  stats: DashboardStats
}

export function DashboardKpiCards({ stats }: DashboardKpiCardsProps) {
  const activeLeads =
    (stats.statusBreakdown["Novi"] || 0) +
    (stats.statusBreakdown["Kontaktiran"] || 0) +
    (stats.statusBreakdown["Kvalifikovan"] || 0) +
    (stats.statusBreakdown["U pregovorima"] || 0)

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 px-4 lg:px-6">
      {/* 1. Kompanije */}
      <Card className="p-5 border-border bg-card shadow-xs hover:border-primary/40 transition-colors">
        <div className="flex items-center justify-between">
          <div className="size-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <RiBuilding2Line className="size-5" />
          </div>
          <Link
            href="/companies"
            className="text-xs text-muted-foreground hover:text-primary flex items-center gap-0.5"
          >
            Pregled <RiArrowRightUpLine className="size-3.5" />
          </Link>
        </div>

        <div className="mt-4 space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Evidentirane firme</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl font-bold tracking-tight text-foreground">
              {stats.totalCompanies}
            </h3>
            <span className="text-xs text-muted-foreground">baza klijenata</span>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-border/50 text-[11px] text-muted-foreground flex items-center justify-between">
          <span>Potencijal tržišta</span>
          <span className="font-medium text-foreground">BiH / Region</span>
        </div>
      </Card>

      {/* 2. Aktivni Leadovi */}
      <Card className="p-5 border-border bg-card shadow-xs hover:border-primary/40 transition-colors">
        <div className="flex items-center justify-between">
          <div className="size-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
            <RiUserSearchLine className="size-5" />
          </div>
          <Badge variant="secondary" className="text-[10px] gap-1 bg-purple-500/10 text-purple-600 border-purple-500/20">
            <RiFireLine className="size-3" /> {activeLeads} u toku
          </Badge>
        </div>

        <div className="mt-4 space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Ukupno Leadova</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl font-bold tracking-tight text-foreground">
              {stats.totalLeads}
            </h3>
            <span className="text-xs text-muted-foreground">
              ({stats.statusBreakdown["U pregovorima"] || 0} u pregovorima)
            </span>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-border/50 text-[11px] text-muted-foreground flex items-center justify-between">
          <Link href="/leads?view=kanban" className="text-primary hover:underline flex items-center gap-0.5">
            Otvori Scrum Board <RiArrowRightUpLine className="size-3" />
          </Link>
          <span className="font-medium text-foreground">{stats.statusBreakdown["Novi"] || 0} novih</span>
        </div>
      </Card>

      {/* 3. Obavljeni Kontakti */}
      <Card className="p-5 border-border bg-card shadow-xs hover:border-primary/40 transition-colors">
        <div className="flex items-center justify-between">
          <div className="size-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <RiHistoryLine className="size-5" />
          </div>
          <Link
            href="/contact-logs"
            className="text-xs text-muted-foreground hover:text-primary flex items-center gap-0.5"
          >
            Dnevnik <RiArrowRightUpLine className="size-3.5" />
          </Link>
        </div>

        <div className="mt-4 space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Ukupno kontakata</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl font-bold tracking-tight text-foreground">
              {stats.totalContacts}
            </h3>
            <span className="text-xs text-muted-foreground">interakcija</span>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-border/50 text-[11px] text-muted-foreground flex items-center justify-between">
          <span>Email: {stats.channelBreakdown["Email"] || 0}</span>
          <span>Tel: {stats.channelBreakdown["Telefon"] || 0}</span>
          <span>WA: {stats.channelBreakdown["WhatsApp"] || 0}</span>
        </div>
      </Card>

      {/* 4. Zaključeni poslovi & Konverzija */}
      <Card className="p-5 border-border bg-card shadow-xs hover:border-primary/40 transition-colors">
        <div className="flex items-center justify-between">
          <div className="size-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <RiTrophyLine className="size-5" />
          </div>
          <Badge variant="default" className="text-[10px] bg-emerald-600 text-white hover:bg-emerald-700">
            {stats.conversionRate}% konverzija
          </Badge>
        </div>

        <div className="mt-4 space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Dobijeni poslovi</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
              {stats.wonDeals}
            </h3>
            <span className="text-xs text-muted-foreground">zaključeno</span>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-border/50 text-[11px] text-muted-foreground flex items-center justify-between">
          <span>Odbijeno: {stats.statusBreakdown["Odbijeno"] || 0}</span>
          <span className="font-medium text-emerald-600">ED Vision Sales</span>
        </div>
      </Card>
    </div>
  )
}
