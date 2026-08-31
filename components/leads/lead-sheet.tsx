"use client"

import * as React from "react"
import type { Lead, LeadInput } from "@/lib/appwrite/leads"
import type { Company } from "@/lib/appwrite/companies"
import type { ContactLog, ContactLogInput } from "@/lib/appwrite/contact-logs"
import { createLead, updateLead } from "@/lib/appwrite/leads"
import { STATUS_DESCRIPTIONS } from "@/lib/constants"
import {
  getContactLogsByLeadId,
  createContactLog,
  deleteContactLog,
} from "@/lib/appwrite/contact-logs"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { formatDate, formatDateTime } from "@/lib/utils"
import {
  RiUserSearchLine,
  RiBuilding2Line,
  RiGlobalLine,
  RiMailLine,
  RiPhoneLine,
  RiAddLine,
  RiEditLine,
  RiDeleteBinLine,
  RiCheckLine,
  RiHistoryLine,
  RiCalendarLine,
  RiTimeLine,
  RiUserVoiceLine,
  RiWhatsappLine,
  RiLinkedinLine,
  RiSparklingLine,
  RiSendPlaneLine,
  RiFireLine,
  RiProhibitedLine,
  RiInformationLine,
} from "@remixicon/react"
import { calculateLeadScore, getWhatsAppLink } from "@/lib/scoring"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

interface LeadSheetProps {
  lead: Lead | null
  companies: Company[]
  mode: "create" | "edit" | "view"
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
  onSwitchToEdit?: () => void
}

const STATUS_OPTIONS = [
  "Novi",
  "Kontaktiran",
  "Kvalifikovan",
  "U pregovorima",
  "Zaključeno - Dobijeno",
  "Odbijeno",
  "Ne javlja se",
]

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

const QUICK_ANALYSIS_PRESETS = [
  "Nema web stranicu",
  "Zastarjela web stranica",
  "Nema SSL certifikat",
  "Nije prilagođeno za mobilne (Mobile unfriendly)",
  "Nema online narudžbe / booking",
  "Nema vidljive kontakt forme",
  "Potrebna modernizacija dizajna",
  "Loš SEO / Nije pozicionirano na Google",
  "Nema društvene mreže",
  "Spora brzina učitavanja",
]

