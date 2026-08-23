"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  RiPhoneLine,
  RiAddLine,
  RiSearchLine,
  RiBookOpenLine,
  RiFireLine,
  RiCalendarEventLine,
  RiCheckDoubleLine,
  RiTimeLine,
  RiLightbulbLine,
} from "@remixicon/react"
import type { CallsData, CallItem } from "@/lib/appwrite/calls"
import { CallCard } from "./call-card"
import { CompleteCallDialog } from "./complete-call-dialog"
import { ScheduleCallDialog } from "./schedule-call-dialog"
import { useRouter } from "next/navigation"

interface CallsViewProps {
  initialData: CallsData
}

export function CallsView({ initialData }: CallsViewProps) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState<"all" | "Čeka poziv" | "Zakazano" | "Obavljeno">("all")

  // Modals state
  const [selectedCallForComplete, setSelectedCallForComplete] = React.useState<CallItem | null>(null)
  const [completeDialogOpen, setCompleteDialogOpen] = React.useState(false)

  const [selectedCallForSchedule, setSelectedCallForSchedule] = React.useState<CallItem | null>(null)
  const [scheduleDialogOpen, setScheduleDialogOpen] = React.useState(false)

  const handleOpenComplete = (call: CallItem) => {
    setSelectedCallForComplete(call)
    setCompleteDialogOpen(true)
  }

  const handleOpenReschedule = (call: CallItem) => {
    setSelectedCallForSchedule(call)
    setScheduleDialogOpen(true)
  }

  const handleOpenNewSchedule = () => {
    setSelectedCallForSchedule(null)
    setScheduleDialogOpen(true)
  }

  const handleSuccess = () => {
    router.refresh()
  }

  // Filtered calls
  const filteredCalls = initialData.calls.filter((call) => {
    const matchesStatus = statusFilter === "all" || call.status === statusFilter
    const q = searchQuery.toLowerCase()
    const matchesSearch =
      !q ||
      call.companyName.toLowerCase().includes(q) ||
      call.contactPerson.toLowerCase().includes(q) ||
      call.phone.toLowerCase().includes(q) ||
      call.city.toLowerCase().includes(q)

    return matchesStatus && matchesSearch
  })

  return (
    <div className="space-y-6 w-full min-w-0 max-w-full">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pb-2 border-b border-border/50">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <RiPhoneLine className="size-6 text-primary" />
            Telefonski pozivi
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Lista prioriteta za telefonski follow-up i razgovore sa klijentima visokog potencijala.
          </p>
        </div>

        <Button
          onClick={handleOpenNewSchedule}
          className="gap-1.5 bg-primary text-primary-foreground font-semibold cursor-pointer shadow-xs self-start sm:self-auto"
        >
          <RiAddLine className="size-4" />
          Zakaži poziv ručno
        </Button>
      </div>

      {/* Main Grid: Left Column (Queue) & Right Column (Priority Stats & Playbook) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Call Queue (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          {/* Search and Tabs */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Filter Tabs */}
            <div className="inline-flex p-1 rounded-xl bg-muted border border-border self-start">
              {(
                [
                  { id: "all", label: "Svi pozivi" },
                  { id: "Čeka poziv", label: "Čeka poziv" },
                  { id: "Zakazano", label: "Zakazano" },
                  { id: "Obavljeno", label: "Obavljeno" },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusFilter(tab.id)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                    statusFilter === tab.id
                      ? "bg-background text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <RiSearchLine className="absolute left-3 top-2.5 size-3.5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Pretraži po firmi ili broju..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 text-xs h-8"
              />
            </div>
          </div>

          {/* List of Calls */}
          {filteredCalls.length === 0 ? (
            <Card className="p-12 text-center border-border bg-card">
              <div className="size-12 rounded-2xl bg-muted mx-auto flex items-center justify-center text-muted-foreground mb-3">
                <RiPhoneLine className="size-6" />
              </div>
              <h3 className="text-base font-semibold text-foreground">Nema poziva za prikaz</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                Trenutno nema zakazanih poziva prema odabranom filteru. Možete ručno zakazati poziv klikom na dugme iznad.
              </p>
            </Card>
          ) : (
            <div className="space-y-3.5">
              {filteredCalls.map((call) => (
                <CallCard
                  key={call.id}
                  call={call}
                  onComplete={handleOpenComplete}
                  onReschedule={handleOpenReschedule}
                />
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Priority Stats & Sales Playbook (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* 1. Današnji prioritet Card */}
          <Card className="border-border bg-card shadow-xs">
            <CardHeader className="pb-3 border-b border-border/50">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <RiFireLine className="size-4 text-primary" />
                Današnji prioritet
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between text-xs py-1">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span className="size-2 rounded-full bg-amber-500" />
                  <span>Čeka poziv:</span>
                </div>
                <span className="font-bold text-foreground font-mono text-sm">
                  {initialData.stats.waiting}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs py-1">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span className="size-2 rounded-full bg-purple-500" />
                  <span>Zakazano za danas:</span>
                </div>
                <span className="font-bold text-purple-600 font-mono text-sm">
                  {initialData.stats.scheduledToday}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs py-1">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span className="size-2 rounded-full bg-emerald-500" />
                  <span>Obavljeno:</span>
                </div>
                <span className="font-bold text-emerald-600 font-mono text-sm">
                  {initialData.stats.completed}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* 2. Vodič za poziv (Sales Call Script / Playbook) */}
          <Card className="border-border bg-card shadow-xs">
            <CardHeader className="pb-3 border-b border-border/50">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <RiBookOpenLine className="size-4 text-primary" />
                Vodič za poziv (Sales Script)
              </CardTitle>
              <CardDescription className="text-xs">
                Ključni koraci za vođenje uspješnog razgovora
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-3.5 text-xs">
              <div className="flex items-start gap-2.5">
                <span className="size-5 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                  1
                </span>
                <div>
                  <p className="font-semibold text-foreground">Predstavite se i spomenite email</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                    Pozdrav, zovem iz agencije EdVision vezano za analizu web stranice koju smo poslali.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="size-5 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                  2
                </span>
                <div>
                  <p className="font-semibold text-foreground">Fokus na njihove trenutne probleme</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                    Spomenite konkretan uočeni problem (npr. spora brzina na mobitelu, nedostatak kontakt forme).
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="size-5 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                  3
                </span>
                <div>
                  <p className="font-semibold text-foreground">Pojasnite kako usluga direktno pomaže</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                    Brža i modernija stranica direktno donosi više upita i jača povjerenje klijenata.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="size-5 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                  4
                </span>
                <div>
                  <p className="font-semibold text-foreground">Generišite ponudu nakon poziva</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                    Zabilježite ishod klikom na "Završi" i prebacite lead u pregovore.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dialogs */}
      <CompleteCallDialog
        call={selectedCallForComplete}
        open={completeDialogOpen}
        onOpenChange={setCompleteDialogOpen}
        onSuccess={handleSuccess}
      />

      <ScheduleCallDialog
        call={selectedCallForSchedule}
        companies={initialData.companies}
        leads={initialData.leads}
        open={scheduleDialogOpen}
        onOpenChange={setScheduleDialogOpen}
        onSuccess={handleSuccess}
      />
    </div>
  )
}
