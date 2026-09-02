"use client"

import * as React from "react"
import {
  RiBuilding2Line,
  RiMapPinLine,
  RiTimeLine,
  RiMoreLine,
  RiEditLine,
  RiDeleteBinLine,
  RiAlertLine,
  RiCheckLine,
  RiCalendarEventLine,
  RiCarLine,
} from "@remixicon/react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
import { MeetingStatusBadge } from "./meeting-status-badge"
import { deleteMeeting, updateMeeting } from "@/lib/appwrite/meetings"
import type { Meeting } from "@/lib/appwrite/meetings"
import { cn, formatDate, formatTime } from "@/lib/utils"

interface MeetingsListProps {
  meetings: Meeting[]
  onEdit: (meeting: Meeting) => void
  onRefresh: () => void
}

function formatDuration(min?: number) {
  if (!min) return "1h"
  if (min < 60) return `${min}min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m > 0 ? `${h}h ${m}min` : `${h}h`
}

export function MeetingsList({ meetings, onEdit, onRefresh }: MeetingsListProps) {
  const [deleteTarget, setDeleteTarget] = React.useState<Meeting | null>(null)
  const [isDeleting, setIsDeleting] = React.useState(false)
  const [loadingStatus, setLoadingStatus] = React.useState<string | null>(null)

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

  if (meetings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/30 py-16 text-center">
        <div className="rounded-full bg-primary/10 p-4 mb-4">
          <RiCalendarEventLine className="size-8 text-primary" />
        </div>
        <h3 className="text-base font-semibold">Nema zakazanih sastanaka</h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-xs">
          Zakaži prvi sastanak klikom na dugme &quot;Zakaži sastanak&quot;.
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="rounded-xl border border-border bg-card overflow-hidden w-full max-w-full shadow-xs">
        <Table className="w-full">
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="font-semibold text-xs text-muted-foreground uppercase tracking-wider py-3.5 px-4 w-[160px]">
                Datum i Vrijeme
              </TableHead>
              <TableHead className="font-semibold text-xs text-muted-foreground uppercase tracking-wider py-3.5 px-4 min-w-[200px]">
                Naziv / Tema
              </TableHead>
              <TableHead className="font-semibold text-xs text-muted-foreground uppercase tracking-wider py-3.5 px-4 min-w-[200px]">
                Firma
              </TableHead>
              <TableHead className="font-semibold text-xs text-muted-foreground uppercase tracking-wider py-3.5 px-4 min-w-[180px]">
                Lokacija
              </TableHead>
              <TableHead className="font-semibold text-xs text-muted-foreground uppercase tracking-wider py-3.5 px-4 w-[120px]">
                Trajanje
              </TableHead>
              <TableHead className="font-semibold text-xs text-muted-foreground uppercase tracking-wider py-3.5 px-4 w-[130px]">
                Status
              </TableHead>
              <TableHead className="font-semibold text-xs text-muted-foreground uppercase tracking-wider py-3.5 px-4 w-[80px] text-right">
                Akcije
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {meetings.map((meeting) => {
              const isPast = new Date(meeting.scheduled_at) < new Date()
              const isFinished = meeting.status === "Završen" || meeting.status === "Otkazan"
              const isKancelarija = meeting.location_type === "Kancelarija"

              return (
                <TableRow
                  key={meeting.$id}
                  className={cn(
                    "group hover:bg-muted/40 transition-colors",
                    isFinished && "opacity-65",
                    isPast && !isFinished && "bg-amber-50/40 dark:bg-amber-900/10"
                  )}
                >
                  {/* Datum i Vrijeme */}
                  <TableCell className="py-3.5 px-4">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-bold text-foreground tracking-tight">
                        {formatTime(meeting.scheduled_at)}
                      </span>
                      <span className="text-xs text-muted-foreground font-medium">
                        {formatDate(meeting.scheduled_at)}
                      </span>
                    </div>
                  </TableCell>

                  {/* Naziv */}
                  <TableCell className="py-3.5 px-4">
                    <div className="flex flex-col gap-0.5 max-w-[320px]">
                      <p className="text-sm font-semibold text-foreground line-clamp-1">
                        {meeting.title}
                      </p>
                      {meeting.notes && (
                        <p className="text-xs text-muted-foreground line-clamp-1 italic">
                          {meeting.notes}
                        </p>
                      )}
                    </div>
                  </TableCell>

                  {/* Firma */}
                  <TableCell className="py-3.5 px-4">
                    {meeting.company_name ? (
                      <div className="flex items-center gap-2">
                        <div className="size-7 rounded-md bg-muted/60 border border-border/50 flex items-center justify-center shrink-0">
                          <RiBuilding2Line className="size-4 text-muted-foreground" />
                        </div>
                        <span className="text-sm font-medium text-foreground line-clamp-1">
                          {meeting.company_name}
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground/60">—</span>
                    )}
                  </TableCell>

                  {/* Lokacija */}
                  <TableCell className="py-3.5 px-4">
                    <div className="flex flex-col gap-1">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium border w-fit",
                          isKancelarija
                            ? "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800"
                            : "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800"
                        )}
                      >
                        {isKancelarija ? (
                          <RiBuilding2Line className="size-3.5 shrink-0" />
                        ) : (
                          <RiCarLine className="size-3.5 shrink-0" />
                        )}
                        {isKancelarija ? "Kancelarija" : "Kod klijenta"}
                      </span>
                      {meeting.location_note && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <RiMapPinLine className="size-3.5 text-muted-foreground shrink-0" />
                          <span className="truncate max-w-[220px]">{meeting.location_note}</span>
                        </div>
                      )}
                    </div>
                  </TableCell>

                  {/* Trajanje */}
                  <TableCell className="py-3.5 px-4">
                    <div className="flex items-center gap-1.5 text-sm font-medium text-foreground/80">
                      <RiTimeLine className="size-4 text-muted-foreground shrink-0" />
                      <span>{formatDuration(meeting.duration_min)}</span>
                    </div>
                  </TableCell>

                  {/* Status */}
                  <TableCell className="py-3.5 px-4">
                    {loadingStatus === meeting.$id ? (
                      <div className="h-6 w-20 animate-pulse rounded-full bg-muted" />
                    ) : (
                      <MeetingStatusBadge status={meeting.status} size="md" />
                    )}
                  </TableCell>

                  {/* Akcije */}
                  <TableCell className="py-3.5 px-4 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 opacity-70 group-hover:opacity-100 hover:bg-muted transition-all cursor-pointer"
                        >
                          <RiMoreLine className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-52">
                        <DropdownMenuItem onClick={() => onEdit(meeting)} className="gap-2 text-xs font-medium cursor-pointer">
                          <RiEditLine className="size-4" />
                          Izmijeni
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {meeting.status !== "Potvrđen" && meeting.status !== "Završen" && (
                          <DropdownMenuItem
                            onClick={() => handleStatusChange(meeting, "Potvrđen")}
                            className="gap-2 text-xs font-medium text-emerald-600 focus:text-emerald-700 cursor-pointer"
                          >
                            <RiCheckLine className="size-4" />
                            Označi Potvrđen
                          </DropdownMenuItem>
                        )}
                        {meeting.status !== "Na čekanju" && meeting.status !== "Završen" && meeting.status !== "Otkazan" && (
                          <DropdownMenuItem
                            onClick={() => handleStatusChange(meeting, "Na čekanju")}
                            className="gap-2 text-xs font-medium text-violet-600 focus:text-violet-700 cursor-pointer"
                          >
                            <RiTimeLine className="size-4" />
                            Označi Na čekanju
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
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

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
