"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  RiCalendarEventLine,
  RiLoader4Line,
  RiBuilding2Line,
  RiCarLine,
  RiCheckLine,
  RiSearchLine,
  RiCloseLine,
  RiTimeLine,
} from "@remixicon/react"
import { cn, formatToDateTimeLocal } from "@/lib/utils"
import type { Meeting, MeetingInput, MeetingLocationType, MeetingStatus } from "@/lib/appwrite/meetings"
import { createMeeting, updateMeeting } from "@/lib/appwrite/meetings"
import type { Company } from "@/lib/appwrite/companies"

interface MeetingFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  meeting?: Meeting | null
  defaultDate?: Date | null
  companies: Company[]
}

const TITLE_PRESETS = [
  "Prezentacija ponude",
  "Uvodni sastanak",
  "Pregovaranje uslova",
  "Zaključenje i potpis ugovora",
  "Follow-up sastanak",
]

const DURATION_OPTIONS = [
  { value: 30, label: "30 minuta" },
  { value: 45, label: "45 minuta" },
  { value: 60, label: "1 sat" },
  { value: 90, label: "1.5 sat" },
  { value: 120, label: "2 sata" },
  { value: 180, label: "3 sata" },
]

const STATUS_OPTIONS: MeetingStatus[] = ["Zakazan", "Potvrđen", "Na čekanju", "Odgođen", "Završen", "Otkazan"]

function getInitialDateTime(defaultDate?: Date | null) {
  if (defaultDate) {
    const d = new Date(defaultDate)
    d.setHours(10, 0, 0, 0)
    return formatToDateTimeLocal(d)
  }
  const d = new Date()
  d.setDate(d.getDate() + 1)
  d.setHours(10, 0, 0, 0)
  return formatToDateTimeLocal(d)
}

