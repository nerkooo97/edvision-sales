"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  RiCalendarEventLine,
  RiBuilding2Line,
  RiMapPinLine,
  RiTimeLine,
  RiMoreLine,
  RiEditLine,
  RiDeleteBinLine,
  RiCheckLine,
  RiAlertLine,
  RiAddLine,
  RiCarLine,
} from "@remixicon/react"
import { MeetingStatusBadge } from "./meeting-status-badge"
import { deleteMeeting, updateMeeting } from "@/lib/appwrite/meetings"
import type { Meeting } from "@/lib/appwrite/meetings"
import { cn, formatTime } from "@/lib/utils"

const DAY_NAMES_FULL = [
  "Nedjelja",
  "Ponedjeljak",
  "Utorak",
  "Srijeda",
  "Četvrtak",
  "Petak",
  "Subota",
]

const MONTH_NAMES_BS = [
  "januar",
  "februar",
  "mart",
  "april",
  "maj",
  "juni",
  "juli",
  "august",
  "septembar",
  "oktobar",
  "novembar",
  "decembar",
]

function formatFullDateBs(date: Date | null): string {
  if (!date) return ""
  const dayName = DAY_NAMES_FULL[date.getDay()]
  const day = date.getDate()
  const monthName = MONTH_NAMES_BS[date.getMonth()]
  const year = date.getFullYear()
  return `${dayName}, ${day}. ${monthName} ${year}.`
}

function formatMeetingsCount(count: number): string {
  if (count === 0) return "Nema zakazanih sastanaka"
  if (count % 10 === 1 && count % 100 !== 11) {
    return `${count} zakazan sastanak`
  }
  if ([2, 3, 4].includes(count % 10) && ![12, 13, 14].includes(count % 100)) {
    return `${count} zakazana sastanka`
  }
  return `${count} zakazanih sastanaka`
}

