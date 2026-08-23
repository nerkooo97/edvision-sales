"use client"

import * as React from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { type Lead } from "@/lib/appwrite/leads"
import { STATUS_DESCRIPTIONS } from "@/lib/constants"
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
  RiInformationLine,
} from "@remixicon/react"
import { calculateLeadScore, getWhatsAppLink } from "@/lib/scoring"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

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
      <div className="rounded-xl border border-border bg-card overflow-hidden w-full max-w-full">
        <Table className="min-w-[1020px] w-full">
          <TableHeader>
            <TableRow className="hover:bg-transparent bg-muted/40">
              <TableHead className="font-semibold text-xs text-muted-foreground uppercase tracking-wider min-w-[200px]">Kompanija</TableHead>
              <TableHead className="font-semibold text-xs text-muted-foreground uppercase tracking-wider min-w-[130px]">AI Score</TableHead>
              <TableHead className="font-semibold text-xs text-muted-foreground uppercase tracking-wider min-w-[140px]">Status</TableHead>
              <TableHead className="font-semibold text-xs text-muted-foreground uppercase tracking-wider min-w-[190px]">Dostupni Kanali</TableHead>
              <TableHead className="font-semibold text-xs text-muted-foreground uppercase tracking-wider min-w-[180px]">Analiza</TableHead>
              <TableHead className="font-semibold text-xs text-muted-foreground uppercase tracking-wider min-w-[150px]">Historija</TableHead>
              <TableHead className="font-semibold text-xs text-muted-foreground uppercase tracking-wider text-right min-w-[140px]">Akcije</TableHead>
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
                        {companyCity && (
                          <span className="text-xs text-muted-foreground">
                            {companyCity}
                          </span>
                        )}
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
                      <div className="flex items-center gap-1.5">
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
                        <Tooltip>
                          <TooltipTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <RiInformationLine className="size-4 text-muted-foreground/60 hover:text-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-[200px]">
                            <p className="text-xs">{STATUS_DESCRIPTIONS[lead.status || "Novi"] || "Nedefinisan status."}</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </TableCell>

                    {/* Dostupni Kanali */}
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-0.5 text-[11px] font-medium px-1.5 py-0.5 rounded-md ${
                            lead.has_web ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-muted text-muted-foreground opacity-50"
                          }`}
                          title={lead.has_web ? "Web stranica postoji" : "Nema web stranice"}
                        >
                          <RiGlobalLine className="size-3" /> Web
                        </span>

                        <span
                          className={`inline-flex items-center gap-0.5 text-[11px] font-medium px-1.5 py-0.5 rounded-md ${
                            lead.has_email ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-muted text-muted-foreground opacity-50"
                          }`}
                          title={lead.has_email ? "Email postoji" : "Nema emaila"}
                        >
                          <RiMailLine className="size-3" /> Email
                        </span>

                        <span
                          className={`inline-flex items-center gap-0.5 text-[11px] font-medium px-1.5 py-0.5 rounded-md ${
                            lead.has_phone ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-muted text-muted-foreground opacity-50"
                          }`}
                          title={lead.has_phone ? "Telefon postoji" : "Nema telefona"}
                        >
                          <RiPhoneLine className="size-3" /> Tel
                        </span>
                      </div>
                    </TableCell>

                    {/* Analiza Tagovi */}
                    <TableCell>
                      <div className="flex flex-wrap gap-1 max-w-[220px]">
                        {lead.analysis && lead.analysis.length > 0 ? (
                          lead.analysis.slice(0, 2).map((tag, idx) => (
                            <Badge key={idx} variant="outline" className="text-[10px] px-1.5 py-0">
                              {tag}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-muted-foreground/60 text-xs">—</span>
                        )}
                        {lead.analysis && lead.analysis.length > 2 && (
                          <Badge variant="secondary" className="text-[10px] px-1 py-0">
                            +{lead.analysis.length - 2}
                          </Badge>
                        )}
                      </div>
                    </TableCell>

                    {/* Historija Kontakata */}
                    <TableCell>
                      <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <RiHistoryLine className="size-3.5 text-muted-foreground/70" />
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
