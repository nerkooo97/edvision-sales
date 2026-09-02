"use client"

import * as React from "react"
import { RiArrowLeftLine, RiArrowRightLine, RiCalendarEventLine } from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { MeetingCard } from "./meeting-card"
import type { Meeting } from "@/lib/appwrite/meetings"
import { cn, formatTime } from "@/lib/utils"

import { DayMeetingsDialog } from "./day-meetings-dialog"

interface MeetingsCalendarProps {
  meetings: Meeting[]
  pendingMeetings?: Meeting[]
  onEdit: (meeting: Meeting) => void
  onNewMeeting?: (date: Date) => void
  onRefresh: () => void
  onMonthChange?: (year: number, month: number) => void
}

const DAYS_BS = ["Pon", "Uto", "Sri", "Čet", "Pet", "Sub", "Ned"]
const MONTHS_BS = [
  "Januar", "Februar", "Mart", "April", "Maj", "Juni",
  "Juli", "August", "Septembar", "Oktobar", "Novembar", "Decembar"
]

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number) {
  // 0=ned → prebacujemo na pon=0
  const day = new Date(year, month - 1, 1).getDay()
  return day === 0 ? 6 : day - 1
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
}

interface CalendarDayProps {
  date: Date
  meetings: Meeting[]
  isToday: boolean
  isCurrentMonth: boolean
  onSelectDay: (date: Date) => void
}

