"use client"

import * as React from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import type { ContactLog } from "@/lib/appwrite/contact-logs"
import type { Company } from "@/lib/appwrite/companies"
import type { Lead } from "@/lib/appwrite/leads"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { formatDate, formatDateTime } from "@/lib/utils"
import { ContactLogSheet } from "./contact-log-sheet"
import { DeleteContactLogDialog } from "./delete-contact-log-dialog"
import {
  RiHistoryLine,
  RiBuilding2Line,
  RiMailLine,
  RiPhoneLine,
  RiWhatsappLine,
  RiLinkedinLine,
  RiUserVoiceLine,
  RiArrowLeftSLine,
  RiArrowRightSLine,
  RiAddLine,
  RiEditLine,
  RiDeleteBinLine,
  RiEyeLine,
  RiCalendarEventLine,
  RiFilter3Line,
} from "@remixicon/react"

interface ContactLogsTableProps {
  contactLogs: ContactLog[]
  companies: Company[]
  leads: Lead[]
  total: number
  page: number
  limit: number
  totalPages: number
  channel: string
  status: string
}

const CHANNEL_FILTERS = [
  { label: "Svi kanali", value: "all" },
  { label: "Email", value: "Email" },
  { label: "Telefon", value: "Telefon" },
  { label: "WhatsApp", value: "WhatsApp" },
  { label: "LinkedIn", value: "LinkedIn" },
  { label: "Sastanak uživo", value: "Sastanak uživo" },
  { label: "SMS", value: "SMS" },
]

