"use client"

import * as React from "react"
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd"
import type { Lead } from "@/lib/appwrite/leads"
import type { Company } from "@/lib/appwrite/companies"
import { updateLead } from "@/lib/appwrite/leads"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  RiAddLine,
  RiEditLine,
  RiDeleteBinLine,
  RiHistoryLine,
  RiDraggable,
  RiPhoneLine,
  RiWhatsappLine,
  RiInformationLine,
  RiGlobalLine,
} from "@remixicon/react"
import { calculateLeadScore, getWhatsAppLink } from "@/lib/scoring"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

interface LeadsKanbanBoardProps {
  leads: Lead[]
  companies: Company[]
  onOpenView: (lead: Lead) => void
  onOpenEdit: (lead: Lead) => void
  onOpenDelete: (lead: Lead) => void
  onOpenCreate: (initialStatus?: string) => void
  onDataChange?: () => void
}

interface ColumnDef {
  id: string
  title: string
  accentColor: string
  badgeVariant: "default" | "secondary" | "destructive" | "outline"
  description: string
}

const COLUMNS: ColumnDef[] = [
  { id: "Novi", title: "Novi", accentColor: "border-t-blue-500", badgeVariant: "secondary", description: "Leadovi spremni za inicijalni kontakt i analizu weba." },
  { id: "Kontaktiran", title: "Kontaktiran", accentColor: "border-t-amber-500", badgeVariant: "secondary", description: "Poslat prvi email s prijedlogom i analizom, čekamo odgovor." },
  { id: "Kvalifikovan", title: "Kvalifikovan", accentColor: "border-t-purple-500", badgeVariant: "secondary", description: "Odgovara idealnom profilu klijenta, spreman za prodajni pitch." },
  { id: "U pregovorima", title: "U pregovorima", accentColor: "border-t-indigo-500", badgeVariant: "secondary", description: "Odgovorili na email ili pokazali interes, aktivna komunikacija." },
  { id: "Zaključeno - Dobijeno", title: "Dobijeno", accentColor: "border-t-emerald-500", badgeVariant: "default", description: "Uspješno zatvoren posao, dogovorena saradnja." },
  { id: "Odbijeno", title: "Odbijeno", accentColor: "border-t-rose-500", badgeVariant: "destructive", description: "Nisu zainteresovani ili nemaju budžet za usluge." },
  { id: "Ne javlja se", title: "Ne javlja se", accentColor: "border-t-zinc-400", badgeVariant: "outline", description: "Leadovi koji ne odgovaraju nakon nekoliko pokušaja i podsjetnika." },
]

