"use client"

import * as React from "react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { Meeting } from "@/lib/appwrite/meetings"
import { formatDate, formatTime } from "@/lib/utils"
import {
  RiTimeLine,
  RiArrowRightLine,
  RiCheckDoubleLine,
  RiCalendarEventLine,
} from "@remixicon/react"
import Link from "next/link"

interface DashboardMeetingRemindersProps {
  reminders: Meeting[]
}

export function DashboardMeetingReminders({ reminders }: DashboardMeetingRemindersProps) {
  return (
    <Card className="border-border bg-card shadow-xs">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div className="space-y-1">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <RiTimeLine className="size-4 text-violet-500" />
            Podsjetnici: Na čekanju ({reminders.length})
          </CardTitle>
          <CardDescription className="text-xs">
            Sastanci koji čekaju potvrdu klijenta, a za koje je stiglo vrijeme podsjetnika.
          </CardDescription>
        </div>

        <Link
          href="/meetings"
          className="text-xs text-primary hover:underline flex items-center gap-1 font-medium"
        >
          Svi sastanci <RiArrowRightLine className="size-3" />
        </Link>
      </CardHeader>

      <CardContent className="space-y-3 pt-2">
        {reminders.length === 0 ? (
          <div className="p-8 rounded-xl border border-dashed border-border bg-muted/20 text-center space-y-1.5">
            <RiCheckDoubleLine className="size-7 mx-auto text-emerald-500" />
            <p className="text-xs font-semibold text-foreground">Sve je pod kontrolom!</p>
            <p className="text-[11px] text-muted-foreground">
              Trenutno nema dospjelih podsjetnika za sastanke na čekanju.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
            {reminders.map((meeting) => {
              const companyName = meeting.company_name || "Nepoznata firma"
              const reminderDate = meeting.reminder_at ? formatDate(meeting.reminder_at) : ""
              const reminderTime = meeting.reminder_at ? formatTime(meeting.reminder_at) : ""
              
              return (
                <div
                  key={meeting.$id}
                  className="p-3 rounded-xl border border-dashed border-violet-200 bg-violet-50/50 dark:bg-violet-950/20 dark:border-violet-800 space-y-2 text-xs hover:border-violet-400 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <RiCalendarEventLine className="size-3.5 text-violet-500" />
                        <span className="font-semibold text-foreground truncate">
                          {companyName}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {meeting.title}
                      </p>
                    </div>

                    <Badge
                      variant="outline"
                      className="text-[10px] shrink-0 bg-violet-500/10 text-violet-600 border-violet-500/20 gap-1 font-mono"
                      suppressHydrationWarning
                    >
                      <RiTimeLine className="size-3" />
                      {reminderDate} {reminderTime}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-violet-200/50 dark:border-violet-800/50">
                    <span className="text-[11px] text-muted-foreground">
                      Status: <span className="font-medium text-violet-600 dark:text-violet-400">Na čekanju</span>
                    </span>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <Link
                        href="/meetings"
                        className="inline-flex items-center px-2 py-1 rounded-lg bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 hover:bg-violet-200 dark:hover:bg-violet-800/60 text-[11px] transition-colors"
                      >
                        Otvori sastanke
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
