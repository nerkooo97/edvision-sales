"use client"

import * as React from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import type { Lead } from "@/lib/appwrite/leads"
import type { Company } from "@/lib/appwrite/companies"
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
import { LeadSheet } from "./lead-sheet"
import { DeleteLeadDialog } from "./delete-lead-dialog"
import { cn } from "@/lib/utils"
import {
  RiUserSearchLine,
  RiBuilding2Line,
  RiGlobalLine,
  RiMailLine,
  RiPhoneLine,
  RiWhatsappLine,
  RiArrowLeftSLine,
  RiArrowRightSLine,
  RiAddLine,
  RiEditLine,
  RiDeleteBinLine,
  RiEyeLine,
  RiFilter3Line,
  RiHistoryLine,
  RiFireLine,
  RiCheckboxCircleLine,
  RiChat3Line,
} from "@remixicon/react"
import { calculateLeadScore, getWhatsAppLink } from "@/lib/scoring"

interface ChannelStatus {
  label: string
  color: string
  iconColor: string
  hasCheck?: boolean
  tooltip?: string
}

function getLeadCommunicationStatus(lead: Lead): {
  email: ChannelStatus
  whatsapp: ChannelStatus
  phone: ChannelStatus
} {
  const logs = lead.contact_logs || []
  const history = lead.contact_history || []

  const historyIncludes = (term: string) =>
    history.some((h) => h.toLowerCase().includes(term.toLowerCase()))

  // 1. EMAIL
  const emailLogs = logs.filter((l) => (l.channel || "").toLowerCase().includes("email"))
  const isEmailAnswered =
    emailLogs.some(
      (l) =>
        (l.status || "").toLowerCase().includes("odgovor") ||
        (l.outcome || "").toLowerCase().includes("odgovor") ||
        (l.outcome || "").toLowerCase().includes("pozitiv") ||
        (l.outcome || "").toLowerCase().includes("zainteresov")
    ) || historyIncludes("email: odgovoreno") || historyIncludes("email odgovoreno")

  const isEmailOpened =
    !isEmailAnswered &&
    (emailLogs.some(
      (l) =>
        (l.status || "").toLowerCase().includes("otvor") ||
        (l.outcome || "").toLowerCase().includes("otvor") ||
        (l.status || "").toLowerCase().includes("pročit") ||
        (l.outcome || "").toLowerCase().includes("pročit")
    ) ||
      historyIncludes("email: otvoreno") ||
      historyIncludes("email: otvorena") ||
      historyIncludes("email otvoren") ||
      historyIncludes("email otvorena"))

  const isEmailFailed =
    !isEmailAnswered &&
    !isEmailOpened &&
    (emailLogs.some(
      (l) =>
        (l.status || "").toLowerCase().includes("grešk") ||
        (l.status || "").toLowerCase().includes("pogrešn") ||
        (l.status || "").toLowerCase().includes("nevažeć") ||
        (l.status || "").toLowerCase().includes("bounce") ||
        (l.status || "").toLowerCase().includes("fail") ||
        (l.outcome || "").toLowerCase().includes("grešk") ||
        (l.outcome || "").toLowerCase().includes("pogrešn") ||
        (l.outcome || "").toLowerCase().includes("nevažeć") ||
        (l.outcome || "").toLowerCase().includes("nxdomain") ||
        (l.outcome || "").toLowerCase().includes("fail")
    ) ||
      historyIncludes("email: greška") ||
      historyIncludes("email: pogrešan") ||
      historyIncludes("email: nevažeći") ||
      historyIncludes("email: bounce") ||
      historyIncludes("email fail"))

  const isEmailSent =
    isEmailAnswered ||
    isEmailOpened ||
    isEmailFailed ||
    emailLogs.length > 0 ||
    historyIncludes("email: poslano") ||
    historyIncludes("email: poslana") ||
    historyIncludes("email poslan")

  const emailStatus: ChannelStatus = isEmailAnswered
    ? {
        label: "Odgovoreno",
        color: "text-emerald-600 dark:text-emerald-400",
        iconColor: "text-emerald-500",
        hasCheck: true,
        tooltip: "Klijent je odgovorio na email",
      }
    : isEmailOpened
    ? {
        label: "Otvorena",
        color: "text-amber-600 dark:text-amber-400",
        iconColor: "text-amber-500",
        tooltip: "Email je otvoren i pregledan od strane klijenta",
      }
    : isEmailFailed
    ? {
        label: "Pogrešan email",
        color: "text-rose-600 dark:text-rose-400",
        iconColor: "text-rose-500",
        tooltip: "Email adresa je nevažeća, ne postoji ili je slanje odbijeno",
      }
    : isEmailSent
    ? {
        label: "Poslano",
        color: "text-blue-600 dark:text-blue-400",
        iconColor: "text-blue-500",
        tooltip: "Email je poslan",
      }
    : {
        label: "Nema akcije",
        color: "text-muted-foreground/60",
        iconColor: "text-muted-foreground/40",
        tooltip: "Nema zabilježenog email kontakta",
      }

  // 2. WHATSAPP
  const waLogs = logs.filter((l) => {
    const ch = (l.channel || "").toLowerCase()
    return ch.includes("whatsapp") || ch.includes("poruk") || ch.includes("sms") || ch.includes("chat")
  })
  const isWaAnswered =
    waLogs.some(
      (l) =>
        (l.status || "").toLowerCase().includes("odgovor") ||
        (l.outcome || "").toLowerCase().includes("odgovor") ||
        (l.outcome || "").toLowerCase().includes("pozitiv") ||
        (l.outcome || "").toLowerCase().includes("zainteresov")
    ) || historyIncludes("whatsapp: odgovoreno") || historyIncludes("wa: odgovoreno")

  const isWaOpened =
    !isWaAnswered &&
    (waLogs.some(
      (l) =>
        (l.status || "").toLowerCase().includes("otvor") ||
        (l.outcome || "").toLowerCase().includes("otvor") ||
        (l.status || "").toLowerCase().includes("pročit") ||
        (l.outcome || "").toLowerCase().includes("pročit")
    ) || historyIncludes("whatsapp: pročitano") || historyIncludes("wa: pročitano"))

  const isWaFailed =
    !isWaAnswered &&
    !isWaOpened &&
    (waLogs.some(
      (l) =>
        (l.status || "").toLowerCase().includes("grešk") ||
        (l.status || "").toLowerCase().includes("fail") ||
        (l.outcome || "").toLowerCase().includes("grešk")
    ) || historyIncludes("whatsapp: greška") || historyIncludes("wa: greška"))

  const isWaSent =
    isWaAnswered ||
    isWaOpened ||
    isWaFailed ||
    waLogs.length > 0 ||
    historyIncludes("whatsapp: poslano") ||
    historyIncludes("wa: poslano")

  const waStatus: ChannelStatus = isWaAnswered
    ? {
        label: "Odgovoreno",
        color: "text-emerald-600 dark:text-emerald-400",
        iconColor: "text-emerald-500",
        hasCheck: true,
        tooltip: "Klijent je odgovorio na poruku",
      }
    : isWaOpened
    ? {
        label: "Pročitano",
        color: "text-purple-600 dark:text-purple-400",
        iconColor: "text-purple-500",
        tooltip: "WhatsApp poruka je pročitana",
      }
    : isWaFailed
    ? {
        label: "Greška",
        color: "text-red-600 dark:text-red-400",
        iconColor: "text-red-500",
        tooltip: "Greška pri slanju WhatsApp poruke",
      }
    : isWaSent
    ? {
        label: "Poslano",
        color: "text-blue-600 dark:text-blue-400",
        iconColor: "text-blue-500",
        tooltip: "WhatsApp poruka je poslana",
      }
    : {
        label: "Nema akcije",
        color: "text-muted-foreground/60",
        iconColor: "text-muted-foreground/40",
        tooltip: "Nema zabilježene WhatsApp poruke",
      }

  // 3. TELEFON
  const phoneLogs = logs.filter((l) => {
    const ch = (l.channel || "").toLowerCase()
    return ch.includes("telefon") || ch.includes("poziv") || ch.includes("tel")
  })
  const isPhoneAnswered =
    phoneLogs.some(
      (l) =>
        (l.status || "").toLowerCase().includes("uspješ") ||
        (l.status || "").toLowerCase().includes("obavlj") ||
        (l.outcome || "").toLowerCase().includes("odgovor") ||
        (l.outcome || "").toLowerCase().includes("sastanak") ||
        (l.outcome || "").toLowerCase().includes("zainteresov")
    ) || historyIncludes("telefon: obavljeno") || historyIncludes("poziv: obavljeno")

  const isPhoneMissed =
    !isPhoneAnswered &&
    phoneLogs.some(
      (l) =>
        (l.status || "").toLowerCase().includes("propušten") ||
        (l.status || "").toLowerCase().includes("nije")
    )

  const isPhoneAttempted = isPhoneAnswered || isPhoneMissed || phoneLogs.length > 0 || historyIncludes("telefon: poslano")

  const phoneStatus: ChannelStatus = isPhoneAnswered
    ? {
        label: "Obavljeno",
        color: "text-purple-600 dark:text-purple-400",
        iconColor: "text-purple-500",
        hasCheck: true,
        tooltip: "Telefonski poziv je uspješno obavljen",
      }
    : isPhoneMissed
    ? {
        label: "Propušteno",
        color: "text-amber-600 dark:text-amber-400",
        iconColor: "text-amber-500",
        tooltip: "Poziv je propušten",
      }
    : isPhoneAttempted
    ? {
        label: "Pozvano",
        color: "text-blue-600 dark:text-blue-400",
        iconColor: "text-blue-500",
        tooltip: "Poziv je iniciran",
      }
    : {
        label: "Nema akcije",
        color: "text-muted-foreground/60",
        iconColor: "text-muted-foreground/40",
        tooltip: "Nema zabilježenog telefonskog poziva",
      }

  return { email: emailStatus, whatsapp: waStatus, phone: phoneStatus }
}