function formatDuration(min?: number) {
  if (!min) return "1h"
  if (min < 60) return `${min}min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m > 0 ? `${h}h ${m}min` : `${h}h`
}

interface DayMeetingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  date: Date | null
  meetings: Meeting[]
  onEditMeeting: (meeting: Meeting) => void
  onNewMeeting: (date: Date) => void
  onRefresh: () => void
}

export function DayMeetingsDialog({
  open,
  onOpenChange,
  date,
  meetings,
  onEditMeeting,
  onNewMeeting,
  onRefresh,
}: DayMeetingsDialogProps) {
  const [deleteTarget, setDeleteTarget] = React.useState<Meeting | null>(null)
  const [isDeleting, setIsDeleting] = React.useState(false)
  const [loadingStatus, setLoadingStatus] = React.useState<string | null>(null)

  const sortedMeetings = React.useMemo(() => {
    return [...meetings].sort(
      (a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
    )
  }, [meetings])

  const handleDelete = async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    const res = await deleteMeeting(deleteTarget.$id)
    setIsDeleting(false)
    setDeleteTarget(null)
    if (res.success) {
      onRefresh()
    }
  }

  const handleStatusChange = async (meeting: Meeting, newStatus: string) => {
    setLoadingStatus(meeting.$id)
    await updateMeeting(meeting.$id, { status: newStatus as Meeting["status"] })
    setLoadingStatus(null)
    onRefresh()
  }

  const handleAddClick = () => {
    if (date) {
      onOpenChange(false)
      onNewMeeting(date)
    }
  }

  const handleEditClick = (meeting: Meeting) => {
    onOpenChange(false)
    onEditMeeting(meeting)
  }

  if (!date) return null

  const formattedDateTitle = formatFullDateBs(date)
  const hasMeetings = sortedMeetings.length > 0

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
          {/* Header */}
          <DialogHeader className="p-5 pb-4 pr-16 border-b bg-muted/20">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="size-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                  <RiCalendarEventLine className="size-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <DialogTitle className="text-base sm:text-lg font-bold truncate">
                    {formattedDateTitle}
                  </DialogTitle>
                  <DialogDescription className="text-xs sm:text-sm mt-0.5">
                    {hasMeetings
                      ? formatMeetingsCount(sortedMeetings.length)
                      : "Pregled aktivnosti i rasporeda"}
                  </DialogDescription>
                </div>
              </div>

              {hasMeetings && (
                <Button
                  size="sm"
                  onClick={handleAddClick}
                  className="gap-1.5 h-9 text-xs sm:text-sm font-medium cursor-pointer shadow-xs shrink-0"
                >
                  <RiAddLine className="size-4" />
                  <span>Dodaj novi</span>
                </Button>
              )}
            </div>
          </DialogHeader>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4 max-h-[60vh]">
            {!hasMeetings ? (
              <div className="flex flex-col items-center justify-center text-center py-10 px-4 rounded-xl border border-dashed border-border bg-muted/15">
                <div className="size-14 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
                  <RiCalendarEventLine className="size-7 text-primary" />
                </div>
                <h3 className="text-base font-semibold text-foreground">
                  Nema ugovorenih sastanaka za ovaj dan
                </h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                  Za izabrani datum trenutno nema zabilježenih obaveza. Možete zakazati novi sastanak jednim klikom.
                </p>
                <Button
                  onClick={handleAddClick}
                  className="mt-5 gap-2 cursor-pointer shadow-xs"
                >
                  <RiAddLine className="size-4" />
                  <span>Zakaži sastanak za ovaj dan</span>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {sortedMeetings.map((meeting) => {
                  const isFinished = meeting.status === "Završen" || meeting.status === "Otkazan"
                  const isKancelarija = meeting.location_type === "Kancelarija"

                  return (
                    <div
                      key={meeting.$id}
                      className={cn(
                        "group relative rounded-xl border bg-card p-4 transition-all duration-200 hover:border-primary/40 hover:shadow-sm",
                        isFinished && "opacity-75 bg-muted/20"
                      )}
                    >
                      {/* Gornji red: Vrijeme, trajanje, status i akcije */}
                      <div className="flex items-center justify-between gap-3 border-b border-border/50 pb-3 mb-3">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          {/* Vrijeme */}
                          <div className="flex items-center gap-1.5 rounded-lg bg-primary/10 text-primary px-2.5 py-1 font-semibold text-sm">
                            <RiTimeLine className="size-4" />
                            <span>{formatTime(meeting.scheduled_at)}</span>
                          </div>

                          {/* Trajanje */}
                          <span className="text-xs text-muted-foreground font-medium bg-muted/50 border rounded-md px-2 py-0.5">
                            {formatDuration(meeting.duration_min)}
                          </span>

                          {/* Lokacija badge */}
                          <span
                            className={cn(
                              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium border",
                              isKancelarija
                                ? "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800"
                                : "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800"
                            )}
                          >
                            {isKancelarija ? (
                              <RiBuilding2Line className="size-3.5" />
                            ) : (
                              <RiCarLine className="size-3.5" />
                            )}
                            {isKancelarija ? "Kancelarija" : "Kod klijenta"}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {loadingStatus === meeting.$id ? (
                            <div className="h-6 w-20 animate-pulse rounded-full bg-muted" />
                          ) : (
                            <MeetingStatusBadge status={meeting.status} size="md" />
                          )}

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-8 cursor-pointer hover:bg-muted"
                              >
                                <RiMoreLine className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem
                                onClick={() => handleEditClick(meeting)}
                                className="gap-2 text-xs font-medium cursor-pointer"
                              >
                                <RiEditLine className="size-4" />
                                Izmijeni
                              </DropdownMenuItem>
                              {meeting.status !== "Potvrđen" && meeting.status !== "Završen" && (
                                <DropdownMenuItem
                                  onClick={() => handleStatusChange(meeting, "Potvrđen")}
                                  className="gap-2 text-xs font-medium text-emerald-600 focus:text-emerald-700 cursor-pointer"
                                >
                                  <RiCheckLine className="size-4" />
                                  Označi Potvrđen
                                </DropdownMenuItem>
                              )}
                              {meeting.status !== "Završen" && (
                                <DropdownMenuItem
                                  onClick={() => handleStatusChange(meeting, "Završen")}
                                  className="gap-2 text-xs font-medium cursor-pointer"
                                >
                                  <RiCheckLine className="size-4" />
                                  Označi Završen
                                </DropdownMenuItem>
                              )}
                              {meeting.status !== "Otkazan" && (
                                <DropdownMenuItem
                                  onClick={() => handleStatusChange(meeting, "Otkazan")}
                                  className="gap-2 text-xs font-medium text-amber-600 focus:text-amber-700 cursor-pointer"
                                >
                                  <RiAlertLine className="size-4" />
                                  Otkaži sastanak
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => setDeleteTarget(meeting)}
                                className="gap-2 text-xs font-medium text-destructive focus:text-destructive cursor-pointer"
                              >
                                <RiDeleteBinLine className="size-4" />
                                Obriši
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>

                      {/* Naslov sastanka i Kompanija */}
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <div className="size-7 rounded-md bg-muted/60 border border-border/50 flex items-center justify-center shrink-0">
                            <RiBuilding2Line className="size-4 text-muted-foreground" />
                          </div>
                          <span className="text-sm font-semibold text-foreground">
                            {meeting.company_name || "Nije dodijeljena firma"}
                          </span>
                        </div>

                        <h4 className="text-base font-semibold text-foreground tracking-tight pl-9">
                          {meeting.title}
                        </h4>
                      </div>

                      {/* Lokacija detalji */}
                      {meeting.location_note && (
                        <div className="mt-2.5 pl-9 flex items-center gap-1.5 text-xs text-muted-foreground">
                          <RiMapPinLine className="size-3.5 text-muted-foreground shrink-0" />
                          <span>{meeting.location_note}</span>
                        </div>
                      )}

                      {/* Bilješke */}
                      {meeting.notes && (
                        <div className="mt-3 pl-9">
                          <div className="rounded-lg bg-muted/40 border border-border/40 p-2.5 text-xs text-muted-foreground italic">
                            {meeting.notes}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <DialogFooter className="p-4 border-t bg-muted/10 sm:justify-between flex-row items-center">
            <span className="text-xs text-muted-foreground">
              {hasMeetings
                ? `Ukupno: ${formatMeetingsCount(sortedMeetings.length)}`
                : "Nema unosa za prikaz"}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="cursor-pointer"
            >
              Zatvori
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Brisanje sastanka</AlertDialogTitle>
            <AlertDialogDescription>
              Da li ste sigurni da želite obrisati sastanak{" "}
              <strong>{deleteTarget?.title}</strong>? Ova akcija se ne može poništiti.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Odustani</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Brisanje..." : "Obriši"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
