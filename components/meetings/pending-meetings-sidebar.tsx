"use client"

import * as React from "react"
import { RiTimeLine, RiCalendarEventLine } from "@remixicon/react"
import { Badge } from "@/components/ui/badge"
import type { Meeting } from "@/lib/appwrite/meetings"
import { formatDate, formatTime } from "@/lib/utils"

interface PendingMeetingsSidebarProps {
  meetings: Meeting[]
  onEdit: (meeting: Meeting) => void
}

export function PendingMeetingsSidebar({ meetings, onEdit }: PendingMeetingsSidebarProps) {
  if (meetings.length === 0) return null

  return (
    <div className="flex flex-col h-full rounded-xl border bg-card">
      <div className="p-4 border-b">
        <h3 className="font-semibold flex items-center gap-2 text-sm">
          <RiTimeLine className="size-4 text-violet-500" />
          Popis na čekanju
        </h3>
        <p className="text-xs text-muted-foreground mt-1">
          Hronološki prikaz sastanaka koje trebaš dogovoriti.
        </p>
      </div>
      
      <div className="flex-1 overflow-y-auto p-3 space-y-2 max-h-[600px]">
        {meetings.map((meeting) => {
          const companyName = meeting.company_name || "Nepoznata firma"
          const reminderDate = meeting.reminder_at ? formatDate(meeting.reminder_at) : formatDate(meeting.scheduled_at)
          
          return (
            <div
              key={meeting.$id}
              onClick={() => onEdit(meeting)}
              className="p-3 rounded-lg border border-dashed border-violet-200 bg-violet-50/50 dark:bg-violet-950/20 dark:border-violet-800 space-y-2 text-xs hover:border-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/40 transition-colors cursor-pointer"
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
              </div>

              <div className="flex items-center justify-between pt-1">
                <Badge
                  variant="outline"
                  className="text-[10px] shrink-0 bg-violet-500/10 text-violet-600 border-violet-500/20 gap-1 font-mono"
                  suppressHydrationWarning
                >
                  <RiTimeLine className="size-3" />
                  Podsjetnik: {reminderDate}
                </Badge>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
