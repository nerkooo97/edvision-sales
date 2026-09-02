"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { RiTimeLine } from "@remixicon/react"
import type { MeetingStatus } from "@/lib/appwrite/meetings"

interface MeetingStatusBadgeProps {
  status: MeetingStatus | string
  className?: string
  size?: "sm" | "md"
}

const statusConfig: Record<string, { label: string; className: string; dashed?: boolean }> = {
  Zakazan: {
    label: "Zakazan",
    className: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800",
  },
  "Potvrđen": {
    label: "Potvrđen",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
  },
  "Završen": {
    label: "Završen",
    className: "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900/40 dark:text-slate-300 dark:border-slate-700",
  },
  Otkazan: {
    label: "Otkazan",
    className: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800",
  },
  "Odgođen": {
    label: "Odgođen",
    className: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
  },
  "Na čekanju": {
    label: "Na čekanju",
    className: "bg-violet-50 text-violet-700 border-violet-300 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-700",
    dashed: true,
  },
}

export function MeetingStatusBadge({ status, className, size = "md" }: MeetingStatusBadgeProps) {
  const config = statusConfig[status] ?? {
    label: status,
    className: "bg-muted text-muted-foreground border-border",
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-semibold tracking-wide transition-colors",
        config.dashed ? "border border-dashed" : "border",
        size === "sm" ? "px-2.5 py-0.5 text-xs" : "px-3 py-1 text-xs",
        config.className,
        className
      )}
    >
      {status === "Na čekanju" && <RiTimeLine className="size-3 shrink-0" />}
      {config.label}
    </span>
  )
}
