"use client"

import * as React from "react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { ContactLog } from "@/lib/appwrite/contact-logs"
import type { Lead } from "@/lib/appwrite/leads"
import { calculateLeadScore, getWhatsAppLink } from "@/lib/scoring"
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
} from "@remixicon/react"

interface DashboardActivityFeedProps {
  recentActivities: ContactLog[]
  recentLeads: Lead[]
}

export function DashboardActivityFeed({
  recentActivities,
  recentLeads,
}: DashboardActivityFeedProps) {
  const getChannelBadge = (ch?: string) => {
    switch (ch?.toLowerCase()) {
      case "telefon":
        return (
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 gap-1 text-[10px]">
            <RiPhoneLine className="size-3" /> Poziv
          </Badge>
        )
      case "whatsapp":
        return (
          <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30 gap-1 text-[10px]">
            <RiWhatsappLine className="size-3" /> WhatsApp
          </Badge>
        )
      case "sastanak":
        return (
          <Badge variant="outline" className="bg-purple-500/10 text-purple-600 border-purple-500/30 gap-1 text-[10px]">
            <RiUserVoiceLine className="size-3" /> Sastanak
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 gap-1 text-[10px]">
            <RiMailLine className="size-3" /> Email
          </Badge>
        )
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 px-4 lg:px-6">
      {/* 1. Zadnje aktivnosti iz dnevnika */}
      <Card className="border-border bg-card shadow-xs">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div className="space-y-1">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <RiPulseLine className="size-4 text-primary" />
              Zadnje Aktivnosti u Dnevniku
            </CardTitle>
            <CardDescription className="text-xs">
              Hronološki pregled obavljenih i poslatih komunikacija.
            </CardDescription>
          </div>

          <Link
            href="/contact-logs"
            className="text-xs text-primary hover:underline flex items-center gap-1 font-medium"
          >
            Pregled dnevnika <RiArrowRightLine className="size-3" />
          </Link>
        </CardHeader>

        <CardContent className="space-y-3 pt-2">
          {recentActivities.length === 0 ? (
            <p className="text-xs text-muted-foreground py-6 text-center">Nema zabilježenih aktivnosti.</p>
          ) : (
            <div className="space-y-2.5">
              {recentActivities.map((act) => {
                const companyName =
                  typeof act.company === "object" && act.company
                    ? act.company.company_name
                    : "Kompanija"

                const timeStr = act.contacted_at
                  ? new Date(act.contacted_at).toLocaleDateString("bs-BA", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : new Date(act.$createdAt).toLocaleDateString("bs-BA", {
                      day: "2-digit",
                      month: "2-digit",
                    })

                return (
                  <div
                    key={act.$id}
                    className="p-3 rounded-xl border border-border bg-muted/20 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        {getChannelBadge(act.channel)}
                        <span className="font-semibold text-foreground truncate">
                          {companyName}
                        </span>
                      </div>
                      {act.subject && (
                        <p className="text-[11px] text-muted-foreground truncate pl-1">
                          {act.subject}
                        </p>
                      )}
                    </div>

                    <div className="text-right shrink-0 space-y-1">
                      {act.outcome && (
                        <Badge variant="secondary" className="text-[10px]">
                          {act.outcome}
                        </Badge>
                      )}
                      <p className="text-[10px] font-mono text-muted-foreground">
                        {timeStr}
                      </p>
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
              Novi Leadovi & AI Bodovanje
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
                          <span className="font-mono">📞 {phone}</span>
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
