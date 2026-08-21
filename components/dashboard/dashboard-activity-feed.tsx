"use client"

import * as React from "react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { ContactLog } from "@/lib/appwrite/contact-logs"
import type { Lead } from "@/lib/appwrite/leads"
import { calculateLeadScore, getWhatsAppLink } from "@/lib/scoring"
import { formatDateTime, formatDate } from "@/lib/utils"
import Link from "next/link"
import {
  RiPulseLine,
  RiMailLine,
  RiPhoneLine,
  RiWhatsappLine,
  RiUserVoiceLine,
  RiTimeLine,
  RiArrowRightLine,
  RiUserAddLine,
  RiFireLine,
  RiFileTextLine,
  RiBuilding2Line,
} from "@remixicon/react"

interface DashboardActivityFeedProps {
  recentActivities: ContactLog[]
  recentLeads: Lead[]
}

function formatRelativeTime(dateString?: string): string {
  if (!dateString) return "nedavno"
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return "nedavno"
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)

  if (diffSec < 60) return "upravo sada"
  if (diffMin < 60) return `prije ${diffMin} min`
  if (diffHour === 1) return "prije oko 1 sat"
  if (diffHour < 5) return `prije oko ${diffHour} sata`
  if (diffHour < 24) return `prije oko ${diffHour} sati`
  if (diffDay === 1) return "prije 1 dan"
  if (diffDay < 5) return `prije ${diffDay} dana`
  if (diffDay < 30) return `prije ${diffDay} dana`
  return `prije ${Math.floor(diffDay / 30)} mj.`
}

function getActivityTitle(log: ContactLog): string {
  const channel = (log.channel || "").toLowerCase()
  const status = (log.status || "").toLowerCase()
  const outcome = (log.outcome || "").toLowerCase()

  if (channel.includes("whatsapp")) {
    return "WhatsApp poruka poslana"
  }
  if (channel.includes("telefon") || channel.includes("poziv")) {
    if (status.includes("zakazano")) return "Poziv zakazan"
    return "Telefonski poziv obavljen"
  }
  if (channel.includes("ponud")) {
    return "Ponuda poslana"
  }
  if (channel.includes("email") || channel.includes("mejl")) {
    if (outcome.includes("otvoren")) return "Email otvoren"
    if (outcome.includes("odgovor")) return "Email: Klijent odgovorio"
    return "Email poslan"
  }
  if (log.subject) return log.subject
  return "Komunikacija zabilježena"
}