interface LeadsTableProps {
  leads: Lead[]
  companies: Company[]
  total: number
  page: number
  limit: number
  totalPages: number
  status: string
  onOpenView?: (lead: Lead) => void
  onOpenEdit?: (lead: Lead) => void
  onOpenDelete?: (lead: Lead) => void
  onOpenCreate?: () => void
}

const STATUS_FILTERS = [
  { label: "Svi statusi", value: "all" },
  { label: "Novi", value: "Novi" },
  { label: "Kontaktiran", value: "Kontaktiran" },
  { label: "Kvalifikovan", value: "Kvalifikovan" },
  { label: "U pregovorima", value: "U pregovorima" },
  { label: "Zaključeno - Dobijeno", value: "Zaključeno - Dobijeno" },
  { label: "Odbijeno", value: "Odbijeno" },
  { label: "Ne javlja se", value: "Ne javlja se" },
]

export function LeadsTable({
  leads,
  companies,
  total,
  page,
  limit,
  totalPages,
  status: initialStatus,
  onOpenView,
  onOpenEdit,
  onOpenDelete,
  onOpenCreate,
}: LeadsTableProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [isPending, startTransition] = React.useTransition()

  // Sheet & Dialog State for standalone usage
  const [sheetOpen, setSheetOpen] = React.useState(false)
  const [sheetMode, setSheetMode] = React.useState<"create" | "edit" | "view">("create")
  const [selectedLead, setSelectedLead] = React.useState<Lead | null>(null)

  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
  const [leadToDelete, setLeadToDelete] = React.useState<Lead | null>(null)

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

  const handleOpenCreate = () => {
    if (onOpenCreate) return onOpenCreate()
    setSelectedLead(null)
    setSheetMode("create")
    setSheetOpen(true)
  }

  const handleOpenView = (lead: Lead) => {
    if (onOpenView) return onOpenView(lead)
    setSelectedLead(lead)
    setSheetMode("view")
    setSheetOpen(true)
  }

  const handleOpenEdit = (lead: Lead) => {
    if (onOpenEdit) return onOpenEdit(lead)
    setSelectedLead(lead)
    setSheetMode("edit")
    setSheetOpen(true)
  }

  const handleOpenDelete = (lead: Lead) => {
    if (onOpenDelete) return onOpenDelete(lead)
    setLeadToDelete(lead)
    setDeleteDialogOpen(true)
  }

  const handleActionSuccess = () => {
    router.refresh()
  }

  const startIndex = (page - 1) * limit + 1
  const endIndex = Math.min(page * limit, total)

  return (
    <div className="space-y-4 w-full min-w-0 max-w-full">
      {/* Filters Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <RiFilter3Line className="size-4 text-muted-foreground shrink-0" />
          <select
            value={initialStatus || "all"}
            onChange={(e) => updateQuery({ status: e.target.value, page: 1 })}
            className="h-9 px-3 rounded-lg border border-border bg-background text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-primary/40"
          >
            {STATUS_FILTERS.map((st) => (
              <option key={st.value} value={st.value}>
                {st.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3 justify-between sm:justify-end">
          <div className="text-xs text-muted-foreground">
            Ukupno: <span className="font-medium text-foreground">{total}</span> leadova
          </div>
        </div>
      </div>

      {/* Table Container with Internal Horizontal Scroll */}
      <div className="rounded-xl border border-border bg-card overflow-x-auto w-full max-w-full">
        <Table className="min-w-[1080px] w-full">
          <TableHeader>
            <TableRow className="hover:bg-transparent bg-muted/40">
              <TableHead className="font-semibold text-xs text-muted-foreground uppercase tracking-wider min-w-[200px]">Kompanija</TableHead>
              <TableHead className="font-semibold text-xs text-muted-foreground uppercase tracking-wider min-w-[110px]">AI Score</TableHead>
              <TableHead className="font-semibold text-xs text-muted-foreground uppercase tracking-wider min-w-[130px]">Status</TableHead>
              <TableHead className="font-semibold text-xs text-muted-foreground uppercase tracking-wider min-w-[160px]">Komunikacija</TableHead>
              <TableHead className="font-semibold text-xs text-muted-foreground uppercase tracking-wider min-w-[240px] max-w-[300px]">Analiza</TableHead>
              <TableHead className="font-semibold text-xs text-muted-foreground uppercase tracking-wider min-w-[120px] whitespace-nowrap">Historija</TableHead>
              <TableHead className="font-semibold text-xs text-muted-foreground uppercase tracking-wider text-right min-w-[130px] whitespace-nowrap">Akcije</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-48 text-center">
                  <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                    <RiUserSearchLine className="size-8 opacity-40" />
                    <p className="font-medium text-sm text-foreground">Nema pronađenih leadova</p>
                    <p className="text-xs">
                      {initialStatus ? "Nema leadova sa odabranim statusom." : "Kliknite na 'Dodaj lead' za kreiranje prvog leada."}
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleOpenCreate}
                      className="mt-2 gap-1.5 cursor-pointer"
                    >
                      <RiAddLine className="size-4" />
                      Dodaj lead
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              leads.map((lead) => {
                const companyObj =
                  typeof lead.company === "object" && lead.company
                    ? lead.company
                    : companies.find((c) => c.$id === lead.company)
                const companyName = companyObj?.company_name || "—"
                const companyCity = companyObj?.city || ""
                const scoreInfo = calculateLeadScore(lead, companyObj)
                const phone = companyObj?.phones?.[0] || ""
                const whatsappUrl = phone ? getWhatsAppLink(phone, companyName) : ""

                return (
                  <TableRow
                    key={lead.$id}
                    className="hover:bg-muted/40 transition-colors group cursor-pointer"
                    onClick={() => handleOpenView(lead)}
                  >
                    {/* Kompanija */}
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <span className="font-semibold text-foreground text-sm group-hover:text-primary transition-colors flex items-center gap-1.5">
                          <RiBuilding2Line className="size-3.5 text-muted-foreground" />
                          {companyName}
                        </span>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap">
                          {companyCity && <span>{companyCity}</span>}
                          {companyCity && companyObj?.website && <span>•</span>}
                          {companyObj?.website && (
                            <a
                              href={
                                companyObj.website.startsWith("http")
                                  ? companyObj.website
                                  : `https://${companyObj.website}`
                              }
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-primary hover:underline inline-flex items-center gap-1 font-mono text-[11px]"
                              title={`Otvori web stranicu: ${companyObj.website}`}
                            >
                              <RiGlobalLine className="size-3 text-muted-foreground" />
                              <span>{companyObj.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}</span>
                            </a>
                          )}
                        </div>
                      </div>
                    </TableCell>

                    {/* AI Score */}
                    <TableCell>
                      <Badge
                        variant={scoreInfo.tier === "hot" ? "default" : "secondary"}
                        className={`text-xs gap-1 font-bold ${
                          scoreInfo.tier === "hot"
                            ? "bg-amber-600 hover:bg-amber-700 text-white"
                            : ""
                        }`}
                        title={scoreInfo.reasons.join(", ")}
                      >
                        {scoreInfo.score >= 75 && <RiFireLine className="size-3" />}
                        {scoreInfo.score} / 100
                      </Badge>
                    </TableCell>

                    {/* Status */}
                    <TableCell>
                      <Badge
                        variant={
                          lead.status === "Zaključeno - Dobijeno"
                            ? "default"
                            : lead.status === "Odbijeno"
                            ? "destructive"
                            : "secondary"
                        }
                        className="text-xs"
                      >
                        {lead.status || "Novi"}
                      </Badge>
                    </TableCell>

                    {/* Komunikacija */}
                    <TableCell>
                      {(() => {
                        const comm = getLeadCommunicationStatus(lead)
                        return (
                          <div className="flex flex-col gap-1.5 py-1 text-xs">
                            {/* Email */}
                            <div
                              className={cn("flex items-center gap-1.5 font-medium leading-none", comm.email.color)}
                              title={comm.email.tooltip}
                            >
                              <RiMailLine className={cn("size-3.5 shrink-0", comm.email.iconColor)} />
                              <span className="text-[11px]">{comm.email.label}</span>
                              {comm.email.hasCheck && (
                                <RiCheckboxCircleLine className="size-3 text-emerald-500 shrink-0" />
                              )}
                            </div>

                            {/* WhatsApp */}
                            <div
                              className={cn("flex items-center gap-1.5 font-medium leading-none", comm.whatsapp.color)}
                              title={comm.whatsapp.tooltip}
                            >
                              <RiChat3Line className={cn("size-3.5 shrink-0", comm.whatsapp.iconColor)} />
                              <span className="text-[11px]">{comm.whatsapp.label}</span>
                              {comm.whatsapp.hasCheck && (
                                <RiCheckboxCircleLine className="size-3 text-emerald-500 shrink-0" />
                              )}
                            </div>

                            {/* Telefon */}
                            <div
                              className={cn("flex items-center gap-1.5 font-medium leading-none", comm.phone.color)}
                              title={comm.phone.tooltip}
                            >
                              <RiPhoneLine className={cn("size-3.5 shrink-0", comm.phone.iconColor)} />
                              <span className="text-[11px]">{comm.phone.label}</span>
                              {comm.phone.hasCheck && (
                                <RiCheckboxCircleLine className="size-3 text-purple-500 shrink-0" />
                              )}
                            </div>
                          </div>
                        )
                      })()}
                    </TableCell>

                    {/* Analiza Tagovi */}
                    <TableCell className="max-w-[220px] overflow-hidden">
                      <div className="flex flex-col gap-1 items-start max-w-full">
                        {lead.analysis && lead.analysis.length > 0 ? (
                          <>
                            {lead.analysis.slice(0, 2).map((tag, idx) => {
                              const cleanTag = String(tag || "").trim()
                              const truncatedText = cleanTag.length > 30 ? cleanTag.slice(0, 28).trim() + "..." : cleanTag
                              return (
                                <span
                                  key={idx}
                                  className="inline-block text-[11px] leading-snug px-2 py-0.5 rounded-md border border-border bg-muted/40 text-foreground truncate max-w-[210px]"
                                  title={cleanTag}
                                >
                                  {truncatedText}
                                </span>
                              )
                            })}
                            {lead.analysis.length > 2 && (
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-medium">
                                +{lead.analysis.length - 2} još
                              </Badge>
                            )}
                          </>
                        ) : (
                          <span className="text-muted-foreground/60 text-xs">—</span>
                        )}
                      </div>
                    </TableCell>

                    {/* Historija Kontakata */}
                    <TableCell className="whitespace-nowrap">
                      <span className="text-xs text-muted-foreground inline-flex items-center gap-1.5 whitespace-nowrap">
                        <RiHistoryLine className="size-3.5 text-muted-foreground/70 shrink-0" />
                        {lead.contact_logs && lead.contact_logs.length > 0 ? (
                          <span className="font-medium text-foreground">
                            {lead.contact_logs.length} zapisa
                          </span>
                        ) : (
                          <span>0 zapisa</span>
                        )}
                      </span>
                    </TableCell>

                    {/* Akcije */}
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        {phone && (
                          <>
                            <a
                              href={`tel:${phone}`}
                              className="size-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-emerald-600 hover:bg-muted"
                              title={`Pozovi: ${phone}`}
                            >
                              <RiPhoneLine className="size-4" />
                            </a>
                            {whatsappUrl && (
                              <a
                                href={whatsappUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="size-8 rounded-lg flex items-center justify-center text-green-600 hover:bg-green-500/10"
                                title="Pošalji WhatsApp poruku"
                              >
                                <RiWhatsappLine className="size-4" />
                              </a>
                            )}
                          </>
                        )}

                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-muted-foreground hover:text-primary cursor-pointer"
                          title="Pregledaj"
                          onClick={() => handleOpenView(lead)}
                        >
                          <RiEyeLine className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-muted-foreground hover:text-primary cursor-pointer"
                          title="Uredi"
                          onClick={() => handleOpenEdit(lead)}
                        >
                          <RiEditLine className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-muted-foreground hover:text-destructive cursor-pointer"
                          title="Obriši"
                          onClick={() => handleOpenDelete(lead)}
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

      {/* Slide-over Sheet (Only when standalone) */}
      {!onOpenView && (
        <>
          <LeadSheet
            lead={selectedLead}
            companies={companies}
            mode={sheetMode}
            open={sheetOpen}
            onOpenChange={setSheetOpen}
            onSuccess={handleActionSuccess}
            onSwitchToEdit={() => setSheetMode("edit")}
          />

          <DeleteLeadDialog
            lead={leadToDelete}
            open={deleteDialogOpen}
            onOpenChange={setDeleteDialogOpen}
            onSuccess={handleActionSuccess}
          />
        </>
      )}
    </div>
  )
}
