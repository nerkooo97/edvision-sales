"use client"

import * as React from "react"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { formatDate, formatDateTime } from "@/lib/utils"
import {
  createContactLog,
  updateContactLog,
  type ContactLog,
  type ContactLogInput,
} from "@/lib/appwrite/contact-logs"
import type { Company } from "@/lib/appwrite/companies"
import type { Lead } from "@/lib/appwrite/leads"
import {
  RiHistoryLine,
  RiBuilding2Line,
  RiMailLine,
  RiPhoneLine,
  RiWhatsappLine,
  RiLinkedinLine,
  RiUserVoiceLine,
  RiLoader4Line,
  RiEditLine,
  RiCalendarEventLine,
  RiTimeLine,
  RiChat3Line,
} from "@remixicon/react"

interface ContactLogSheetProps {
  log: ContactLog | null
  companies: Company[]
  leads: Lead[]
  mode: "create" | "edit" | "view"
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
  onSwitchToEdit?: () => void
}

const CHANNELS = [
  "Email",
  "Telefon",
  "WhatsApp",
  "LinkedIn",
  "Sastanak uživo",
  "SMS",
]

const STATUSES = [
  "Poslano",
  "Odgovoreno",
  "Propušteno",
  "Uspješan poziv",
  "Zakazan sastanak",
  "Odbijeno",
]

