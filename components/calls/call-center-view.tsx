"use client"

import * as React from "react"
import type { Lead } from "@/lib/appwrite/leads"
import type { Company } from "@/lib/appwrite/companies"
import type { ContactLog, ContactLogInput } from "@/lib/appwrite/contact-logs"
import { updateLead } from "@/lib/appwrite/leads"
import { getContactLogsByLeadId, createContactLog } from "@/lib/appwrite/contact-logs"
import { calculateLeadScore, getWhatsAppLink } from "@/lib/scoring"
import { STATUS_DESCRIPTIONS } from "@/lib/constants"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

import {
  RiPhoneLine,
  RiWhatsappLine,
  RiMailLine,
  RiBuilding2Line,
  RiGlobalLine,
  RiMapPinLine,
  RiUserVoiceLine,
  RiFireLine,
  RiHistoryLine,
  RiInformationLine,
  RiCheckLine,
  RiTimeLine,
  RiSendPlaneLine,
} from "@remixicon/react"

interface CallCenterViewProps {
  leads: Lead[]
  companies: Company[]
}

const CHANNELS = ["Email", "Telefon", "WhatsApp", "Sastanak", "LinkedIn", "Drugo"]
const OUTCOME_OPTIONS = [
  "Zainteresovan",
  "Poslata ponuda",
  "Dogovoren sastanak",
  "Čeka se odgovor",
  "Odbio ponudu",
  "Ne javlja se / Bez odgovora",
  "Informacije proslijeđene",
  "Uspješan kontakt",
]

const STATUS_OPTIONS = [
  "Novi",
  "Kontaktiran",
  "Kvalifikovan",
  "U pregovorima",
  "Zaključeno - Dobijeno",
  "Odbijeno",
  "Ne javlja se",
]