export function MeetingFormDialog({ open, onOpenChange, onSuccess, meeting, defaultDate, companies }: MeetingFormDialogProps) {
  const isEditing = !!meeting

  const [title, setTitle] = React.useState("Prezentacija ponude")
  const [selectedTitlePreset, setSelectedTitlePreset] = React.useState("Prezentacija ponude")
  const [customTitle, setCustomTitle] = React.useState("")
  const [scheduledAt, setScheduledAt] = React.useState("")
  const [durationMin, setDurationMin] = React.useState(60)
  const [locationType, setLocationType] = React.useState<MeetingLocationType>("Kancelarija")
  const [locationNote, setLocationNote] = React.useState("")
  const [status, setStatus] = React.useState<MeetingStatus>("Zakazan")
  const [reminderAt, setReminderAt] = React.useState("") // Podsjetnik za "Na čekanju"
  const [notes, setNotes] = React.useState("")
  const [selectedCompanyId, setSelectedCompanyId] = React.useState("")
  const [companySearch, setCompanySearch] = React.useState("")
  const [isDropdownOpen, setIsDropdownOpen] = React.useState(false)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [error, setError] = React.useState("")

  const dropdownRef = React.useRef<HTMLDivElement>(null)

  // Click outside listener for company dropdown
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Popuni formu pri editovanju ili resetuj za novo
  React.useEffect(() => {
    if (open) {
      if (meeting) {
        const meetingTitle = meeting.title || ""
        setTitle(meetingTitle)
        if (TITLE_PRESETS.includes(meetingTitle)) {
          setSelectedTitlePreset(meetingTitle)
          setCustomTitle("")
        } else {
          setSelectedTitlePreset("custom")
          setCustomTitle(meetingTitle)
        }
        setScheduledAt(meeting.scheduled_at ? formatToDateTimeLocal(meeting.scheduled_at) : getInitialDateTime(defaultDate))
        setDurationMin(meeting.duration_min ?? 60)
        setLocationType(meeting.location_type || "Kancelarija")
        setLocationNote(meeting.location_note || "")
        setStatus(meeting.status || "Zakazan")
        setReminderAt(meeting.reminder_at ? formatToDateTimeLocal(meeting.reminder_at) : "")
        setNotes(meeting.notes || "")
        setSelectedCompanyId(meeting.company_id || "")
        setCompanySearch("")
      } else {
        setSelectedTitlePreset("Prezentacija ponude")
        setCustomTitle("")
        setTitle("Prezentacija ponude")
        setScheduledAt(getInitialDateTime(defaultDate))
        setDurationMin(60)
        setLocationType("Kancelarija")
        setLocationNote("")
        setStatus("Zakazan")
        setReminderAt("")
        setNotes("")
        setSelectedCompanyId("")
        setCompanySearch("")
      }
      setIsDropdownOpen(false)
      setError("")
    }
  }, [open, meeting, defaultDate])

  const handleTitlePresetChange = (value: string) => {
    setSelectedTitlePreset(value)
    if (value === "custom") {
      setTitle(customTitle)
    } else {
      setTitle(value)
    }
  }

  const handleCustomTitleChange = (val: string) => {
    setCustomTitle(val)
    setTitle(val)
  }

  const filteredCompanies = React.useMemo(() => {
    if (!companySearch.trim()) return companies
    const q = companySearch.toLowerCase()
    return companies.filter(
      (c) =>
        c.company_name.toLowerCase().includes(q) ||
        (c.city || "").toLowerCase().includes(q)
    )
  }, [companies, companySearch])

  const selectedCompany = companies.find((c) => c.$id === selectedCompanyId)

  const handleSelectCompany = (c: Company) => {
    setSelectedCompanyId(c.$id)
    setCompanySearch("")
    setIsDropdownOpen(false)

    // Automatski povuci adresu iz baze SAMO ako je trenutno odabrano "Kod klijenta"
    if (locationType === "Kod klijenta") {
      const parts = [c.address, c.city].filter(Boolean)
      if (parts.length > 0) {
        setLocationNote(parts.join(", "))
      }
    }
  }

  const handleLocationTypeChange = (type: MeetingLocationType) => {
    setLocationType(type)
    if (type === "Kod klijenta") {
      if (selectedCompany) {
        const parts = [selectedCompany.address, selectedCompany.city].filter(Boolean)
        if (parts.length > 0) {
          setLocationNote(parts.join(", "))
        }
      }
    } else if (type === "Kancelarija") {
      // Kada je kancelarija, to je kod nas u firmi pa se prazni adresa klijenta
      setLocationNote("")
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!title.trim()) { setError("Naziv sastanka je obavezan."); return }
    if (!scheduledAt) { setError("Datum i vrijeme su obavezni."); return }
    if (!selectedCompanyId) { setError("Odaberite firmu za sastanak."); return }

    const data: MeetingInput = {
      title: title.trim(),
      scheduled_at: new Date(scheduledAt).toISOString(),
      duration_min: durationMin,
      location_type: locationType,
      location_note: locationNote.trim() || undefined,
      status,
      notes: notes.trim() || undefined,
      company_id: selectedCompanyId,
      company_name: selectedCompany?.company_name || undefined,
      reminder_at: status === "Na čekanju" && reminderAt ? new Date(reminderAt).toISOString() : null,
    }

    setIsSubmitting(true)
    try {
      let res
      if (isEditing && meeting) {
        res = await updateMeeting(meeting.$id, data)
      } else {
        res = await createMeeting(data)
      }

      if (res.success) {
        onOpenChange(false)
        onSuccess()
      } else {
        setError(res.error || "Došlo je do greške. Pokušajte ponovo.")
      }
    } catch {
      setError("Došlo je do neočekivane greške. Pokušajte ponovo.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary font-semibold">
            <RiCalendarEventLine className="size-5" />
            <span>{isEditing ? "Izmijeni sastanak" : "Zakaži novi sastanak"}</span>
          </div>
          <DialogTitle className="text-base font-bold text-foreground">
            {isEditing ? meeting?.title : "Novi sastanak"}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {isEditing
              ? "Izmijeni detalje zakazanog sastanka."
              : "Unesite detalje sastanka sa klijentom."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {/* Firma */}
          <div className="space-y-1.5" ref={dropdownRef}>
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold">Firma (klijent)</Label>
              {selectedCompany && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCompanyId("")
                    setCompanySearch("")
                    setIsDropdownOpen(true)
                  }}
                  className="text-[11px] font-medium text-primary hover:underline transition-colors"
                >
                  Promijeni
                </button>
              )}
            </div>

            {selectedCompany ? (
              <div
                onClick={() => {
                  setSelectedCompanyId("")
                  setCompanySearch("")
                  setIsDropdownOpen(true)
                }}
                className="flex items-center justify-between rounded-lg border border-border bg-muted/40 px-3 py-2 cursor-pointer hover:bg-muted/70 transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="size-7 rounded-md bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    <RiBuilding2Line className="size-4" />
                  </div>
                  <div className="truncate">
                    <span className="text-xs font-semibold text-foreground">{selectedCompany.company_name}</span>
                    {(selectedCompany.address || selectedCompany.city) && (
                      <p className="text-[11px] text-muted-foreground truncate">
                        {[selectedCompany.address, selectedCompany.city].filter(Boolean).join(", ")}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelectedCompanyId("")
                    setCompanySearch("")
                  }}
                  className="size-5 flex items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-destructive transition-colors"
                  title="Ukloni odabir"
                >
                  <RiCloseLine className="size-3.5" />
                </button>
              </div>
            ) : (
              <div className="relative">
                <RiSearchLine className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
                <Input
                  type="text"
                  placeholder="Pretraži firme po nazivu ili gradu..."
                  value={companySearch}
                  onFocus={() => setIsDropdownOpen(true)}
                  onChange={(e) => {
                    setCompanySearch(e.target.value)
                    setIsDropdownOpen(true)
                  }}
                  className="text-xs h-8 pl-8 pr-8"
                />
                {companySearch && (
                  <button
                    type="button"
                    onClick={() => {
                      setCompanySearch("")
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
                  >
                    <RiCloseLine className="size-3.5" />
                  </button>
                )}

                {/* Floating Absolute Dropdown List */}
                {isDropdownOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1 z-50 max-h-52 overflow-y-auto rounded-lg border border-border bg-popover text-popover-foreground shadow-lg p-1">
                    {filteredCompanies.length === 0 ? (
                      <div className="px-3 py-3 text-center text-xs text-muted-foreground">
                        Nema pronađenih firmi.
                      </div>
                    ) : (
                      filteredCompanies.map((c) => (
                        <button
                          key={c.$id}
                          type="button"
                          onClick={() => handleSelectCompany(c)}
                          className="flex items-center justify-between w-full rounded-md px-2.5 py-1.5 text-left text-xs hover:bg-accent hover:text-accent-foreground transition-colors"
                        >
                          <div className="flex items-center gap-2 truncate min-w-0 flex-1">
                            <RiBuilding2Line className="size-3.5 text-muted-foreground shrink-0" />
                            <div className="truncate">
                              <span className="font-medium text-foreground">{c.company_name}</span>
                              {c.address && (
                                <span className="text-[10px] text-muted-foreground ml-1.5 truncate">
                                  · {c.address}
                                </span>
                              )}
                            </div>
                          </div>
                          {c.city && (
                            <span className="text-[10px] text-muted-foreground shrink-0 ml-2 font-mono">
                              {c.city}
                            </span>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Naziv / Tema */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">
              Naziv / tema sastanka <span className="text-destructive">*</span>
            </Label>
            <Select value={selectedTitlePreset} onValueChange={handleTitlePresetChange}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Odaberite temu sastanka" />
              </SelectTrigger>
              <SelectContent>
                {TITLE_PRESETS.map((preset) => (
                  <SelectItem key={preset} value={preset} className="text-xs">
                    {preset}
                  </SelectItem>
                ))}
                <SelectItem value="custom" className="text-xs font-medium text-primary">
                  Prilagođeni unos (unesi ručno)...
                </SelectItem>
              </SelectContent>
            </Select>

            {selectedTitlePreset === "custom" && (
              <Input
                value={customTitle}
                onChange={(e) => handleCustomTitleChange(e.target.value)}
                placeholder="Unesite naziv ili temu sastanka..."
                className="text-xs h-8 mt-1.5"
                autoFocus
                required
              />
            )}
          </div>

          {/* Datum i Trajanje */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="meeting-date" className="text-xs font-semibold">
                Datum i Vrijeme <span className="text-destructive">*</span>
              </Label>
              <Input
                id="meeting-date"
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="text-xs h-8 font-mono"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Trajanje</Label>
              <Select value={String(durationMin)} onValueChange={(v) => setDurationMin(Number(v))}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DURATION_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={String(opt.value)} className="text-xs">
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Lokacija */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Lokacija <span className="text-destructive">*</span></Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleLocationTypeChange("Kancelarija")}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-xs font-medium transition-all text-left ${
                  locationType === "Kancelarija"
                    ? "border-primary/60 bg-primary/10 text-primary shadow-xs ring-1 ring-primary/30"
                    : "border-border bg-background hover:bg-accent/50 text-muted-foreground"
                }`}
              >
                <RiBuilding2Line className={`size-4 shrink-0 ${locationType === "Kancelarija" ? "text-primary" : "text-muted-foreground"}`} />
                <span className={locationType === "Kancelarija" ? "font-semibold text-foreground" : ""}>Kancelarija</span>
              </button>

              <button
                type="button"
                onClick={() => handleLocationTypeChange("Kod klijenta")}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-xs font-medium transition-all text-left ${
                  locationType === "Kod klijenta"
                    ? "border-primary/60 bg-primary/10 text-primary shadow-xs ring-1 ring-primary/30"
                    : "border-border bg-background hover:bg-accent/50 text-muted-foreground"
                }`}
              >
                <RiCarLine className={`size-4 shrink-0 ${locationType === "Kod klijenta" ? "text-primary" : "text-muted-foreground"}`} />
                <span className={locationType === "Kod klijenta" ? "font-semibold text-foreground" : ""}>Kod klijenta</span>
              </button>
            </div>
            <Input
              value={locationNote}
              onChange={(e) => setLocationNote(e.target.value)}
              placeholder={
                locationType === "Kancelarija"
                  ? "Sala za sastanke, sprat (opcionalno)..."
                  : "Adresa klijenta (npr. Ulica i broj, Grad)..."
              }
              className="text-xs h-8"
            />
          </div>

          {/* Status */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Status</Label>
            <Select value={status} onValueChange={(v) => {
              setStatus(v as MeetingStatus)
              // Resetuj podsjetnik ako se promijeni status
              if (v !== "Na čekanju") setReminderAt("")
            }}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Podsjetnik — samo kada je "Na čekanju" */}
            {status === "Na čekanju" && (
              <div className="mt-2.5 rounded-xl border border-dashed border-violet-300 bg-violet-50/60 dark:bg-violet-950/20 dark:border-violet-700 p-3 space-y-2.5">
                <div className="text-xs font-semibold text-violet-700 dark:text-violet-300 flex items-center gap-1.5">
                  <RiTimeLine className="size-3.5 shrink-0" />
                  Termin još nije potvrđen
                </div>
                <p className="text-[11px] text-violet-600/80 dark:text-violet-400 leading-relaxed">
                  Klijent treba kontaktirati ponovo. Postavi datum podsjetnika kada da ga podsjetiš ili provjeriš status.
                </p>
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-violet-700 dark:text-violet-300">
                    Podsjeti me na:
                  </Label>
                  <Input
                    type="datetime-local"
                    value={reminderAt}
                    onChange={(e) => setReminderAt(e.target.value)}
                    className="text-xs h-8 font-mono border-violet-200 dark:border-violet-700 focus-visible:ring-violet-400"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Opcionalno — ako ne uneseš, sastanak će biti vidljiv bez tačnog podsjetnika.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Bilješke */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Bilješke (opcionalno)</Label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Teme za razgovor, priprema, kontakt osoba..."
              rows={3}
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-xs shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
            />
          </div>

          {error && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive border border-destructive/20">
              {error}
            </p>
          )}

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Odustani
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="gap-1.5 min-w-24"
            >
              {isSubmitting ? (
                <>
                  <RiLoader4Line className="size-4 animate-spin" />
                  Čuvanje...
                </>
              ) : (
                <>
                  <RiCalendarEventLine className="size-4" />
                  {isEditing ? "Sačuvaj izmjene" : "Zakaži sastanak"}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
