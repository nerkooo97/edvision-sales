"use client"

import * as React from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  RiPhoneLine,
  RiTimeLine,
  RiCheckDoubleLine,
  RiAlertLine,
  RiCalendarEventLine,
  RiGlobalLine,
  RiUserVoiceLine,
  RiBuilding2Line,
  RiFireLine,
  RiMailSendLine,
  RiShakeHandsLine,
} from "@remixicon/react"
import type { CallItem } from "@/lib/appwrite/calls"
import { formatDateTime } from "@/lib/utils"

interface CallCardProps {
  call: CallItem
  onComplete: (call: CallItem) => void
  onReschedule: (call: CallItem) => void
}

export function CallCard({ call, onComplete, onReschedule }: CallCardProps) {
  const getCallTypeBadge = () => {
    switch (call.callType) {
      case "hot_lead":
        return (
          <Badge
            variant="outline"
            className="text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/30 text-[11px] font-semibold inline-flex items-center gap-1"
          >
            <RiFireLine className="size-3 text-emerald-600 dark:text-emerald-400" />
            <span>Hot lead (Odgovorio)</span>
          </Badge>
        )
      case "in_negotiation":
        return (
          <Badge
            variant="outline"
            className="text-blue-700 dark:text-blue-400 bg-blue-500/10 border-blue-500/30 text-[11px] font-semibold inline-flex items-center gap-1"
          >
            <RiShakeHandsLine className="size-3 text-blue-600 dark:text-blue-400" />
            <span>U pregovorima</span>
          </Badge>
        )
      case "follow_up":
        return (
          <Badge
            variant="outline"
            className="text-amber-700 dark:text-amber-400 bg-amber-500/10 border-amber-500/30 text-[11px] font-medium inline-flex items-center gap-1"
          >
            <RiMailSendLine className="size-3 text-amber-600 dark:text-amber-400" />
            <span>Follow-up (Poslan email)</span>
          </Badge>
        )
      default:
        return (
          <Badge
            variant="outline"
            className="text-muted-foreground bg-muted/60 border-border text-[11px] font-medium inline-flex items-center gap-1"
          >
            <RiPhoneLine className="size-3 text-muted-foreground" />
            <span>Inicijalni poziv (AI Potencijal)</span>
          </Badge>
        )
    }
  }

  const getStatusBadge = () => {
    switch (call.status) {
      case "Zakazano":
        return (
          <Badge
            variant="outline"
            className="text-purple-600 bg-purple-500/10 border-purple-500/30 text-xs font-medium"
          >
            Zakazano
          </Badge>
        )
      case "Obavljeno":
        return (
          <Badge
            variant="outline"
            className="text-emerald-600 bg-emerald-500/10 border-emerald-500/30 text-xs font-medium"
          >
            Obavljeno ✓
          </Badge>
        )
      default:
        return (
          <Badge
            variant="outline"
            className="text-amber-600 bg-amber-500/10 border-amber-500/30 text-xs font-medium"
          >
            Čeka poziv
          </Badge>
        )
    }
  }

  const hasRealPhone = call.phone && call.phone !== "Nema broja"

  return (
    <Card className="p-5 border-border bg-card shadow-xs space-y-4 hover:border-primary/40 transition-colors">
      {/* Top Header: Company name, contact person, phone, status badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-foreground tracking-tight flex items-center gap-1.5">
              <RiBuilding2Line className="size-3.5 text-muted-foreground" />
              {call.companyName}
            </h3>
            {call.websiteUrl && (
              <a
                href={
                  call.websiteUrl.startsWith("http")
                    ? call.websiteUrl
                    : `https://${call.websiteUrl}`
                }
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary transition-colors"
                title="Otvori web stranicu"
              >
                <RiGlobalLine className="size-3.5" />
              </a>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
            <span>{call.contactPerson}</span>
            <span>•</span>
            {hasRealPhone ? (
              <a
                href={`tel:${call.phone.replace(/\s+/g, "")}`}
                className="font-mono text-primary font-semibold hover:underline flex items-center gap-1"
              >
                <RiPhoneLine className="size-3" />
                {call.phone}
              </a>
            ) : (
              <span className="text-muted-foreground/60 italic">Nema unesenog telefona</span>
            )}
            <span>•</span>
            <span>{call.city}</span>
          </div>
        </div>

        <div className="self-start sm:self-auto flex items-center gap-2 flex-wrap">
          {getCallTypeBadge()}
          {getStatusBadge()}
        </div>
      </div>

      {/* Subtle Context Box */}
      <div className="p-3.5 rounded-xl bg-muted/40 border border-border/60 border-l-4 border-l-primary/60 flex items-start gap-2.5 text-xs text-foreground">
        <RiUserVoiceLine className="size-4 text-primary shrink-0 mt-0.5" />
        <div className="space-y-2 w-full">
          <p className="font-medium leading-relaxed text-muted-foreground">{call.contextNote}</p>
          {call.analysisTags && call.analysisTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {call.analysisTags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 rounded-md bg-background/80 border border-border/80 text-[10px] font-medium text-muted-foreground"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Scheduled Time or Completed Time if present */}
      {call.scheduledAt && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
          <RiCalendarEventLine className="size-3.5 text-primary" />
          <span>Zakazano za: {formatDateTime(call.scheduledAt)}</span>
        </div>
      )}

      {/* Action Buttons */}
      <div className="pt-2 border-t border-border/50 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2.5">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onReschedule(call)}
          className="gap-1.5 text-xs cursor-pointer h-9"
        >
          <RiTimeLine className="size-3.5" />
          Odgodi poziv
        </Button>

        {hasRealPhone && (
          <Button
            asChild
            variant="secondary"
            size="sm"
            className="gap-1.5 text-xs h-9 bg-primary/10 text-primary hover:bg-primary/20 cursor-pointer"
          >
            <a href={`tel:${call.phone.replace(/\s+/g, "")}`}>
              <RiPhoneLine className="size-3.5" />
              Pozovi odmah
            </a>
          </Button>
        )}

        <Button
          type="button"
          size="sm"
          onClick={() => onComplete(call)}
          className="gap-1.5 text-xs cursor-pointer h-9 bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          <RiCheckDoubleLine className="size-3.5" />
          Završi i idi na ponudu
        </Button>
      </div>
    </Card>
  )
}