function ContactLogFormBody({
  log,
  companies,
  leads,
  mode,
  onClose,
  onSuccess,
  onSwitchToEdit,
}: {
  log: ContactLog | null
  companies: Company[]
  leads: Lead[]
  mode: "create" | "edit" | "view"
  onClose: () => void
  onSuccess?: () => void
  onSwitchToEdit?: () => void
}) {
  const [formData, setFormData] = React.useState<ContactLogInput>(() => {
    if (log && (mode === "edit" || mode === "view")) {
      const companyId = typeof log.company === "object" && log.company ? log.company.$id : (log.company as string) || ""
      const leadId = typeof log.lead === "object" && log.lead ? log.lead.$id : (log.lead as string) || ""
      return {
        company: companyId,
        lead: leadId,
        channel: log.channel || "Email",
        recipient: log.recipient || "",
        contacted_at: log.contacted_at ? new Date(log.contacted_at).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16),
        subject: log.subject || "",
        content: log.content || "",
        status: log.status || "Poslano",
        outcome: log.outcome || "",
        follow_up_date: log.follow_up_date ? new Date(log.follow_up_date).toISOString().slice(0, 16) : "",
      }
    }
    return {
      company: companies[0]?.$id || "",
      lead: leads[0]?.$id || "",
      channel: "Email",
      recipient: "",
      contacted_at: new Date().toISOString().slice(0, 16),
      subject: "",
      content: "",
      status: "Poslano",
      outcome: "",
      follow_up_date: "",
    }
  })

  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    let result
    if (mode === "create") {
      result = await createContactLog(formData)
    } else if (mode === "edit" && log) {
      result = await updateContactLog(log.$id, formData)
    }

    setIsSubmitting(false)

    if (result && result.success) {
      onClose()
      onSuccess?.()
    } else if (result) {
      setError(result.error || "Došlo je do greške.")
    }
  }

  const associatedCompany = typeof log?.company === "object" && log?.company
    ? log.company
    : companies.find((c) => c.$id === formData.company)

  const getChannelIcon = (ch?: string) => {
    switch (ch?.toLowerCase()) {
      case "telefon":
        return <RiPhoneLine className="size-4 text-emerald-500" />
      case "whatsapp":
        return <RiWhatsappLine className="size-4 text-green-500" />
      case "linkedin":
        return <RiLinkedinLine className="size-4 text-blue-500" />
      case "sastanak uživo":
        return <RiUserVoiceLine className="size-4 text-purple-500" />
      default:
        return <RiMailLine className="size-4 text-primary" />
    }
  }

  return (
    <>
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
        {error && (
          <div className="p-3.5 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-xl animate-in fade-in">
            {error}
          </div>
        )}

        {mode === "view" && log ? (
          /* VIEW MODE */
          <div className="space-y-6">
            <div className="p-4 rounded-xl border border-border bg-muted/30 space-y-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    {getChannelIcon(log.channel)}
                    <span className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                      {log.channel}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-foreground">
                    {log.subject || "Bez naslova"}
                  </h3>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {log.status || "Poslano"}
                </Badge>
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
                <RiTimeLine className="size-3.5" />
                <span suppressHydrationWarning>
                  {log.contacted_at
                    ? formatDateTime(log.contacted_at)
                    : "—"}
                </span>
              </div>
            </div>

            {/* Entity & Recipient */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Sagovornik i kompanija
              </h4>
              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl border border-border bg-card text-xs">
                <div>
                  <span className="text-[11px] text-muted-foreground block">Kompanija</span>
                  <span className="text-sm font-medium text-foreground flex items-center gap-1 mt-0.5">
                    <RiBuilding2Line className="size-3.5 text-muted-foreground" />
                    {associatedCompany?.company_name || "—"}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-muted-foreground block">Primalac / Kontakt</span>
                  {(() => {
                    const isPhone = (log.channel || "").toLowerCase().includes("telefon") || (log.channel || "").toLowerCase().includes("poziv")
                    const isWA = (log.channel || "").toLowerCase().includes("whatsapp")
                    const phone = associatedCompany?.phones?.[0] || ""
                    const email = associatedCompany?.email || ""
                    const displayContact = log.recipient || (isPhone || isWA ? phone : email) || phone || email

                    if (!displayContact) {
                      return (
                        <span className="text-sm font-medium text-foreground block mt-0.5 truncate">
                          —
                        </span>
                      )
                    }

                    if (isPhone || isWA) {
                      return (
                        <a
                          href={`tel:${displayContact.replace(/\s+/g, "")}`}
                          className="text-sm font-semibold text-primary hover:underline flex items-center gap-1.5 mt-0.5 font-mono"
                        >
                          <RiPhoneLine className="size-3.5" />
                          {displayContact}
                        </a>
                      )
                    }

                    return (
                      <span className="text-sm font-medium text-foreground block mt-0.5 truncate font-mono">
                        {displayContact}
                      </span>
                    )
                  })()}
                </div>
              </div>
            </div>

            {/* Content Body */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <RiChat3Line className="size-3.5" />
                Sadržaj poruke / Zabilješka
              </h4>
              <div className="p-4 rounded-xl border border-border bg-card text-sm leading-relaxed whitespace-pre-wrap text-foreground">
                {log.content || "Nema unesenog sadržaja."}
              </div>
            </div>

            {/* Outcome & Follow-up */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Ishod i sljedeći koraci
              </h4>
              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl border border-border bg-card text-xs">
                <div>
                  <span className="text-[11px] text-muted-foreground block">Ishod</span>
                  <span className="text-sm font-medium text-foreground block mt-0.5">
                    {log.outcome || "—"}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-muted-foreground block">Datum sljedećeg kontakta</span>
                  <span className="text-sm font-medium text-foreground flex items-center gap-1 mt-0.5" suppressHydrationWarning>
                    <RiCalendarEventLine className="size-3.5 text-muted-foreground" />
                    {log.follow_up_date
                      ? formatDate(log.follow_up_date)
                      : "—"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* CREATE / EDIT FORM */
          <form id="contact-log-form" onSubmit={handleSubmit} className="space-y-5">
            <div className="grid sm:grid-cols-2 gap-4">
              {/* Kompanija */}
              <div className="space-y-1.5">
                <Label htmlFor="company" className="text-xs font-semibold">
                  Kompanija
                </Label>
                <select
                  id="company"
                  className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm focus:outline-hidden focus:ring-2 focus:ring-primary/40"
                  value={formData.company || ""}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                >
                  <option value="">-- Odaberite firmu (opcionalno) --</option>
                  {companies.map((comp) => (
                    <option key={comp.$id} value={comp.$id}>
                      {comp.company_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Lead */}
              <div className="space-y-1.5">
                <Label htmlFor="lead" className="text-xs font-semibold">
                  Povezani lead
                </Label>
                <select
                  id="lead"
                  className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm focus:outline-hidden focus:ring-2 focus:ring-primary/40"
                  value={formData.lead || ""}
                  onChange={(e) => setFormData({ ...formData, lead: e.target.value })}
                >
                  <option value="">-- Odaberite lead (opcionalno) --</option>
                  {leads.map((ld) => {
                    const cName = typeof ld.company === "object" && ld.company ? ld.company.company_name : ld.$id
                    return (
                      <option key={ld.$id} value={ld.$id}>
                        {cName} ({ld.status || "Novi"})
                      </option>
                    )
                  })}
                </select>
              </div>
            </div>

            <Separator />

            {/* Kanal & Status */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="channel" className="text-xs font-semibold">
                  Kanal komunikacije
                </Label>
                <select
                  id="channel"
                  className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm focus:outline-hidden focus:ring-2 focus:ring-primary/40"
                  value={formData.channel || "Email"}
                  onChange={(e) => setFormData({ ...formData, channel: e.target.value })}
                >
                  {CHANNELS.map((ch) => (
                    <option key={ch} value={ch}>
                      {ch}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="status" className="text-xs font-semibold">
                  Status
                </Label>
                <select
                  id="status"
                  className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm focus:outline-hidden focus:ring-2 focus:ring-primary/40"
                  value={formData.status || "Poslano"}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                >
                  {STATUSES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Primalac & Vrijeme */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="recipient" className="text-xs font-semibold">
                  Primalac (Email, Telefon, Ime)
                </Label>
                <Input
                  id="recipient"
                  placeholder="npr. direktor@firma.ba"
                  value={formData.recipient || ""}
                  onChange={(e) => setFormData({ ...formData, recipient: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="contacted_at" className="text-xs font-semibold">
                  Vrijeme kontakta
                </Label>
                <Input
                  id="contacted_at"
                  type="datetime-local"
                  value={formData.contacted_at || ""}
                  onChange={(e) => setFormData({ ...formData, contacted_at: e.target.value })}
                />
              </div>
            </div>

            <Separator />

            {/* Predmet & Sadržaj */}
            <div className="space-y-1.5">
              <Label htmlFor="subject" className="text-xs font-semibold">
                Predmet / Naslov razgovora
              </Label>
              <Input
                id="subject"
                placeholder="npr. Prezentacija ponude za digitalizaciju"
                value={formData.subject || ""}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="content" className="text-xs font-semibold">
                Sadržaj / Zabilješke sa sastanka
              </Label>
              <textarea
                id="content"
                rows={4}
                placeholder="Unesite detalje razgovora, pitanja klijenta, poslane materijale..."
                className="w-full p-3 rounded-xl border border-border bg-background text-sm focus:outline-hidden focus:ring-2 focus:ring-primary/40 resize-y"
                value={formData.content || ""}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              />
            </div>

            <Separator />

            {/* Ishod & Follow up */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="outcome" className="text-xs font-semibold">
                  Ishod komunikacije
                </Label>
                <Input
                  id="outcome"
                  placeholder="npr. Zainteresovani za demo sljedeće sedmice"
                  value={formData.outcome || ""}
                  onChange={(e) => setFormData({ ...formData, outcome: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="follow_up_date" className="text-xs font-semibold">
                  Sljedeći zakazani kontakt
                </Label>
                <Input
                  id="follow_up_date"
                  type="datetime-local"
                  value={formData.follow_up_date || ""}
                  onChange={(e) => setFormData({ ...formData, follow_up_date: e.target.value })}
                />
              </div>
            </div>
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
              Uredi zapis
            </Button>
          </>
        ) : (
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isSubmitting}
              onClick={onClose}
              className="cursor-pointer"
            >
              Odustani
            </Button>
            <Button
              form="contact-log-form"
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="gap-1.5 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <RiLoader4Line className="size-4 animate-spin" />
                  Čuvanje...
                </>
              ) : mode === "create" ? (
                "Zabilježi kontakt"
              ) : (
                "Sačuvaj izmjene"
              )}
            </Button>
          </>
        )}
      </div>
    </>
  )
}

export function ContactLogSheet({
  log,
  companies,
  leads,
  mode,
  open,
  onOpenChange,
  onSuccess,
  onSwitchToEdit,
}: ContactLogSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-2xl lg:max-w-3xl flex flex-col h-full p-0 bg-card border-l border-border overflow-hidden"
      >
        <SheetHeader className="px-6 py-5 border-b border-border bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <RiHistoryLine className="size-5" />
            </div>
            <div>
              <SheetTitle className="text-lg font-bold">
                {mode === "create" ? "Evidentiraj novi kontakt" : mode === "edit" ? "Uredi zapis kontakta" : "Pregled komunikacije"}
              </SheetTitle>
              <SheetDescription className="text-xs text-muted-foreground mt-0.5">
                {mode === "create"
                  ? "Zabilježite novi poziv, email, sastanak ili poruku"
                  : mode === "edit"
                  ? "Izmijenite detalje zabilješke ili ishod"
                  : "Detalji o obavljenoj komunikaciji"}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        {open && (
          <ContactLogFormBody
            key={`${log?.$id || "new"}-${mode}`}
            log={log}
            companies={companies}
            leads={leads}
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