function KanbanBoardInner({
  leads,
  companies,
  onOpenView,
  onOpenEdit,
  onOpenDelete,
  onOpenCreate,
  onDataChange,
}: LeadsKanbanBoardProps) {
  const [localLeads, setLocalLeads] = React.useState<Lead[]>(leads)

  // Group leads by column status
  const columnsData = React.useMemo(() => {
    const map: Record<string, Lead[]> = {}
    COLUMNS.forEach((col) => {
      map[col.id] = []
    })

    localLeads.forEach((lead) => {
      const st = lead.status && map[lead.status] ? lead.status : "Novi"
      if (!map[st]) map[st] = []
      map[st].push(lead)
    })

    return map
  }, [localLeads])

  const handleDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result
    if (!destination) return
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return
    }

    const newStatus = destination.droppableId

    // Optimistically update local leads
    const updated = localLeads.map((l) => {
      if (l.$id === draggableId) {
        return { ...l, status: newStatus }
      }
      return l
    })
    setLocalLeads(updated)

    // Persist to Appwrite
    const res = await updateLead(draggableId, { status: newStatus })
    if (!res.success) {
      // Revert if error
      setLocalLeads(leads)
    } else {
      onDataChange?.()
    }
  }

  return (
    <div className="w-full min-w-0 max-w-full overflow-x-auto pb-4">
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="inline-flex gap-4 items-start min-w-[1350px] px-1">
          {COLUMNS.map((column) => {
            const columnLeads = columnsData[column.id] || []

            return (
              <div
                key={column.id}
                className="w-[280px] shrink-0 flex flex-col rounded-2xl border border-border bg-muted/30 overflow-hidden"
              >
                {/* Column Header */}
                <div
                  className={`px-4 py-3 border-b border-border bg-card border-t-4 ${column.accentColor} flex items-center justify-between`}
                >
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-xs text-foreground tracking-tight flex items-center gap-1.5">
                      {column.title}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <RiInformationLine className="size-3.5 text-muted-foreground/60 hover:text-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-[200px]">
                          <p className="text-xs">{column.description}</p>
                        </TooltipContent>
                      </Tooltip>
                    </h3>
                    <span className="flex size-5 items-center justify-center rounded-full bg-muted text-[11px] font-bold text-muted-foreground">
                      {columnLeads.length}
                    </span>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-6 text-muted-foreground hover:text-foreground cursor-pointer"
                    onClick={() => onOpenCreate(column.id)}
                    title={`Dodaj lead u ${column.title}`}
                  >
                    <RiAddLine className="size-3.5" />
                  </Button>
                </div>

                {/* Droppable Area */}
                <Droppable droppableId={column.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`p-2.5 flex flex-col gap-2.5 min-h-[380px] max-h-[calc(100vh-280px)] overflow-y-auto transition-colors ${
                        snapshot.isDraggingOver ? "bg-primary/5 rounded-b-2xl" : ""
                      }`}
                    >
                      {columnLeads.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-32 text-center text-muted-foreground text-xs p-3 border border-dashed border-border/60 rounded-xl">
                          <span>Nema leadova</span>
                          <button
                            type="button"
                            onClick={() => onOpenCreate(column.id)}
                            className="mt-1 text-primary hover:underline text-[11px] font-medium inline-flex items-center gap-0.5 cursor-pointer"
                          >
                            <RiAddLine className="size-3" /> Dodaj
                          </button>
                        </div>
                      ) : (
                        columnLeads.map((lead, index) => {
                          const companyObj =
                            typeof lead.company === "object" && lead.company
                              ? lead.company
                              : companies.find((c) => c.$id === lead.company)
                          const companyName = companyObj?.company_name || "Lead bez firme"
                          const companyCity = companyObj?.city || ""
                          const scoreInfo = calculateLeadScore(lead, companyObj)
                          const phone = companyObj?.phones?.[0] || ""
                          const whatsappUrl = phone ? getWhatsAppLink(phone, companyName) : ""

                          return (
                            <Draggable
                              key={lead.$id}
                              draggableId={lead.$id}
                              index={index}
                            >
                              {(dragProvided, dragSnapshot) => (
                                <div
                                  ref={dragProvided.innerRef}
                                  {...dragProvided.draggableProps}
                                  onClick={() => onOpenView(lead)}
                                  className={`group rounded-xl border border-border bg-card p-3 shadow-xs transition-all cursor-pointer select-none space-y-2.5 hover:border-primary/50 hover:shadow-md ${
                                    dragSnapshot.isDragging
                                      ? "rotate-2 shadow-xl ring-2 ring-primary/40 opacity-95"
                                      : ""
                                  }`}
                                >
                                  {/* Card Top: Drag handle & Company */}
                                  <div className="flex items-start justify-between gap-1.5">
                                    <div className="space-y-1 flex-1 min-w-0">
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <h4 className="font-semibold text-xs text-foreground group-hover:text-primary transition-colors truncate">
                                          {companyName}
                                        </h4>
                                        <Badge
                                          variant={scoreInfo.tier === "hot" ? "default" : "secondary"}
                                          className={`text-[9px] px-1 py-0 font-bold ${
                                            scoreInfo.tier === "hot"
                                              ? "bg-amber-600 text-white"
                                              : ""
                                          }`}
                                        >
                                          {scoreInfo.score}
                                        </Badge>
                                      </div>
                                      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground truncate">
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
                                            className="text-primary hover:underline inline-flex items-center gap-0.5 font-mono text-[10px]"
                                            title={`Otvori web stranicu: ${companyObj.website}`}
                                          >
                                            <RiGlobalLine className="size-2.5 text-muted-foreground" />
                                            <span className="truncate max-w-[100px]">{companyObj.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}</span>
                                          </a>
                                        )}
                                      </div>
                                    </div>

                                    <div
                                      {...dragProvided.dragHandleProps}
                                      className="text-muted-foreground/40 hover:text-foreground cursor-grab active:cursor-grabbing p-0.5 shrink-0"
                                      title="Prevuci karticu"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <RiDraggable className="size-4" />
                                    </div>
                                  </div>

                                  {/* Channel Indicators & Quick Connect */}
                                  <div className="flex items-center justify-between gap-1.5 pt-0.5">
                                    <div className="flex items-center gap-1.5">
                                      <span
                                        className={`size-2 rounded-full ${
                                          lead.has_web ? "bg-emerald-500" : "bg-muted-foreground/30"
                                        }`}
                                        title={lead.has_web ? "Web dostupan" : "Nema weba"}
                                      />
                                      <span
                                        className={`size-2 rounded-full ${
                                          lead.has_email ? "bg-emerald-500" : "bg-muted-foreground/30"
                                        }`}
                                        title={lead.has_email ? "Email dostupan" : "Nema emaila"}
                                      />
                                      <span
                                        className={`size-2 rounded-full ${
                                          lead.has_phone ? "bg-emerald-500" : "bg-muted-foreground/30"
                                        }`}
                                        title={lead.has_phone ? "Telefon dostupan" : "Nema telefona"}
                                      />

                                      <span className="text-[10px] text-muted-foreground ml-1">
                                        {lead.has_web ? "Web " : ""}
                                        {lead.has_email ? "Email " : ""}
                                        {lead.has_phone ? "Tel" : ""}
                                        {!lead.has_web && !lead.has_email && !lead.has_phone ? "Bez kanala" : ""}
                                      </span>
                                    </div>

                                    {/* Direct Quick WhatsApp if phone exists */}
                                    {whatsappUrl && (
                                      <a
                                        href={whatsappUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-green-500/10 text-green-600 hover:bg-green-500/20 text-[10px] font-medium"
                                        title="Brzi WhatsApp"
                                      >
                                        <RiWhatsappLine className="size-3" /> WA
                                      </a>
                                    )}
                                  </div>

                                  {/* Analysis Tags preview */}
                                  {lead.analysis && lead.analysis.length > 0 && (
                                    <div className="flex flex-wrap gap-1">
                                      {lead.analysis.slice(0, 2).map((tag, idx) => (
                                        <Badge
                                          key={idx}
                                          variant="secondary"
                                          className="text-[10px] px-1.5 py-0 font-normal truncate max-w-[200px]"
                                        >
                                          {tag}
                                        </Badge>
                                      ))}
                                      {lead.analysis.length > 2 && (
                                        <span className="text-[10px] text-muted-foreground self-center">
                                          +{lead.analysis.length - 2}
                                        </span>
                                      )}
                                    </div>
                                  )}

                                  {/* Card Bottom Meta & Actions */}
                                  <div className="flex items-center justify-between pt-1 border-t border-border/50 text-[11px] text-muted-foreground">
                                    <div className="flex items-center gap-1">
                                      <RiHistoryLine className="size-3" />
                                      <span>
                                        {lead.contact_logs?.length || lead.contact_history?.length || 0} kont.
                                      </span>
                                    </div>

                                    {/* Action Buttons */}
                                    <div
                                      className="flex items-center gap-0.5 opacity-80 group-hover:opacity-100"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      {phone && (
                                        <a
                                          href={`tel:${phone}`}
                                          className="size-6 rounded flex items-center justify-center text-muted-foreground hover:text-emerald-600"
                                          title={`Pozovi: ${phone}`}
                                        >
                                          <RiPhoneLine className="size-3.5" />
                                        </a>
                                      )}
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="size-6 text-muted-foreground hover:text-primary cursor-pointer"
                                        title="Uredi"
                                        onClick={() => onOpenEdit(lead)}
                                      >
                                        <RiEditLine className="size-3.5" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="size-6 text-muted-foreground hover:text-destructive cursor-pointer"
                                        title="Obriši"
                                        onClick={() => onOpenDelete(lead)}
                                      >
                                        <RiDeleteBinLine className="size-3.5" />
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          )
                        })
                      )}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            )
          })}
        </div>
      </DragDropContext>
    </div>
  )
}

export function LeadsKanbanBoard(props: LeadsKanbanBoardProps) {
  const syncKey = props.leads.map((l) => `${l.$id}-${l.status}-${l.$updatedAt}`).join(",")

  return <KanbanBoardInner key={syncKey} {...props} />
}
