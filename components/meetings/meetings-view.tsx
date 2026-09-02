"use client"

import * as React from "react"
import {
  RiCalendarEventLine,
  RiListCheck,
  RiAddLine,
  RiSearchLine,
  RiFilterLine,
  RiArrowLeftLine,
  RiArrowRightLine,
} from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { MeetingsList } from "./meetings-list"
import { MeetingsCalendar } from "./meetings-calendar"
import { MeetingFormDialog } from "./meeting-form-dialog"
import { PendingMeetingsSidebar } from "./pending-meetings-sidebar"
import { getMeetings, getMeetingsByMonth } from "@/lib/appwrite/meetings"
import type { Meeting } from "@/lib/appwrite/meetings"
import type { Company } from "@/lib/appwrite/companies"
import { cn } from "@/lib/utils"

interface MeetingsViewProps {
  initialMeetings: Meeting[]
  initialTotal: number
  initialPage: number
  initialTotalPages: number
  companies: Company[]
  pendingMeetings?: Meeting[]
  initialSearch?: string
  initialStatus?: string
  initialView?: "list" | "calendar"
}

type ViewMode = "list" | "calendar"

const STATUS_FILTERS = [
  { value: "all", label: "Svi statusi" },
  { value: "Zakazan", label: "Zakazan" },
  { value: "Potvrđen", label: "Potvrđen" },
  { value: "Na čekanju", label: "Na čekanju" },
  { value: "Odgođen", label: "Odgođen" },
  { value: "Završen", label: "Završen" },
  { value: "Otkazan", label: "Otkazan" },
]