function LeadSheetForm({
  lead,
  companies,
  mode,
  onClose,
  onSuccess,
  onSwitchToEdit,
}: {
  lead: Lead | null
  companies: Company[]
  mode: "create" | "edit" | "view"
  onClose: () => void
  onSuccess?: () => void
  onSwitchToEdit?: () => void
}) {
  const [formData, setFormData] = React.useState<LeadInput>(() => ({
    company: typeof lead?.company === "object" && lead?.company ? lead.company.$id : (lead?.company as string) || "",
    has_web: lead?.has_web || false,
    has_email: lead?.has_email || false,
    has_phone: lead?.has_phone || false,
    status: lead?.status || "Novi",
    analysis: lead?.analysis && lead.analysis.length > 0 ? lead.analysis : [""],
  }))

  // Connected Contact Logs from database
  const [contactLogs, setContactLogs] = React.useState<ContactLog[]>([])
  const [isLoadingLogs, setIsLoadingLogs] = React.useState(Boolean(lead?.$id))

  // Quick Log Entry Form State
  const [isLoggingContact, setIsLoggingContact] = React.useState(false)
  const [newLog, setNewLog] = React.useState<ContactLogInput>({
    channel: "Email",
    recipient: "",
    subject: "",
    content: "",
    status: "Poslano",
    outcome: "Čeka se odgovor",
    contacted_at: new Date().toISOString().slice(0, 16),
    follow_up_date: "",
  })
  const [isSubmittingLog, setIsSubmittingLog] = React.useState(false)

  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  // Fetch real connected contact logs
  const fetchLeadContactLogs = React.useCallback(async (leadId: string) => {
    if (!leadId) return
    setIsLoadingLogs(true)
    try {
      const logs = await getContactLogsByLeadId(leadId)
      setContactLogs(logs)
    } catch (err) {
      console.error("Failed to fetch lead contact logs:", err)
    } finally {
      setIsLoadingLogs(false)
    }
  }, [])

  React.useEffect(() => {
    let isCancelled = false
    if (!lead?.$id) {
      return
    }

    const fetchLogs = async () => {
      try {
        const logs = await getContactLogsByLeadId(lead.$id)
        if (!isCancelled) {
          setContactLogs(logs)
          setIsLoadingLogs(false)
        }
      } catch (err) {
        console.error("Failed to fetch lead contact logs:", err)
        if (!isCancelled) setIsLoadingLogs(false)
      }
    }

    fetchLogs()
    return () => {
      isCancelled = true
    }
  }, [lead?.$id])

  // Analysis item management
  const handleAnalysisChange = (index: number, value: string) => {
    const updated = [...(formData.analysis || [])]
    updated[index] = value
    setFormData({ ...formData, analysis: updated })
  }

  const addAnalysisItem = (initialValue = "") => {
    setFormData({
      ...formData,
      analysis: [...(formData.analysis || []), initialValue],
    })
  }

  const removeAnalysisItem = (index: number) => {
    const updated = (formData.analysis || []).filter((_, i) => i !== index)
    setFormData({ ...formData, analysis: updated.length > 0 ? updated : [""] })
  }

  // Handle saving new contact log directly to database
  const handleSaveContactLog = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!lead?.$id) return
    setIsSubmittingLog(true)

    const companyId =
      typeof lead.company === "object" && lead.company
        ? lead.company.$id
        : (lead.company as string) || (formData.company as string) || null

    const result = await createContactLog({
      ...newLog,
      lead: lead.$id,
      company: companyId,
      contacted_at: newLog.contacted_at ? new Date(newLog.contacted_at).toISOString() : new Date().toISOString(),
      follow_up_date: newLog.follow_up_date ? new Date(newLog.follow_up_date).toISOString() : undefined,
    })

    setIsSubmittingLog(false)

    if (result.success) {
      setIsLoggingContact(false)
      setNewLog({
        channel: "Email",
        recipient: "",
        subject: "",
        content: "",
        status: "Poslano",
        outcome: "Čeka se odgovor",
        contacted_at: new Date().toISOString().slice(0, 16),
        follow_up_date: "",
      })
      await fetchLeadContactLogs(lead.$id)
      onSuccess?.()
    } else {
      alert(result.error || "Greška pri evidentiranju kontakta.")
    }
  }

  // Handle deleting contact log directly from database
  const handleDeleteContactLog = async (logId: string) => {
    if (!confirm("Jeste li sigurni da želite obrisati ovaj zapis iz dnevnika?")) return
    const res = await deleteContactLog(logId)
    if (res.success && lead?.$id) {
      await fetchLeadContactLogs(lead.$id)
      onSuccess?.()
    }
  }

  // Save Lead changes
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    const cleanedAnalysis = (formData.analysis || []).map((t) => t.trim()).filter(Boolean)

    const payload: LeadInput = {
      ...formData,
      analysis: cleanedAnalysis,
    }

    let result
    if (mode === "create") {
      result = await createLead(payload)
    } else if (mode === "edit" && lead) {
      result = await updateLead(lead.$id, payload)
    }

    setIsSubmitting(false)

    if (result && result.success) {
      onClose()
      onSuccess?.()
    } else if (result) {
      setError(result.error || "Došlo je do greške.")
    }
  }

  const associatedCompany =
    typeof lead?.company === "object" && lead?.company
      ? lead.company
      : companies.find((c) => c.$id === (typeof lead?.company === "string" ? lead.company : formData.company))

  const getChannelBadge = (ch?: string) => {
    switch (ch?.toLowerCase()) {
      case "telefon":
        return <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 gap-1 text-[11px]"><RiPhoneLine className="size-3" /> Telefon</Badge>
      case "whatsapp":
        return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30 gap-1 text-[11px]"><RiWhatsappLine className="size-3" /> WhatsApp</Badge>
      case "linkedin":
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30 gap-1 text-[11px]"><RiLinkedinLine className="size-3" /> LinkedIn</Badge>
      case "sastanak":
        return <Badge variant="outline" className="bg-purple-500/10 text-purple-600 border-purple-500/30 gap-1 text-[11px]"><RiUserVoiceLine className="size-3" /> Sastanak</Badge>
      default:
        return <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 gap-1 text-[11px]"><RiMailLine className="size-3" /> Email</Badge>
    }
  }

  return (
    <>
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {error && (
          <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs">
            {error}
          </div>
        )}

        {/* VIEW MODE */}
        {mode === "view" && lead ? (
          <div className="space-y-6 text-sm">
            {/* Povezana firma kartica */}
            <div className="p-4 rounded-2xl border border-border bg-muted/30 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Povezana Kompanija
                </span>
                {lead.status && (
                  <div className="flex items-center gap-1.5">
                    <Badge variant="default" className="text-xs">
                      {lead.status}
                    </Badge>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <RiInformationLine className="size-4 text-muted-foreground/60 hover:text-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-[200px]">
                        <p className="text-xs">{STATUS_DESCRIPTIONS[lead.status] || "Nedefinisan status."}</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                )}
              </div>

              {/* AI Lead Score Card */}
              {(() => {
                const scoreInfo = calculateLeadScore(lead, associatedCompany)
                return (
                  <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <RiFireLine className="size-4 text-amber-500" />
                        AI Lead Score: <span className="text-amber-600 font-bold">{scoreInfo.score}/100</span>
                      </span>
                      <Badge
                        variant={scoreInfo.tier === "hot" ? "default" : "secondary"}
                        className={`text-[10px] ${
                          scoreInfo.tier === "hot" ? "bg-amber-600 text-white" : ""
                        }`}
                      >
                        {scoreInfo.label}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {scoreInfo.reasons.map((r, i) => (
                        <span
                          key={i}
                          className="text-[10px] px-2 py-0.5 rounded-md bg-background border border-border text-muted-foreground"
                        >
                          ✓ {r}
                        </span>
                      ))}
                    </div>
                  </div>
                )
              })()}

              {associatedCompany ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                      <RiBuilding2Line className="size-5 text-primary" />
                      {associatedCompany.company_name}
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-muted-foreground pt-1">
                    {associatedCompany.city && (
                      <p>📍 {associatedCompany.city} {associatedCompany.address ? `— ${associatedCompany.address}` : ""}</p>
                    )}
                    {associatedCompany.website && (
                      <p className="truncate">🌐 <a href={associatedCompany.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{associatedCompany.website}</a></p>
                    )}
                    {associatedCompany.email && (
                      <p className="truncate">✉️ <a href={`mailto:${associatedCompany.email}`} className="hover:underline">{associatedCompany.email}</a></p>
                    )}
                    {associatedCompany.owner_name && (
                      <p>👤 Vlasnik: {associatedCompany.owner_name}</p>
                    )}
                  </div>

                  {/* Quick Connect Action Bar */}
                  {(() => {
                    const phone = associatedCompany.phones?.[0] || ""
                    const whatsappUrl = phone ? getWhatsAppLink(phone, associatedCompany.company_name) : ""

                    return (
                      <div className="flex flex-wrap gap-2 pt-2">
                        {phone && (
                          <a
                            href={`tel:${phone}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 text-xs font-semibold transition-colors"
                          >
                            <RiPhoneLine className="size-3.5" /> Pozovi ({phone})
                          </a>
                        )}

                        {whatsappUrl && (
                          <a
                            href={whatsappUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/10 text-green-600 hover:bg-green-500/20 text-xs font-semibold transition-colors"
                          >
                            <RiWhatsappLine className="size-3.5" /> Pošalji WhatsApp
                          </a>
                        )}

                        {associatedCompany.email && (
                          <a
                            href={`mailto:${associatedCompany.email}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 text-xs font-semibold transition-colors"
                          >
                            <RiMailLine className="size-3.5" /> Pošalji Email
                          </a>
                        )}

                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={async () => {
                            if (confirm("Da li želite označiti ovaj lead kao 'Odbijeno / Ne kontaktirati'?")) {
                              await updateLead(lead.$id, { status: "Odbijeno" })
                              onClose()
                            }
                          }}
                          className="h-8 text-xs text-rose-600 hover:bg-rose-500/10 gap-1 ml-auto cursor-pointer"
                        >
                          <RiProhibitedLine className="size-3.5" /> Ne kontaktirati
                        </Button>
                      </div>
                    )
                  })()}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Nema povezane kompanije.</p>
              )}
            </div>

            {/* Dostupni Kanali */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Dostupni Kanali Komunikacije
              </span>
              <div className="flex flex-wrap gap-2 pt-1">
                <Badge
                  variant={lead.has_web ? "default" : "outline"}
                  className="gap-1 text-xs py-1 px-2.5"
                >
                  <RiGlobalLine className="size-3.5" />
                  {lead.has_web ? "Ima Web Stranicu" : "Nema Web Stranicu"}
                </Badge>

                {(() => {
                  const hasEmailFailed = (contactLogs || []).some(
                    (l) =>
                      (l.channel || "").toLowerCase().includes("email") &&
                      ((l.status || "").toLowerCase().includes("grešk") ||
                        (l.status || "").toLowerCase().includes("pogrešn") ||
                        (l.outcome || "").toLowerCase().includes("grešk") ||
                        (l.outcome || "").toLowerCase().includes("nevažeć") ||
                        (l.outcome || "").toLowerCase().includes("nxdomain"))
                  )

                  if (hasEmailFailed) {
                    return (
                      <Badge
                        variant="outline"
                        className="gap-1 text-xs py-1 px-2.5 bg-rose-500/10 text-rose-600 border-rose-500/30"
                        title="Zabilježena je greška ili nevažeća email domena"
                      >
                        <RiMailLine className="size-3.5" />
                        Pogrešan email
                      </Badge>
                    )
                  }

                  return (
                    <Badge
                      variant={lead.has_email ? "default" : "outline"}
                      className="gap-1 text-xs py-1 px-2.5"
                    >
                      <RiMailLine className="size-3.5" />
                      {lead.has_email ? "Email Dostupan" : "Nema Emaila"}
                    </Badge>
                  )
                })()}

                <Badge
                  variant={lead.has_phone ? "default" : "outline"}
                  className="gap-1 text-xs py-1 px-2.5"
                >
                  <RiPhoneLine className="size-3.5" />
                  {lead.has_phone ? "Telefon Dostupan" : "Nema Telefona"}
                </Badge>
              </div>
            </div>

            <Separator />

            {/* Parametri Analize */}
            <div className="space-y-3">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Parametri Analize (Prilike i nedostaci)
              </span>
              {lead.analysis && lead.analysis.length > 0 ? (
                <div className="grid grid-cols-1 gap-2">
                  {lead.analysis.map((tag, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 p-2.5 rounded-xl border border-border bg-card text-xs"
                    >
                      <div className="size-2 rounded-full bg-primary shrink-0" />
                      <span className="font-medium text-foreground">{tag}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Nema unesenih parametara analize.</p>
              )}
            </div>

            <Separator />

            {/* DIREKTNO POVEZANI DNEVNIK KONTAKATA */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <RiHistoryLine className="size-3.5 text-primary" />
                    Dnevnik kontakata ({contactLogs.length})
                  </span>
                  <p className="text-[11px] text-muted-foreground">
                    Svi zabilježeni pozivi, emailovi i sastanci direktno povezani sa ovim leadom.
                  </p>
                </div>

                <Button
                  type="button"
                  size="sm"
                  variant={isLoggingContact ? "secondary" : "outline"}
                  onClick={() => setIsLoggingContact(!isLoggingContact)}
                  className="h-8 gap-1.5 text-xs cursor-pointer"
                >
                  <RiAddLine className="size-3.5" />
                  {isLoggingContact ? "Zatvori formu" : "Evidentiraj kontakt"}
                </Button>
              </div>

              {/* Forma za brzi unos novog kontakta u bazu */}
              {isLoggingContact && (
                <form
                  onSubmit={handleSaveContactLog}
                  className="p-4 rounded-2xl border-2 border-primary/30 bg-primary/5 space-y-3 text-xs"
                >
                  <div className="font-semibold text-foreground text-xs flex items-center gap-1.5">
                    <RiSendPlaneLine className="size-3.5 text-primary" />
                    Novi unos u dnevnik kontakata
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-[11px]">Kanal komunikacije</Label>
                      <select
                        value={newLog.channel}
                        onChange={(e) => setNewLog({ ...newLog, channel: e.target.value })}
                        className="w-full h-8 px-2.5 rounded-lg border border-border bg-background text-xs"
                      >
                        {CHANNELS.map((ch) => (
                          <option key={ch} value={ch}>
                            {ch}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[11px]">Primalac / Osoba</Label>
                      <Input
                        placeholder="npr. Direktor prodaje"
                        value={newLog.recipient || ""}
                        onChange={(e) => setNewLog({ ...newLog, recipient: e.target.value })}
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-[11px]">Predmet / Svrha</Label>
                      <Input
                        placeholder="npr. Predstavljanje ponude"
                        value={newLog.subject || ""}
                        onChange={(e) => setNewLog({ ...newLog, subject: e.target.value })}
                        className="h-8 text-xs"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[11px]">Ishod razgovora</Label>
                      <select
                        value={newLog.outcome || "Čeka se odgovor"}
                        onChange={(e) => setNewLog({ ...newLog, outcome: e.target.value })}
                        className="w-full h-8 px-2.5 rounded-lg border border-border bg-background text-xs"
                      >
                        {OUTCOME_OPTIONS.map((out) => (
                          <option key={out} value={out}>
                            {out}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px]">Zabilješka / Detalji</Label>
                    <textarea
                      rows={2}
                      placeholder="Unesite tok razgovora, povratne informacije ili dogovor..."
                      value={newLog.content || ""}
                      onChange={(e) => setNewLog({ ...newLog, content: e.target.value })}
                      className="w-full p-2.5 rounded-lg border border-border bg-background text-xs resize-y"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-[11px]">Datum & Vrijeme kontakta</Label>
                      <Input
                        type="datetime-local"
                        value={newLog.contacted_at || ""}
                        onChange={(e) => setNewLog({ ...newLog, contacted_at: e.target.value })}
                        className="h-8 text-xs"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[11px]">Datum sljedećeg kontakta (Follow-up)</Label>
                      <Input
                        type="datetime-local"
                        value={newLog.follow_up_date || ""}
                        onChange={(e) => setNewLog({ ...newLog, follow_up_date: e.target.value })}
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsLoggingContact(false)}
                      className="h-7 text-xs cursor-pointer"
                    >
                      Odustani
                    </Button>
                    <Button
                      type="submit"
                      size="sm"
                      disabled={isSubmittingLog}
                      className="h-7 text-xs gap-1.5 cursor-pointer"
                    >
                      <RiCheckLine className="size-3.5" />
                      {isSubmittingLog ? "Spremanje..." : "Sačuvaj u dnevnik"}
                    </Button>
                  </div>
                </form>
              )}

              {/* Lista direktnih zapisa iz baze */}
              {isLoadingLogs ? (
                <p className="text-xs text-muted-foreground py-3 text-center">Učitavanje dnevnika...</p>
              ) : contactLogs.length === 0 ? (
                <div className="p-4 rounded-xl border border-dashed border-border bg-muted/20 text-center space-y-2">
                  <p className="text-xs text-muted-foreground">Još nema zabilježenih kontakata za ovaj lead u dnevniku.</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsLoggingContact(true)}
                    className="h-7 text-xs gap-1 cursor-pointer"
                  >
                    <RiAddLine className="size-3.5" /> Evidentiraj prvi kontakt
                  </Button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {contactLogs.map((log) => {
                    const dateFormatted = log.contacted_at
                      ? formatDateTime(log.contacted_at)
                      : formatDateTime(log.$createdAt)

                    const followUpFormatted = log.follow_up_date
                      ? formatDate(log.follow_up_date)
                      : null

                    return (
                      <div
                        key={log.$id}
                        className="p-3.5 rounded-xl border border-border bg-card space-y-2 text-xs hover:border-primary/40 transition-colors"
                      >
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2">
                            {getChannelBadge(log.channel)}
                            <span className="text-[11px] font-mono text-muted-foreground flex items-center gap-1" suppressHydrationWarning>
                              <RiTimeLine className="size-3" />
                              {dateFormatted}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            {log.outcome && (
                              <Badge variant="secondary" className="text-[10px]">
                                {log.outcome}
                              </Badge>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-6 text-muted-foreground hover:text-destructive cursor-pointer"
                              title="Obriši zapis"
                              onClick={() => handleDeleteContactLog(log.$id)}
                            >
                              <RiDeleteBinLine className="size-3.5" />
                            </Button>
                          </div>
                        </div>

                        {log.subject && (
                          <div className="font-semibold text-foreground text-xs">
                            {log.subject}
                            {log.recipient && (
                              <span className="font-normal text-muted-foreground ml-1.5">
                                (Za: {log.recipient})
                              </span>
                            )}
                          </div>
                        )}

                        {log.content && (
                          <p className="text-muted-foreground text-xs leading-relaxed bg-muted/30 p-2 rounded-lg">
                            {log.content}
                          </p>
                        )}

                        {followUpFormatted && (
                          <div className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1 font-medium pt-0.5" suppressHydrationWarning>
                            <RiCalendarLine className="size-3.5" />
                            Sljedeći kontakt: {followUpFormatted}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* CREATE / EDIT FORM */
          <form id="lead-form" onSubmit={handleSubmit} className="space-y-6 text-sm">
            {/* Odabir firme */}
            <div className="space-y-2">
              <Label htmlFor="company" className="text-xs font-semibold">
                Kompanija <span className="text-destructive">*</span>
              </Label>
              <select
                id="company"
                value={formData.company || ""}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                required
                className="w-full h-9 px-3 rounded-xl border border-border bg-background text-sm focus:outline-hidden focus:ring-2 focus:ring-primary/40"
              >
                <option value="">Odaberite kompaniju...</option>
                {companies.map((c) => (
                  <option key={c.$id} value={c.$id}>
                    {c.company_name} {c.city ? `(${c.city})` : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <Label htmlFor="status" className="text-xs font-semibold">
                  Status Leada
                </Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <RiInformationLine className="size-3.5 text-muted-foreground/60 hover:text-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[200px]">
                    <p className="text-xs">{STATUS_DESCRIPTIONS[formData.status || "Novi"] || "Odaberi status za više informacija."}</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <select
                id="status"
                value={formData.status || "Novi"}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full h-9 px-3 rounded-xl border border-border bg-background text-sm focus:outline-hidden focus:ring-2 focus:ring-primary/40"
              >
                {STATUS_OPTIONS.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>

            <Separator />

            {/* Kanali */}
            <div className="space-y-3">
              <Label className="text-xs font-semibold">Dostupni kanali za kontakt</Label>
              <div className="grid grid-cols-3 gap-3">
                <label className="flex items-center gap-2 p-3 rounded-xl border border-border bg-card cursor-pointer hover:bg-muted/40 transition-colors">
                  <input
                    type="checkbox"
                    checked={formData.has_web}
                    onChange={(e) => setFormData({ ...formData, has_web: e.target.checked })}
                    className="rounded border-border text-primary focus:ring-primary"
                  />
                  <span className="text-xs font-medium">Ima Web</span>
                </label>

                <label className="flex items-center gap-2 p-3 rounded-xl border border-border bg-card cursor-pointer hover:bg-muted/40 transition-colors">
                  <input
                    type="checkbox"
                    checked={formData.has_email}
                    onChange={(e) => setFormData({ ...formData, has_email: e.target.checked })}
                    className="rounded border-border text-primary focus:ring-primary"
                  />
                  <span className="text-xs font-medium">Ima Email</span>
                </label>

                <label className="flex items-center gap-2 p-3 rounded-xl border border-border bg-card cursor-pointer hover:bg-muted/40 transition-colors">
                  <input
                    type="checkbox"
                    checked={formData.has_phone}
                    onChange={(e) => setFormData({ ...formData, has_phone: e.target.checked })}
                    className="rounded border-border text-primary focus:ring-primary"
                  />
                  <span className="text-xs font-medium">Ima Telefon</span>
                </label>
              </div>
            </div>

            <Separator />

            {/* Parametri Analize */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-xs font-semibold flex items-center gap-1.5">
                    <RiSparklingLine className="size-3.5 text-primary" />
                    Parametri analize (Prilike za ponudu)
                  </Label>
                  <p className="text-[11px] text-muted-foreground">
                    Dodajte uočene nedostatke ili kliknite na brze prijedloge ispod.
                  </p>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addAnalysisItem()}
                  className="h-8 gap-1 text-xs cursor-pointer"
                >
                  <RiAddLine className="size-3.5" /> Dodaj stavku
                </Button>
              </div>

              {/* Brzi prijedlozi */}
              <div className="space-y-1.5">
                <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                  Brzi prijedlozi (kliknite za dodavanje):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_ANALYSIS_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => addAnalysisItem(preset)}
                      className="px-2.5 py-1 rounded-lg text-[11px] border border-border bg-muted/40 hover:bg-primary/10 hover:border-primary/40 hover:text-primary transition-colors cursor-pointer"
                    >
                      + {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Analysis Items List */}
              <div className="space-y-2">
                {(formData.analysis || []).map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 p-2 rounded-xl border border-border bg-card"
                  >
                    <div className="flex size-6 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold text-xs shrink-0">
                      {idx + 1}
                    </div>

                    <Input
                      placeholder={`Stavka analize #${idx + 1} (npr. Zastarjela web stranica)...`}
                      value={item}
                      onChange={(e) => handleAnalysisChange(idx, e.target.value)}
                      className="h-8 text-xs border-0 bg-transparent shadow-none focus-visible:ring-0 px-1"
                    />

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8 shrink-0 text-muted-foreground hover:text-destructive cursor-pointer"
                      onClick={() => removeAnalysisItem(idx)}
                      title="Ukloni stavku"
                    >
                      <RiDeleteBinLine className="size-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* Ako je edit mode, prikaži i brzi dnevnik kontakata */}
            {mode === "edit" && lead?.$id && (
              <>
                <Separator />
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold flex items-center gap-1.5">
                      <RiHistoryLine className="size-3.5 text-primary" />
                      Dnevnik kontakata ({contactLogs.length})
                    </Label>
                    <span className="text-[11px] text-muted-foreground">
                      Povezano sa tabelom dnevnika
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Zabilješke o kontaktima se automatski bilježe i sinhronizuju sa Dnevnikom Kontakata.
                  </p>
                </div>
              </>
            )}
          </form>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-border bg-muted/20 flex items-center justify-end gap-2">
        {mode === "view" ? (
          <>
            <Button type="button" variant="outline" size="sm" onClick={onClose} className="cursor-pointer">
              Zatvori
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onSwitchToEdit?.()
              }}
              className="gap-1.5 cursor-pointer"
            >
              <RiEditLine className="size-4" />
              Uredi lead
            </Button>
          </>
        ) : (
          <>
            <Button type="button" variant="outline" size="sm" onClick={onClose} className="cursor-pointer">
              Odustani
            </Button>
            <Button
              type="submit"
              form="lead-form"
              size="sm"
              disabled={isSubmitting}
              className="gap-1.5 cursor-pointer"
            >
              <RiCheckLine className="size-4" />
              {isSubmitting ? "Spremanje..." : mode === "create" ? "Kreiraj lead" : "Sačuvaj izmjene"}
            </Button>
          </>
        )}
      </div>
    </>
  )
}

export function LeadSheet({
  lead,
  companies,
  mode,
  open,
  onOpenChange,
  onSuccess,
  onSwitchToEdit,
}: LeadSheetProps) {
  const companyName =
    typeof lead?.company === "object" && lead?.company
      ? lead.company.company_name
      : companies.find((c) => c.$id === (typeof lead?.company === "string" ? lead?.company : ""))?.company_name ||
        "Detalji leada"

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-2xl lg:max-w-3xl flex flex-col h-full p-0 bg-card border-l border-border overflow-hidden"
      >
        <SheetHeader className="px-6 py-5 border-b border-border bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <RiUserSearchLine className="size-5" />
            </div>
            <div>
              <SheetTitle className="text-lg font-bold">
                {mode === "create" ? "Dodaj novi lead" : mode === "edit" ? "Uredi lead" : companyName}
              </SheetTitle>
              <SheetDescription className="text-xs text-muted-foreground mt-0.5">
                {mode === "create"
                  ? "Povežite firmu, postavite status i parametre analize"
                  : mode === "edit"
                  ? "Izmijenite status i podatke leada"
                  : "Pregled svih detalja, analize i historije leada"}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        {open && (
          <LeadSheetForm
            key={`${lead?.$id || "new-lead"}-${mode}`}
            lead={lead}
            companies={companies}
            mode={mode}
            onClose={() => onOpenChange(false)}
            onSuccess={onSuccess}
            onSwitchToEdit={onSwitchToEdit}
          />
        )}
      </SheetContent>
    </Sheet>
  )
}
