"use client"

import * as React from "react"
import { cn, formatDate, formatTime } from "@/lib/utils"
import {
  RiBuilding2Line,
  RiMapPinLine,
  RiTimeLine,
  RiMoreLine,
  RiEditLine,
  RiDeleteBinLine,
  RiCheckLine,
  RiCarLine,
} from "@remixicon/react"
import { MeetingStatusBadge } from "./meeting-status-badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { Meeting } from "@/lib/appwrite/meetings"

interface MeetingCardProps {
  meeting: Meeting
  compact?: boolean
  onEdit?: (meeting: Meeting) => void
  onDelete?: (meeting: Meeting) => void
  onStatusChange?: (meeting: Meeting, status: string) => void
  className?: string
}

function formatDuration(min?: number) {
  if (!min) return "1h"
  if (min < 60) return `${min}min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m > 0 ? `${h}h ${m}min` : `${h}h`
}

export function MeetingCard({ meeting, compact = false, onEdit, onDelete, onStatusChange, className }: MeetingCardProps) {
  const formattedDate = formatDate(meeting.scheduled_at)
  const formattedTime = formatTime(meeting.scheduled_at)
  const isKancelarija = meeting.location_type === "Kancelarija"
  const isPast = new Date(meeting.scheduled_at) < new Date()
  const isFinished = meeting.status === "Završen" || meeting.status === "Otkazan"

  return (
    <div
      className={cn(
        "group relative rounded-xl border bg-card p-4 transition-all duration-200",
        "hover:shadow-md hover:border-primary/30",
        isPast && !isFinished && "border-amber-200 bg-amber-50/30 dark:border-amber-900/50 dark:bg-amber-900/10",
        isFinished && "opacity-70",
        compact && "p-3",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className={cn(
            "font-semibold text-foreground truncate leading-tight",
            compact ? "text-sm" : "text-base"
          )}>
            {meeting.company_name || meeting.title}
          </h3>
          {meeting.company_name && (
            <p className="text-xs text-muted-foreground truncate mt-0.5 font-normal">
              {meeting.title}
            </p>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <MeetingStatusBadge status={meeting.status} />
          {(onEdit || onDelete || onStatusChange) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <RiMoreLine className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                {onEdit && (
                  <DropdownMenuItem onClick={() => onEdit(meeting)} className="gap-2 text-xs">
                    <RiEditLine className="size-3.5" />
                    Izmijeni
                  </DropdownMenuItem>
                )}
                {onStatusChange && meeting.status !== "Završen" && (
                  <>
                    <DropdownMenuItem
                      onClick={() => onStatusChange(meeting, "Potvrđen")}
                      className="gap-2 text-xs text-emerald-600 focus:text-emerald-700"
                    >
                      <RiCheckLine className="size-3.5" />
                      Označi kao Potvrđen
                    </DropdownMenuItem>
                    {meeting.status !== "Na čekanju" && (
                      <DropdownMenuItem
                        onClick={() => onStatusChange(meeting, "Na čekanju")}
                        className="gap-2 text-xs text-violet-600 focus:text-violet-700"
                      >
                        <RiTimeLine className="size-3.5" />
                        Označi kao Na čekanju
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      onClick={() => onStatusChange(meeting, "Završen")}
                      className="gap-2 text-xs"
                    >
                      <RiCheckLine className="size-3.5" />
                      Označi kao Završen
                    </DropdownMenuItem>
                  </>
                )}
                {onDelete && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => onDelete(meeting)}
                      className="gap-2 text-xs text-destructive focus:text-destructive"
                    >
                      <RiDeleteBinLine className="size-3.5" />
                      Obriši
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Time & Location */}
      <div className={cn("flex items-center gap-3 mt-3 flex-wrap", compact && "mt-2")}>
        {/* Datum i vrijeme */}
        <div className="flex items-center gap-1.5 rounded-lg bg-primary/8 px-2.5 py-1.5">
          <span className="text-xs font-semibold text-primary">{formattedTime}</span>
          <span className="text-[10px] text-muted-foreground font-mono">{formattedDate}</span>
        </div>

        {/* Trajanje */}
        <div className="flex items-center gap-1 text-muted-foreground">
          <RiTimeLine className="size-3" />
          <span className="text-xs">{formatDuration(meeting.duration_min)}</span>
        </div>

        {/* Lokacija */}
        <div className={cn(
          "flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium border",
          isKancelarija
            ? "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800"
            : "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800"
        )}>
          {isKancelarija ? <RiBuilding2Line className="size-3.5" /> : <RiCarLine className="size-3.5" />}
          {isKancelarija ? "Kancelarija" : "Kod klijenta"}
        </div>
      </div>

      {/* Location note */}
      {meeting.location_note && !compact && (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
          <RiMapPinLine className="size-3 shrink-0" />
          <span className="truncate">{meeting.location_note}</span>
        </div>
      )}

      {/* Notes */}
      {meeting.notes && !compact && (
        <p className="mt-1.5 text-xs text-muted-foreground line-clamp-2 italic">
          {meeting.notes}
        </p>
      )}
    </div>
  )
}