export function MeetingsView({
  initialMeetings,
  initialTotal,
  initialPage,
  initialTotalPages,
  companies,
  pendingMeetings = [],
  initialSearch = "",
  initialStatus = "all",
  initialView = "list",
}: MeetingsViewProps) {
  const [viewMode, setViewMode] = React.useState<ViewMode>(initialView)
  const [meetings, setMeetings] = React.useState<Meeting[]>(initialMeetings)
  const [total, setTotal] = React.useState(initialTotal)
  const [page, setPage] = React.useState(initialPage)
  const [totalPages, setTotalPages] = React.useState(initialTotalPages)
  const [search, setSearch] = React.useState(initialSearch)
  const [searchInput, setSearchInput] = React.useState(initialSearch)
  const [status, setStatus] = React.useState(initialStatus)
  const [isLoading, setIsLoading] = React.useState(false)

  // Form dialog state
  const [formOpen, setFormOpen] = React.useState(false)
  const [editingMeeting, setEditingMeeting] = React.useState<Meeting | null>(null)
  const [formInitialDate, setFormInitialDate] = React.useState<Date | null>(null)

  // Calendar month
  const today = new Date()
  const [calMonth, setCalMonth] = React.useState(today.getMonth() + 1)
  const [calYear, setCalYear] = React.useState(today.getFullYear())
  const [calMeetings, setCalMeetings] = React.useState<Meeting[]>(initialMeetings)

  const LIMIT = 15

  const fetchMeetings = React.useCallback(async (newPage = 1, newSearch = search, newStatus = status) => {
    setIsLoading(true)
    try {
      const res = await getMeetings({
        page: newPage,
        limit: LIMIT,
        search: newSearch,
        status: newStatus === "all" ? "" : newStatus,
      })
      setMeetings(res.meetings)
      setTotal(res.total)
      setPage(res.page)
      setTotalPages(res.totalPages)
    } finally {
      setIsLoading(false)
    }
  }, [search, status])

  const fetchCalMeetings = React.useCallback(async (year: number, month: number) => {
    setIsLoading(true)
    try {
      const res = await getMeetingsByMonth(year, month)
      setCalMeetings(res)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Debounced search
  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== search) {
        setSearch(searchInput)
        fetchMeetings(1, searchInput, status)
      }
    }, 400)
    return () => clearTimeout(timer)
  }, [searchInput]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleStatusFilter = (newStatus: string) => {
    setStatus(newStatus)
    fetchMeetings(1, search, newStatus)
  }

  const handlePageChange = (newPage: number) => {
    fetchMeetings(newPage, search, status)
  }

  const handleMonthChange = (year: number, month: number) => {
    setCalYear(year)
    setCalMonth(month)
    fetchCalMeetings(year, month)
  }

  const handleEdit = (meeting: Meeting) => {
    setEditingMeeting(meeting)
    setFormInitialDate(null)
    setFormOpen(true)
  }

  const handleNewMeeting = () => {
    setEditingMeeting(null)
    setFormInitialDate(null)
    setFormOpen(true)
  }

  const handleNewMeetingForDate = (date: Date) => {
    setEditingMeeting(null)
    setFormInitialDate(date)
    setFormOpen(true)
  }

  const handleFormSuccess = () => {
    fetchMeetings(page, search, status)
    if (viewMode === "calendar") {
      fetchCalMeetings(calYear, calMonth)
    }
  }

  const handleRefresh = () => {
    fetchMeetings(page, search, status)
    if (viewMode === "calendar") {
      fetchCalMeetings(calYear, calMonth)
    }
  }

  return (
    <>
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <RiSearchLine className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
            <Input
              type="search"
              placeholder="Pretraži sastanke..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>

          {/* Status filter */}
          <Select value={status} onValueChange={handleStatusFilter}>
            <SelectTrigger className="h-9 w-44 text-sm gap-1.5">
              <RiFilterLine className="size-4 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_FILTERS.map((f) => (
                <SelectItem key={f.value} value={f.value} className="text-sm">
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {/* View switcher */}
          <div className="flex rounded-lg border border-border overflow-hidden">
            <button
              onClick={() => setViewMode("list")}
              className={cn(
                "flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium transition-colors cursor-pointer",
                viewMode === "list"
                  ? "bg-primary text-white"
                  : "bg-background hover:bg-accent text-muted-foreground"
              )}
            >
              <RiListCheck className="size-4" />
              Lista
            </button>
            <button
              onClick={() => {
                setViewMode("calendar")
                fetchCalMeetings(calYear, calMonth)
              }}
              className={cn(
                "flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium transition-colors border-l border-border cursor-pointer",
                viewMode === "calendar"
                  ? "bg-primary text-white"
                  : "bg-background hover:bg-accent text-muted-foreground"
              )}
            >
              <RiCalendarEventLine className="size-4" />
              Kalendar
            </button>
          </div>

          {/* Novi sastanak */}
          <Button size="sm" onClick={handleNewMeeting} className="gap-1.5 h-9 px-3.5 text-sm font-medium cursor-pointer shadow-xs">
            <RiAddLine className="size-4" />
            Zakaži sastanak
          </Button>
        </div>
      </div>

      {/* Loading indicator */}
      {isLoading && (
        <div className="h-1 w-full rounded-full overflow-hidden bg-muted">
          <div className="h-full w-1/2 bg-primary rounded-full animate-pulse" />
        </div>
      )}

      {/* Content */}
      {viewMode === "list" ? (
        <div className="space-y-4">
          <MeetingsList
            meetings={meetings}
            onEdit={handleEdit}
            onRefresh={handleRefresh}
          />

          {/* Paginacija */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-sm text-muted-foreground">
                Ukupno <span className="font-semibold text-foreground">{total}</span> {total === 1 ? "sastanak" : "sastanaka"} · Stranica {page} od {totalPages}
              </p>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="icon"
                  className="size-8 cursor-pointer"
                  disabled={page <= 1}
                  onClick={() => handlePageChange(page - 1)}
                >
                  <RiArrowLeftLine className="size-4" />
                </Button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const p = i + Math.max(1, page - 2)
                  if (p > totalPages) return null
                  return (
                    <Button
                      key={p}
                      variant={p === page ? "default" : "outline"}
                      size="icon"
                      className="size-8 text-xs font-semibold cursor-pointer"
                      onClick={() => handlePageChange(p)}
                    >
                      {p}
                    </Button>
                  )
                })}
                <Button
                  variant="outline"
                  size="icon"
                  className="size-8 cursor-pointer"
                  disabled={page >= totalPages}
                  onClick={() => handlePageChange(page + 1)}
                >
                  <RiArrowRightLine className="size-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <MeetingsCalendar
          meetings={calMeetings}
          pendingMeetings={pendingMeetings}
          onEdit={handleEdit}
          onNewMeeting={handleNewMeetingForDate}
          onRefresh={handleRefresh}
          onMonthChange={handleMonthChange}
        />
      )}

      {/* Form dialog */}
      <MeetingFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        onSuccess={handleFormSuccess}
        meeting={editingMeeting}
        defaultDate={formInitialDate}
        companies={companies}
      />
    </>
  )
}