export function CallCenterView({ leads, companies }: CallCenterViewProps) {
  const [selectedLeadId, setSelectedLeadId] = React.useState<string | null>(
    leads.length > 0 ? leads[0].$id : null
  )

  const selectedLead = React.useMemo(() => {
    return leads.find((l) => l.$id === selectedLeadId) || null
  }, [leads, selectedLeadId])

  const associatedCompany = React.useMemo(() => {
    if (!selectedLead) return null
    return (
      (typeof selectedLead.company === "object" && selectedLead.company) ||
      companies.find((c) => c.$id === (typeof selectedLead.company === "string" ? selectedLead.company : "")) ||
      null
    )
  }, [selectedLead, companies])

  const [contactLogs, setContactLogs] = React.useState<ContactLog[]>([])
  const [isLoadingLogs, setIsLoadingLogs] = React.useState(false)

  // Log Form State
  const [newLog, setNewLog] = React.useState<ContactLogInput>({
    channel: "Telefon",
    recipient: "",
    subject: "Telefonski poziv",
    content: "",
    status: "Poslano",
    outcome: "Zainteresovan",
    contacted_at: "",
    follow_up_date: "",
  })
  const [isSubmittingLog, setIsSubmittingLog] = React.useState(false)
  const [isUpdatingStatus, setIsUpdatingStatus] = React.useState(false)

  const fetchLogs = React.useCallback(async (leadId: string) => {
    setIsLoadingLogs(true)
    try {
      const logs = await getContactLogsByLeadId(leadId)
      setContactLogs(logs)
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoadingLogs(false)
    }
  }, [])

  React.useEffect(() => {
    if (selectedLeadId) {
      fetchLogs(selectedLeadId)
      setNewLog(prev => ({
        ...prev,
        contacted_at: new Date().toISOString().slice(0, 16),
      }))
    } else {
      setContactLogs([])
    }
  }, [selectedLeadId, fetchLogs])

  const handleSaveContactLog = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedLead?.$id) return
    setIsSubmittingLog(true)

    const companyId = associatedCompany?.$id || null

    const result = await createContactLog({
      ...newLog,
      lead: selectedLead.$id,
      company: companyId,
      contacted_at: newLog.contacted_at ? new Date(newLog.contacted_at).toISOString() : new Date().toISOString(),
      follow_up_date: newLog.follow_up_date ? new Date(newLog.follow_up_date).toISOString() : undefined,
    })

    setIsSubmittingLog(false)

    if (result.success) {
      setNewLog({
        channel: "Telefon",
        recipient: "",
        subject: "Telefonski poziv",
        content: "",
        status: "Poslano",
        outcome: "Čeka se odgovor",
        contacted_at: new Date().toISOString().slice(0, 16),
        follow_up_date: "",
      })
      await fetchLogs(selectedLead.$id)
    } else {
      alert(result.error || "Greška pri evidentiranju kontakta.")
    }
  }

  const handleStatusChange = async (newStatus: string) => {
    if (!selectedLead?.$id) return
    setIsUpdatingStatus(true)
    await updateLead(selectedLead.$id, { status: newStatus })
    // In a real scenario you would revalidate or refresh, here we mutate locally to update the UI instantly
    selectedLead.status = newStatus
    setIsUpdatingStatus(false)
  }

  if (leads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground bg-muted/20 rounded-xl border border-dashed border-border">
        <RiUserVoiceLine className="size-10 mb-4 opacity-50" />
        <p>Trenutno nema klijenata za pozvati.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 h-[calc(100vh-140px)] min-h-[600px]">
      
      {/* LEFT PANE: LEAD LIST */}
      <div className="md:col-span-4 lg:col-span-3 border border-border bg-card rounded-xl shadow-xs overflow-hidden flex flex-col">
        <div className="p-3 border-b border-border bg-muted/30">
          <h3 className="font-semibold text-sm">Lista za pozive ({leads.length})</h3>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-thin">
          {leads.map((lead) => {
            const comp =
              (typeof lead.company === "object" && lead.company) ||
              companies.find((c) => c.$id === (typeof lead.company === "string" ? lead.company : ""))

            const isSelected = selectedLeadId === lead.$id
            const companyName = comp?.company_name || "Nepoznata kompanija"
            const scoreInfo = calculateLeadScore(lead, comp || null)

            return (
              <button
                key={lead.$id}
                onClick={() => setSelectedLeadId(lead.$id)}
                className={`w-full text-left p-3 rounded-lg border transition-colors flex flex-col gap-2 ${
                  isSelected
                    ? "bg-primary/10 border-primary shadow-xs"
                    : "bg-background border-transparent hover:bg-muted/50"
                }`}
              >
                <div className="flex items-start justify-between w-full gap-2">
                  <span className="font-semibold text-sm truncate pr-2">{companyName}</span>
                  <Badge
                    variant={scoreInfo.tier === "hot" ? "default" : "secondary"}
                    className={`text-[9px] px-1.5 shrink-0 ${
                      scoreInfo.tier === "hot" ? "bg-amber-600 hover:bg-amber-600 text-white" : ""
                    }`}
                  >
                    {scoreInfo.score}
                  </Badge>
                </div>
                <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground w-full">
                  <Badge variant="outline" className="text-[9px] shrink-0 font-normal py-0">
                    {lead.status}
                  </Badge>
                  {comp?.city && (
                    <span className="truncate flex items-center gap-1 shrink-0 text-[10px]">
                      <RiMapPinLine className="size-3" /> {comp.city}
                    </span>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* RIGHT PANE: DETAIL VIEW */}
      {selectedLead && associatedCompany ? (
        <div className="md:col-span-8 lg:col-span-9 flex flex-col overflow-hidden bg-background rounded-xl border border-border shadow-xs">
          
          {/* Header Info */}
          <div className="p-5 border-b border-border bg-muted/10 space-y-4 shrink-0">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <RiBuilding2Line className="size-5 text-primary" />
                  {associatedCompany.company_name}
                </h2>
                <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground flex-wrap">
                  {associatedCompany.city && (
                    <span className="flex items-center gap-1.5">
                      <RiMapPinLine className="size-4" /> {associatedCompany.city} {associatedCompany.address ? `— ${associatedCompany.address}` : ""}
                    </span>
                  )}
                  {associatedCompany.website && (
                    <a href={associatedCompany.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-primary hover:underline">
                      <RiGlobalLine className="size-4" /> Posjeti sajt
                    </a>
                  )}
                </div>
              </div>
              
              <div className="flex flex-col gap-2 items-end shrink-0">
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground">Status:</Label>
                  <select
                    value={selectedLead.status || "Novi"}
                    onChange={(e) => handleStatusChange(e.target.value)}
                    disabled={isUpdatingStatus}
                    className="h-8 px-2 rounded-lg border border-border bg-background text-xs font-semibold focus:ring-1 focus:ring-primary"
                  >
                    {STATUS_OPTIONS.map(st => <option key={st} value={st}>{st}</option>)}
                  </select>
                </div>
                {(() => {
                  const scoreInfo = calculateLeadScore(selectedLead, associatedCompany)
                  return (
                    <div className="flex items-center gap-1.5 text-xs">
                      <RiFireLine className="size-3.5 text-amber-500" />
                      <span className="font-semibold">Score: <span className="text-amber-600">{scoreInfo.score}/100</span></span>
                    </div>
                  )
                })()}
              </div>
            </div>

            {/* Quick Actions (Call, WhatsApp, Email) */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              {associatedCompany.phones && associatedCompany.phones[0] ? (
                <>
                  <a
                    href={`tel:${associatedCompany.phones[0]}`}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/25 text-sm font-bold transition-colors shadow-xs"
                  >
                    <RiPhoneLine className="size-5" />
                    Pozovi {associatedCompany.phones[0]}
                  </a>
                  {getWhatsAppLink(associatedCompany.phones[0], associatedCompany.company_name) && (
                    <a
                      href={getWhatsAppLink(associatedCompany.phones[0], associatedCompany.company_name)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-green-500/10 text-green-600 hover:bg-green-500/20 text-sm font-semibold transition-colors"
                    >
                      <RiWhatsappLine className="size-4" />
                      WhatsApp
                    </a>
                  )}
                </>
              ) : (
                <span className="px-3 py-2 text-sm text-amber-600 bg-amber-500/10 rounded-lg">Nema unesen broj telefona</span>
              )}

              {associatedCompany.email && (
                <a
                  href={`mailto:${associatedCompany.email}`}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 text-sm font-semibold transition-colors ml-auto sm:ml-0"
                >
                  <RiMailLine className="size-4" />
                  Email
                </a>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Left Side (Log Form + Analysis) */}
            <div className="space-y-6">
              {/* Zabilježi razgovor Forma */}
              <form onSubmit={handleSaveContactLog} className="p-4 rounded-xl border border-border bg-card shadow-xs space-y-4">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <RiSendPlaneLine className="size-4 text-primary" /> Zabilježi razgovor
                </h3>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Kanal</Label>
                    <select
                      value={newLog.channel}
                      onChange={(e) => setNewLog({ ...newLog, channel: e.target.value })}
                      className="w-full h-8 px-2 rounded-md border border-border bg-background text-xs"
                    >
                      {CHANNELS.map((ch) => <option key={ch} value={ch}>{ch}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Ishod razgovora</Label>
                    <select
                      value={newLog.outcome || "Zainteresovan"}
                      onChange={(e) => setNewLog({ ...newLog, outcome: e.target.value })}
                      className="w-full h-8 px-2 rounded-md border border-border bg-background text-xs font-semibold"
                    >
                      {OUTCOME_OPTIONS.map((out) => <option key={out} value={out}>{out}</option>)}
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Bilješke s poziva (dogovor)</Label>
                  <textarea
                    rows={4}
                    required
                    placeholder="O čemu ste pričali, koji su sljedeći koraci..."
                    value={newLog.content || ""}
                    onChange={(e) => setNewLog({ ...newLog, content: e.target.value })}
                    className="w-full p-2.5 rounded-md border border-border bg-background text-xs resize-y"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Kontaktirano</Label>
                    <Input
                      type="datetime-local"
                      value={newLog.contacted_at || ""}
                      onChange={(e) => setNewLog({ ...newLog, contacted_at: e.target.value })}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-amber-600 font-medium">Sljedeći poziv (Follow-up)</Label>
                    <Input
                      type="datetime-local"
                      value={newLog.follow_up_date || ""}
                      onChange={(e) => setNewLog({ ...newLog, follow_up_date: e.target.value })}
                      className="h-8 text-xs border-amber-500/30 bg-amber-500/5 focus-visible:ring-amber-500/30"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isSubmittingLog}
                  className="w-full h-8 text-xs cursor-pointer"
                >
                  {isSubmittingLog ? "Spremanje..." : "Sačuvaj bilješku"}
                </Button>
              </form>

              {/* Parametri analize weba */}
              <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-3">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <RiInformationLine className="size-4 text-primary" /> Pregled analize / Argumenti za prodaju
                </h3>
                {selectedLead.analysis && selectedLead.analysis.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {selectedLead.analysis.map((tag, idx) => (
                      <span key={idx} className="px-2.5 py-1 rounded-md border border-border bg-card text-xs font-medium">
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Nema unesenih parametara analize.</p>
                )}
              </div>
            </div>

            {/* Right Side (Contact History) */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm flex items-center gap-2 border-b border-border pb-2">
                <RiHistoryLine className="size-4 text-primary" /> Historija kontakata
              </h3>
              
              <div className="space-y-3">
                {isLoadingLogs ? (
                  <p className="text-xs text-muted-foreground">Učitavanje historije...</p>
                ) : contactLogs.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-4 text-center border border-dashed border-border rounded-lg bg-muted/10">Nema prethodnih kontakata.</p>
                ) : (
                  contactLogs.map((log) => {
                    const dateFormatted = log.contacted_at
                      ? new Date(log.contacted_at).toLocaleString("bs-BA", {
                          day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
                        })
                      : new Date(log.$createdAt).toLocaleString("bs-BA", { day: "2-digit", month: "2-digit" })

                    return (
                      <div key={log.$id} className="p-3 rounded-lg border border-border bg-card text-xs space-y-1.5 shadow-xs">
                        <div className="flex justify-between items-start gap-2">
                          <span className="font-semibold text-foreground">{log.channel}</span>
                          <span suppressHydrationWarning className="text-[10px] text-muted-foreground font-mono">{dateFormatted}</span>
                        </div>
                        {log.outcome && (
                          <Badge variant="secondary" className="text-[9px] mb-1">{log.outcome}</Badge>
                        )}
                        {log.content && (
                          <p className="text-muted-foreground line-clamp-3 bg-muted/30 p-2 rounded">{log.content}</p>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