export function ContactLogsTable({
  contactLogs,
  companies,
  leads,
  total,
  page,
  limit,
  totalPages,
  channel: initialChannel,
  status: initialStatus,
}: ContactLogsTableProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [isPending, startTransition] = React.useTransition()

  // Sheet & Dialog State
  const [sheetOpen, setSheetOpen] = React.useState(false)
  const [sheetMode, setSheetMode] = React.useState<"create" | "edit" | "view">("create")
  const [selectedLog, setSelectedLog] = React.useState<ContactLog | null>(null)

  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
  const [logToDelete, setLogToDelete] = React.useState<ContactLog | null>(null)

  const updateQuery = React.useCallback(
    (newParams: Record<string, string | number | null>) => {
      const params = new URLSearchParams(searchParams.toString())

      Object.entries(newParams).forEach(([key, value]) => {
        if (value === null || value === "" || value === "all") {
          params.delete(key)
        } else {
          params.set(key, String(value))
        }
      })

      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`)
      })
    },
    [pathname, router, searchParams]
  )

  const openCreateSheet = () => {
    setSelectedLog(null)
    setSheetMode("create")
    setSheetOpen(true)
  }

  const openViewSheet = (log: ContactLog) => {
    setSelectedLog(log)
    setSheetMode("view")
    setSheetOpen(true)
  }

  const openEditSheet = (log: ContactLog) => {
    setSelectedLog(log)
    setSheetMode("edit")
    setSheetOpen(true)
  }

  const openDeleteDialog = (log: ContactLog) => {
    setLogToDelete(log)
    setDeleteDialogOpen(true)
  }

  const handleActionSuccess = () => {
    router.refresh()
  }

  const getChannelBadge = (channel?: string) => {
    switch (channel?.toLowerCase()) {
      case "telefon":
        return (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
            <RiPhoneLine className="size-3.5" /> Telefon
          </span>
        )
      case "whatsapp":
        return (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400">
            <RiWhatsappLine className="size-3.5" /> WhatsApp
          </span>
        )
      case "linkedin":
        return (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400">
            <RiLinkedinLine className="size-3.5" /> LinkedIn
          </span>
        )
      case "sastanak uživo":
        return (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-purple-600 dark:text-purple-400">
            <RiUserVoiceLine className="size-3.5" /> Sastanak
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
            <RiMailLine className="size-3.5" /> Email
          </span>
        )
    }
  }

  const startIndex = (page - 1) * limit + 1
  const endIndex = Math.min(page * limit, total)

  return (
    <div className="space-y-4 w-full min-w-0 max-w-full">
      {/* Filters Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <RiFilter3Line className="size-4 text-muted-foreground shrink-0" />
          <select
            value={initialChannel || "all"}
            onChange={(e) => updateQuery({ channel: e.target.value, page: 1 })}
            className="h-9 px-3 rounded-lg border border-border bg-background text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-primary/40"
          >
            {CHANNEL_FILTERS.map((ch) => (
              <option key={ch.value} value={ch.value}>
                {ch.label}
              </option>
            ))}
          </select>

          <select
            value={initialStatus || "all"}
            onChange={(e) => updateQuery({ status: e.target.value, page: 1 })}
            className="h-9 px-3 rounded-lg border border-border bg-background text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-primary/40"
          >
            <option value="all">Svi statusi</option>
            <option value="Poslano">Poslano</option>
            <option value="Otvoreno">Otvoreno</option>
            <option value="Odgovoreno">Odgovoreno</option>
            <option value="Propušteno">Propušteno</option>
            <option value="Uspješan poziv">Uspješan poziv</option>
            <option value="Zakazan sastanak">Zakazan sastanak</option>
            <option value="Odbijeno">Odbijeno</option>
          </select>
        </div>

        <div className="flex items-center gap-3 justify-between sm:justify-end">
          <div className="text-xs text-muted-foreground">
            Ukupno: <span className="font-medium text-foreground">{total}</span> zapisa
          </div>

          <Button
            size="sm"
            onClick={openCreateSheet}
            className="gap-1.5 cursor-pointer shadow-xs"
          >
            <RiAddLine className="size-4" />
            <span>Evidentiraj kontakt</span>
          </Button>
        </div>
      </div>

      {/* Table Container with Internal Horizontal Scroll */}
      <div className="rounded-xl border border-border bg-card overflow-hidden w-full max-w-full">
        <Table className="min-w-[1050px] w-full">
          <TableHeader>
            <TableRow className="hover:bg-transparent bg-muted/40">
              <TableHead className="font-semibold text-xs text-muted-foreground uppercase tracking-wider min-w-[150px]">Datum i vrijeme</TableHead>
              <TableHead className="font-semibold text-xs text-muted-foreground uppercase tracking-wider min-w-[180px]">Kompanija</TableHead>
              <TableHead className="font-semibold text-xs text-muted-foreground uppercase tracking-wider min-w-[160px]">Kanal i primalac</TableHead>
              <TableHead className="font-semibold text-xs text-muted-foreground uppercase tracking-wider min-w-[200px]">Predmet i sadržaj</TableHead>
              <TableHead className="font-semibold text-xs text-muted-foreground uppercase tracking-wider min-w-[140px]">Status i ishod</TableHead>
              <TableHead className="font-semibold text-xs text-muted-foreground uppercase tracking-wider min-w-[130px]">Sljedeći kontakt</TableHead>
              <TableHead className="font-semibold text-xs text-muted-foreground uppercase tracking-wider text-right min-w-[110px]">Akcije</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contactLogs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-48 text-center">
                  <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                    <RiHistoryLine className="size-8 opacity-40" />
                    <p className="font-medium text-sm text-foreground">Nema zabilježenih kontakata</p>
                    <p className="text-xs">
                      {initialChannel ? "Nema zapisa za odabrani kanal komunikacije." : "Kliknite na 'Evidentiraj kontakt' za unos prve aktivnosti."}
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={openCreateSheet}
                      className="mt-2 gap-1.5 cursor-pointer"
                    >
                      <RiAddLine className="size-4" />
                      Evidentiraj kontakt
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              contactLogs.map((log) => {
                const companyObj = typeof log.company === "object" && log.company
                  ? log.company
                  : companies.find((c) => c.$id === log.company) ||
                    (typeof log.lead === "object" && log.lead && typeof log.lead.company === "object" ? log.lead.company : null) ||
                    companies.find((c) => {
                      const leadObj = leads.find((l) => l.$id === (typeof log.lead === "string" ? log.lead : log.lead?.$id))
                      return leadObj && (typeof leadObj.company === "object" ? leadObj.company?.$id === c.$id : leadObj.company === c.$id)
                    })

                const companyName = companyObj?.company_name || "—"

                return (
                  <TableRow
                    key={log.$id}
                    className="hover:bg-muted/40 transition-colors group cursor-pointer"
                    onClick={() => openViewSheet(log)}
                  >
                    {/* Datum & Vrijeme */}
                    <TableCell>
                      <span className="text-xs font-mono text-muted-foreground" suppressHydrationWarning>
                        {log.contacted_at
                          ? formatDateTime(log.contacted_at)
                          : "—"}
                      </span>
                    </TableCell>

                    {/* Kompanija */}
                    <TableCell>
                      <span className="font-semibold text-foreground text-sm group-hover:text-primary transition-colors flex items-center gap-1.5">
                        <RiBuilding2Line className="size-3.5 text-muted-foreground" />
                        {companyName}
                      </span>
                    </TableCell>

                    {/* Kanal & Primalac */}
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        {getChannelBadge(log.channel)}
                        {(() => {
                          const isPhone = (log.channel || "").toLowerCase().includes("telefon") || (log.channel || "").toLowerCase().includes("poziv")
                          const isWA = (log.channel || "").toLowerCase().includes("whatsapp")
                          const phone = companyObj?.phones?.[0] || ""
                          const email = companyObj?.email || ""
                          const displayContact = log.recipient || (isPhone || isWA ? phone : email) || phone || email

                          if (!displayContact) return null
                          return (
                            <span className="text-xs text-muted-foreground truncate max-w-[140px] font-mono">
                              {displayContact}
                            </span>
                          )
                        })()}
                      </div>
                    </TableCell>

                    {/* Predmet & Sadržaj */}
                    <TableCell>
                      <div className="flex flex-col gap-0.5 max-w-[200px]">
                        <span className="font-medium text-xs text-foreground truncate">
                          {log.subject || "Bez naslova"}
                        </span>
                        {log.content && (
                          <span className="text-xs text-muted-foreground truncate">
                            {log.content}
                          </span>
                        )}
                      </div>
                    </TableCell>

                    {/* Status & Ishod */}
                    <TableCell>
                      <div className="flex flex-col gap-1 items-start">
                        <Badge
                          variant="outline"
                          className={`text-[10px] px-1.5 py-0 h-4 ${
                            log.status === "Otvoreno" || log.status === "Otvorena"
                              ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800 font-semibold"
                              : log.status === "Odgovoreno" || log.status === "Zakazan sastanak" || log.status === "Uspješan poziv"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800 font-semibold"
                              : log.status === "Greška" || (log.outcome || "").toLowerCase().includes("grešk") || (log.outcome || "").toLowerCase().includes("nevažeć")
                              ? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-900 font-semibold"
                              : log.status === "Poslano"
                              ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800 font-semibold"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {log.status === "Greška"
                            ? log.channel === "WhatsApp"
                              ? "WhatsApp nije poslan"
                              : log.channel === "Email"
                                ? "Pogrešan email"
                                : "Greška"
                            : log.status || "Poslano"}
                        </Badge>
                        {log.outcome && (
                          <span className="text-xs text-muted-foreground truncate max-w-[140px]">
                            {log.outcome}
                          </span>
                        )}
                      </div>
                    </TableCell>

                    {/* Sljedeći Kontakt */}
                    <TableCell>
                      {log.follow_up_date ? (
                        <div className="flex items-center gap-1 text-xs text-foreground font-medium">
                          <RiCalendarEventLine className="size-3.5 text-muted-foreground" />
                          <span suppressHydrationWarning>{formatDate(log.follow_up_date)}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground/60 text-xs">—</span>
                      )}
                    </TableCell>

                    {/* Akcije */}
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="inline-flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-muted-foreground hover:text-foreground cursor-pointer"
                          title="Pregledaj zapis"
                          onClick={() => openViewSheet(log)}
                        >
                          <RiEyeLine className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-muted-foreground hover:text-primary cursor-pointer"
                          title="Uredi zapis"
                          onClick={() => openEditSheet(log)}
                        >
                          <RiEditLine className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-muted-foreground hover:text-destructive cursor-pointer"
                          title="Obriši zapis"
                          onClick={() => openDeleteDialog(log)}
                        >
                          <RiDeleteBinLine className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Footer */}
      {total > 0 && (
        <div className="flex items-center justify-between gap-2 px-1 text-xs text-muted-foreground">
          <div>
            Prikazano <span className="font-medium text-foreground">{startIndex}</span>–
            <span className="font-medium text-foreground">{endIndex}</span> od{" "}
            <span className="font-medium text-foreground">{total}</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs">
              Stranica <span className="font-medium text-foreground">{page}</span> od{" "}
              <span className="font-medium text-foreground">{totalPages}</span>
            </span>

            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0 cursor-pointer"
                disabled={page <= 1 || isPending}
                onClick={() => updateQuery({ page: page - 1 })}
                aria-label="Prethodna stranica"
              >
                <RiArrowLeftSLine className="size-4" />
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0 cursor-pointer"
                disabled={page >= totalPages || isPending}
                onClick={() => updateQuery({ page: page + 1 })}
                aria-label="Sljedeća stranica"
              >
                <RiArrowRightSLine className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Slide-over Sheet (Create, Edit, View) */}
      <ContactLogSheet
        log={selectedLog}
        companies={companies}
        leads={leads}
        mode={sheetMode}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onSuccess={handleActionSuccess}
        onSwitchToEdit={() => setSheetMode("edit")}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteContactLogDialog
        log={logToDelete}
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onSuccess={handleActionSuccess}
      />
    </div>
  )
}
