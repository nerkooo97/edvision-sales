"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import type { Company } from "@/lib/appwrite/companies"

interface OutreachStatusBadgeProps {
  status?: Company["outreach_status"]
  className?: string
}

const statusConfig: Record<string, { label: string; className: string }> = {
  pending: {
    label: "Na čekanju",
    className: "bg-muted text-muted-foreground border-border",
  },
  processing: {
    label: "U obradi",
    className: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800",
  },
  contacted: {
    label: "Kontaktirano",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
  },
  failed: {
    label: "Neuspješno",
    className: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800",
  },
  blocked: {
    label: "Blokirano",
    className: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800",
  },
  ineligible: {
    label: "Nije pogodno",
    className: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
  },
}

export function OutreachStatusBadge({ status, className }: OutreachStatusBadgeProps) {
  if (!status) {
    return <span className="text-muted-foreground/60 text-xs">—</span>
  }

  const config = statusConfig[status] ?? {
    label: status,
    className: "bg-muted text-muted-foreground border-border",
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border font-medium tracking-wide transition-colors px-2.5 py-0.5 text-[11px]",
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  )
}