function CalendarDay({ date, meetings, isToday, isCurrentMonth, onSelectDay }: CalendarDayProps) {
  const visible = meetings.slice(0, 2)
  const extra = meetings.length - 2

  const statusColors: Record<string, string> = {
    Zakazan: "bg-blue-500",
    "Potvrđen": "bg-emerald-500",
    "Završen": "bg-slate-400",
    Otkazan: "bg-red-500",
    "Odgođen": "bg-amber-500",
    "Na čekanju": "bg-violet-400",
  }

  return (
    <div
      onClick={() => onSelectDay(date)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onSelectDay(date)
        }
      }}
      className={cn(
        "min-h-28 rounded-xl border p-2 text-left cursor-pointer transition-all duration-150 select-none group/cell flex flex-col justify-between",
        isCurrentMonth ? "bg-card hover:bg-muted/40 hover:border-primary/40 hover:shadow-xs" : "bg-muted/20 hover:bg-muted/30",
        isToday && "border-primary/60 bg-primary/5 ring-1 ring-primary/30",
        !isCurrentMonth && "opacity-50"
      )}
    >
      <div>
        {/* Broj dana i indikator */}
        <div className="flex items-center justify-between mb-1.5">
          <div className={cn(
            "inline-flex size-6 items-center justify-center rounded-full text-xs font-semibold transition-colors",
            isToday
              ? "bg-primary text-white shadow-xs"
              : "text-foreground group-hover/cell:text-primary"
          )}>
            {date.getDate()}
          </div>

          {meetings.length > 0 && (
            <span className="text-[10px] font-semibold text-muted-foreground bg-muted px-1.5 py-0.2 rounded-full">
              {meetings.length}
            </span>
          )}
        </div>

        {/* Sastanci (pregled do 2) */}
        <div className="space-y-1">
          {visible.map((meeting) => {
            const isPending = meeting.status === "Na čekanju"
            return (
              <div
                key={meeting.$id}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-1.5 py-1 text-[10px] font-medium",
                  "group-hover/cell:bg-background transition-colors leading-tight",
                  isPending
                    ? "bg-violet-50/70 border border-dashed border-violet-300 dark:bg-violet-950/30 dark:border-violet-700 opacity-80"
                    : "bg-muted/50 border border-border/40"
                )}
              >
                <div className={cn(
                  "size-1.5 rounded-full shrink-0",
                  statusColors[meeting.status] || "bg-muted-foreground"
                )} />
                <span className="text-[10px] text-muted-foreground font-mono shrink-0">
                  {formatTime(meeting.scheduled_at)}
                </span>
                <span
                  className="truncate text-foreground text-[10px] font-medium"
                  title={meeting.company_name ? `${meeting.company_name} (${meeting.title})` : meeting.title}
                >
                  {meeting.company_name || meeting.title}
                </span>
              </div>
            )
          })}
          {extra > 0 && (
            <div className="px-1.5 py-0.5 text-[10px] font-medium text-primary">
              +{extra} više
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

import { PendingMeetingsSidebar } from "./pending-meetings-sidebar"

export function MeetingsCalendar({ meetings, pendingMeetings = [], onEdit, onNewMeeting, onRefresh, onMonthChange }: MeetingsCalendarProps) {
  const today = new Date()
  const [currentYear, setCurrentYear] = React.useState(today.getFullYear())
  const [currentMonth, setCurrentMonth] = React.useState(today.getMonth() + 1)
  const [selectedDay, setSelectedDay] = React.useState<Date | null>(null)
  const [dayDialogOpen, setDayDialogOpen] = React.useState(false)

  const daysInMonth = getDaysInMonth(currentYear, currentMonth)
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth)

  // Prethodni i sljedeći mjesec za popunjavanje grida
  const prevMonthDays = getDaysInMonth(
    currentMonth === 1 ? currentYear - 1 : currentYear,
    currentMonth === 1 ? 12 : currentMonth - 1
  )

  // Grupisanje sastanaka po danu
  const meetingsByDay = React.useMemo(() => {
    const map = new Map<string, Meeting[]>()
    meetings.forEach((m) => {
      const d = new Date(m.scheduled_at)
      const key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(m)
    })
    return map
  }, [meetings])

  const handleSelectDay = (date: Date) => {
    setSelectedDay(date)
    setDayDialogOpen(true)
  }

  const selectedDayMeetings = React.useMemo(() => {
    if (!selectedDay) return []
    const key = `${selectedDay.getFullYear()}-${selectedDay.getMonth() + 1}-${selectedDay.getDate()}`
    return meetingsByDay.get(key) || []
  }, [selectedDay, meetingsByDay])

  const goToPrevMonth = () => {
    const newMonth = currentMonth === 1 ? 12 : currentMonth - 1
    const newYear = currentMonth === 1 ? currentYear - 1 : currentYear
    setCurrentMonth(newMonth)
    setCurrentYear(newYear)
    onMonthChange?.(newYear, newMonth)
  }

  const goToNextMonth = () => {
    const newMonth = currentMonth === 12 ? 1 : currentMonth + 1
    const newYear = currentMonth === 12 ? currentYear + 1 : currentYear
    setCurrentMonth(newMonth)
    setCurrentYear(newYear)
    onMonthChange?.(newYear, newMonth)
  }

  const goToToday = () => {
    setCurrentMonth(today.getMonth() + 1)
    setCurrentYear(today.getFullYear())
    onMonthChange?.(today.getFullYear(), today.getMonth() + 1)
  }

  // Gradi niz ćelija za prikaz (prev + current + next)
  const cells: { date: Date; isCurrentMonth: boolean }[] = []

  // Ćelije prethodnog mjeseca
  for (let i = firstDay - 1; i >= 0; i--) {
    const day = prevMonthDays - i
    const m = currentMonth === 1 ? 12 : currentMonth - 1
    const y = currentMonth === 1 ? currentYear - 1 : currentYear
    cells.push({ date: new Date(y, m - 1, day), isCurrentMonth: false })
  }

  // Ćelije trenutnog mjeseca
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({ date: new Date(currentYear, currentMonth - 1, day), isCurrentMonth: true })
  }

  // Dopuni do punih sedmica
  const remaining = (7 - (cells.length % 7)) % 7
  for (let day = 1; day <= remaining; day++) {
    const m = currentMonth === 12 ? 1 : currentMonth + 1
    const y = currentMonth === 12 ? currentYear + 1 : currentYear
    cells.push({ date: new Date(y, m - 1, day), isCurrentMonth: false })
  }

  // Predstojeći sastanci (za sidebar)
  const upcomingMeetings = meetings
    .filter((m) => new Date(m.scheduled_at) >= today && (m.status === "Zakazan" || m.status === "Potvrđen"))
    .slice(0, 4)

  return (
    <div className="flex gap-6">
      {/* Kalendar */}
      <div className="flex-1 min-w-0">
        {/* Header navigacija */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" onClick={goToPrevMonth} className="size-8 cursor-pointer">
              <RiArrowLeftLine className="size-4" />
            </Button>
            <h2 className="text-lg font-bold">
              {MONTHS_BS[currentMonth - 1]} {currentYear}
            </h2>
            <Button variant="outline" size="icon" onClick={goToNextMonth} className="size-8 cursor-pointer">
              <RiArrowRightLine className="size-4" />
            </Button>
          </div>
          <Button variant="outline" size="sm" onClick={goToToday} className="text-xs cursor-pointer">
            Danas
          </Button>
        </div>

        {/* Dani u sedmici - header */}
        <div className="grid grid-cols-7 gap-1.5 mb-1.5">
          {DAYS_BS.map((day) => (
            <div key={day} className="text-center text-xs font-semibold text-muted-foreground py-1.5">
              {day}
            </div>
          ))}
        </div>

        {/* Kalendar grid */}
        <div className="grid grid-cols-7 gap-1.5">
          {cells.map((cell, idx) => {
            const key = `${cell.date.getFullYear()}-${cell.date.getMonth() + 1}-${cell.date.getDate()}`
            const dayMeetings = meetingsByDay.get(key) || []
            const isToday = isSameDay(cell.date, today)

            return (
              <CalendarDay
                key={idx}
                date={cell.date}
                meetings={dayMeetings}
                isToday={isToday}
                isCurrentMonth={cell.isCurrentMonth}
                onSelectDay={handleSelectDay}
              />
            )
          })}
        </div>
      </div>

      {/* Day Meetings Dialog */}
      <DayMeetingsDialog
        open={dayDialogOpen}
        onOpenChange={setDayDialogOpen}
        date={selectedDay}
        meetings={selectedDayMeetings}
        onEditMeeting={onEdit}
        onNewMeeting={(d) => onNewMeeting?.(d)}
        onRefresh={onRefresh}
      />

      {/* Sidebar — predstojeći */}
      <div className="w-64 shrink-0">
        <div className="sticky top-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <RiCalendarEventLine className="size-4 text-primary" />
            Predstojeći
          </h3>

          {upcomingMeetings.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-muted/20 p-4 text-center">
              <p className="text-xs text-muted-foreground">Nema predstojećih sastanaka.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {upcomingMeetings.map((meeting) => (
                <MeetingCard
                  key={meeting.$id}
                  meeting={meeting}
                  compact
                  onEdit={onEdit}
                  className="cursor-pointer"
                />
              ))}
            </div>
          )}

          {/* Legenda */}
          <div className="mt-6 rounded-xl border bg-muted/20 p-3 space-y-1.5 mb-6">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Legenda</p>
            {[
              { color: "bg-blue-500", label: "Zakazan" },
              { color: "bg-emerald-500", label: "Potvrđen" },
              { color: "bg-amber-500", label: "Odgođen" },
              { color: "bg-red-500", label: "Otkazan" },
              { color: "bg-slate-400", label: "Završen" },
              { color: "bg-violet-400 border border-dashed border-violet-500", label: "Na čekanju" },
            ].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-2">
                <div className={cn("size-2 rounded-full", color)} />
                <span className="text-[10px] text-muted-foreground">{label}</span>
              </div>
            ))}
          </div>

          <PendingMeetingsSidebar meetings={pendingMeetings} onEdit={onEdit} />
        </div>
      </div>
    </div>
  )
}
