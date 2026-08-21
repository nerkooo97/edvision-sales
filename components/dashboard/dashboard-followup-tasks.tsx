"use client"

import * as React from "react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { ContactLog } from "@/lib/appwrite/contact-logs"
import { getWhatsAppLink } from "@/lib/scoring"
import { formatDate } from "@/lib/utils"
import {
  RiCalendarEventLine,
  RiPhoneLine,
  RiWhatsappLine,
  RiMailLine,
  RiUserVoiceLine,
  RiTimeLine,
  RiArrowRightLine,
  RiCheckDoubleLine,
} from "@remixicon/react"
import Link from "next/link"

interface DashboardFollowupTasksProps {
  tasks: ContactLog[]
}

export function DashboardFollowupTasks({ tasks }: DashboardFollowupTasksProps) {
  const getChannelIcon = (channel?: string) => {
    switch (channel?.toLowerCase()) {
      case "telefon":
        return <RiPhoneLine className="size-3.5 text-emerald-500" />
      case "whatsapp":
        return <RiWhatsappLine className="size-3.5 text-green-500" />
      case "sastanak":
        return <RiUserVoiceLine className="size-3.5 text-purple-500" />
      default:
        return <RiMailLine className="size-3.5 text-primary" />
    }
  }

  return (
    <Card className="border-border bg-card shadow-xs">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div className="space-y-1">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <RiCalendarEventLine className="size-4 text-amber-500" />
            Današnji Follow-up Zadaci ({tasks.length})
          </CardTitle>
          <CardDescription className="text-xs">
            Planirani kontakti i dogovoreni pozivi koji dospijevaju danas ili ranije.
          </CardDescription>
        </div>

        <Link
          href="/contact-logs"
          className="text-xs text-primary hover:underline flex items-center gap-1 font-medium"
        >
          Svi kontakti <RiArrowRightLine className="size-3" />
        </Link>
      </CardHeader>

      <CardContent className="space-y-3 pt-2">
        {tasks.length === 0 ? (
          <div className="p-8 rounded-xl border border-dashed border-border bg-muted/20 text-center space-y-1.5">
            <RiCheckDoubleLine className="size-7 mx-auto text-emerald-500" />
            <p className="text-xs font-semibold text-foreground">Sve obaveze su završene!</p>
            <p className="text-[11px] text-muted-foreground">
              Trenutno nema zakazanih follow-up kontakata za danas.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
            {tasks.map((task) => {
              const companyName =
                typeof task.company === "object" && task.company
                  ? task.company.company_name
                  : "Firma"
              const phone =
                typeof task.company === "object" && task.company?.phones?.[0]
                  ? task.company.phones[0]
                  : ""

              const followUpDate = task.follow_up_date
                ? formatDate(task.follow_up_date)
                : "Danas"

              const whatsappUrl = phone ? getWhatsAppLink(phone, companyName) : ""

              return (
                <div
                  key={task.$id}
                  className="p-3 rounded-xl border border-border bg-muted/20 space-y-2 text-xs hover:border-primary/40 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-1.5">
                        {getChannelIcon(task.channel)}
                        <span className="font-semibold text-foreground truncate">
                          {companyName}
                        </span>
                      </div>
                      {task.subject && (
                        <p className="text-[11px] text-muted-foreground truncate">
                          {task.subject}
                        </p>
                      )}
                    </div>

                    <Badge
                      variant="outline"
                      className="text-[10px] shrink-0 bg-amber-500/10 text-amber-600 border-amber-500/20 gap-1 font-mono"
                      suppressHydrationWarning
                    >
                      <RiTimeLine className="size-3" />
                      {followUpDate}
                    </Badge>
                  </div>

                  {/* Action row with Click-to-Call and Click-to-WhatsApp */}
                  <div className="flex items-center justify-between pt-1 border-t border-border/40">
                    <span className="text-[11px] text-muted-foreground truncate">
                      {task.recipient ? `Za: ${task.recipient}` : phone ? `Tel: ${phone}` : "Potreban kontakt"}
                    </span>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {phone && (
                        <>
                          <a
                            href={`tel:${phone}`}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 text-[11px] font-medium transition-colors"
                            title="Pozovi telefonom"
                          >
                            <RiPhoneLine className="size-3" /> Pozovi
                          </a>

                          {whatsappUrl && (
                            <a
                              href={whatsappUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-green-500/10 text-green-600 dark:text-green-400 hover:bg-green-500/20 text-[11px] font-medium transition-colors"
                              title="Pošalji WhatsApp poruku"
                            >
                              <RiWhatsappLine className="size-3" /> WhatsApp
                            </a>
                          )}
                        </>
                      )}

                      <Link
                        href="/contact-logs"
                        className="inline-flex items-center px-2 py-1 rounded-lg border border-border bg-background hover:bg-muted text-[11px] transition-colors"
                      >
                        Otvori
                      </Link>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