export function DashboardActivityFeed({
  recentActivities,
  recentLeads,
}: DashboardActivityFeedProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 px-4 lg:px-6">
      {/* 1. Feed aktivnosti (Timeline stil) */}
      <Card className="border-border bg-card shadow-xs">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-base font-semibold text-foreground">
              Feed aktivnosti
            </CardTitle>
          </div>

          <Link
            href="/contact-logs"
            className="text-xs text-primary hover:underline flex items-center gap-1 font-medium"
          >
            Sve aktivnosti <RiArrowRightLine className="size-3" />
          </Link>
        </CardHeader>

        <CardContent className="pt-1 pb-4">
          {recentActivities.length === 0 ? (
            <p className="text-xs text-muted-foreground py-6 text-center">Nema zabilježenih aktivnosti.</p>
          ) : (
            <div className="relative space-y-0">
              {recentActivities.slice(0, 6).map((act, index) => {
                const isLast = index === Math.min(recentActivities.length, 6) - 1
                const companyName =
                  typeof act.company === "object" && act.company
                    ? act.company.company_name
                    : "Kompanija"
                const relativeTime = formatRelativeTime(act.contacted_at || act.$createdAt)
                const actionTitle = getActivityTitle(act)
                const channel = (act.channel || "").toLowerCase()

                let iconNode = <RiMailLine className="size-4 text-blue-600 dark:text-blue-400" />
                let circleBg = "bg-blue-500/10 border-blue-500/20"

                if (channel.includes("whatsapp")) {
                  iconNode = <RiWhatsappLine className="size-4 text-emerald-600 dark:text-emerald-400" />
                  circleBg = "bg-emerald-500/10 border-emerald-500/20"
                } else if (channel.includes("telefon") || channel.includes("poziv")) {
                  iconNode = <RiPhoneLine className="size-4 text-purple-600 dark:text-purple-400" />
                  circleBg = "bg-purple-500/10 border-purple-500/20"
                } else if (channel.includes("ponud")) {
                  iconNode = <RiFileTextLine className="size-4 text-amber-600 dark:text-amber-400" />
                  circleBg = "bg-amber-500/10 border-amber-500/20"
                } else if (channel.includes("sastanak")) {
                  iconNode = <RiUserVoiceLine className="size-4 text-indigo-600 dark:text-indigo-400" />
                  circleBg = "bg-indigo-500/10 border-indigo-500/20"
                }

                return (
                  <div key={act.$id} className="relative flex items-start gap-3.5 pb-4 last:pb-1 group">
                    {/* Vertical connecting line */}
                    {!isLast && (
                      <div className="absolute left-[15px] top-8 bottom-0 w-[1.5px] bg-border/60" />
                    )}

                    {/* Circular Icon */}
                    <div
                      className={`relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full border ${circleBg} transition-transform group-hover:scale-105`}
                    >
                      {iconNode}
                    </div>

                    {/* Content & Timestamp */}
                    <div className="flex flex-1 items-baseline justify-between gap-2 min-w-0 pt-0.5">
                      <div className="min-w-0 space-y-0.5">
                        <p className="text-xs font-semibold text-foreground tracking-tight truncate">
                          {actionTitle}
                        </p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {companyName}
                        </p>
                      </div>

                      <span
                        className="text-[11px] text-muted-foreground/80 shrink-0 font-normal"
                        suppressHydrationWarning
                      >
                        {relativeTime}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 2. Zadnje kvalifikovani leadovi sa AI Score-om */}
      <Card className="border-border bg-card shadow-xs">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div className="space-y-1">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <RiUserAddLine className="size-4 text-primary" />
              Novi Leadovi i AI Bodovanje
            </CardTitle>
            <CardDescription className="text-xs">
              Automatski rangirani leadovi po potencijalu.
            </CardDescription>
          </div>

          <Link
            href="/leads"
            className="text-xs text-primary hover:underline flex items-center gap-1 font-medium"
          >
            Svi leadovi <RiArrowRightLine className="size-3" />
          </Link>
        </CardHeader>

        <CardContent className="space-y-3 pt-2">
          {recentLeads.length === 0 ? (
            <p className="text-xs text-muted-foreground py-6 text-center">Nema unesenih leadova.</p>
          ) : (
            <div className="space-y-2.5">
              {recentLeads.map((lead) => {
                const company = typeof lead.company === "object" && lead.company ? lead.company : null
                const companyName = company?.company_name || "Lead"
                const scoreInfo = calculateLeadScore(lead, company)
                const phone = company?.phones?.[0] || ""
                const whatsappUrl = phone ? getWhatsAppLink(phone, companyName) : ""

                return (
                  <div
                    key={lead.$id}
                    className="p-3 rounded-xl border border-border bg-muted/20 flex items-center justify-between gap-3 text-xs hover:border-primary/40 transition-colors"
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground truncate">
                          {companyName}
                        </span>
                        <Badge variant="outline" className="text-[10px]">
                          {lead.status || "Novi"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                        <span>{company?.city || "BiH"}</span>
                        {phone && (
                          <span className="font-mono flex items-center gap-1">
                            <RiPhoneLine className="size-3 text-muted-foreground" />
                            {phone}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {/* AI Lead Score Badge */}
                      <Badge
                        variant={scoreInfo.tier === "hot" ? "default" : "secondary"}
                        className={`text-[10px] font-bold ${
                          scoreInfo.tier === "hot"
                            ? "bg-amber-600 hover:bg-amber-700 text-white"
                            : ""
                        }`}
                        title={scoreInfo.reasons.join(", ")}
                      >
                        {scoreInfo.label} ({scoreInfo.score})
                      </Badge>

                      {/* Quick WhatsApp */}
                      {whatsappUrl && (
                        <a
                          href={whatsappUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="size-7 rounded-lg bg-green-500/10 text-green-600 hover:bg-green-500/20 flex items-center justify-center transition-colors"
                          title="Pošalji WhatsApp"
                        >
                          <RiWhatsappLine className="size-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
