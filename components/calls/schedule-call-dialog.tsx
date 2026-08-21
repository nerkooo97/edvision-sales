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
import { RiCalendarEventLine, RiTimeLine } from "@remixicon/react"
import type { CallItem } from "@/lib/appwrite/calls"
import type { Company } from "@/lib/appwrite/companies"
import type { Lead } from "@/lib/appwrite/leads"
import { scheduleCallAction } from "@/lib/appwrite/calls"

interface ScheduleCallDialogProps {
  call: CallItem | null
  companies: Company[]
  leads: Lead[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function ScheduleCallDialog({
  call,
  companies,
  leads,
  open,
  onOpenChange,
  onSuccess,
}: ScheduleCallDialogProps) {
  const [selectedCompanyId, setSelectedCompanyId] = React.useState("")
  const [scheduledDate, setScheduledDate] = React.useState("")
  const [notes, setNotes] = React.useState("")
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  // Default to tomorrow 09:00
  React.useEffect(() => {
    if (open) {
      if (call) {
        setSelectedCompanyId(call.companyId)
        setNotes(call.contextNote || "")
      } else if (companies.length > 0) {
        setSelectedCompanyId(companies[0].$id)
        setNotes("")
      }

      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(9, 30, 0, 0)
      setScheduledDate(tomorrow.toISOString().slice(0, 16))
    }
  }, [open, call, companies])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!scheduledDate) {
      alert("Odaberite datum i vrijeme poziva.")
      return
    }

    const targetCompanyId = call?.companyId || selectedCompanyId
    const matchingLead = leads.find((l) => {
      const cId = typeof l.company === "object" && l.company ? l.company.$id : l.company
      return cId === targetCompanyId
    })

    const targetLeadId = call?.leadId || matchingLead?.$id || ""
    const compObj = companies.find((c) => c.$id === targetCompanyId)
    const phone = call?.phone || compObj?.phones?.[0] || ""

    setIsSubmitting(true)
    const res = await scheduleCallAction({
      leadId: targetLeadId,
      companyId: targetCompanyId,
      scheduledDate,
      notes: notes || "Zakazan telefonski poziv.",
      phone: phone && phone !== "Nema broja" ? phone : undefined,
    })
    setIsSubmitting(false)

    if (res.success) {
      onOpenChange(false)
      onSuccess()
    } else {
      alert(res.error || "Greška pri zakazivanju poziva.")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary font-semibold">
            <RiCalendarEventLine className="size-5" />
            <span>{call ? "Odgodi / Zakaži novi termin" : "Zakaži telefonski poziv ručno"}</span>
          </div>
          <DialogTitle className="text-base font-bold text-foreground">
            {call ? call.companyName : "Novi poziv"}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Postavite datum i vrijeme za kontaktiranje klijenta.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Company Selection (if not rescheduling specific call) */}
          {!call && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Kompanija</Label>
              <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                <SelectTrigger className="w-full text-xs">
                  <SelectValue placeholder="Odaberite kompaniju" />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((c) => (
                    <SelectItem key={c.$id} value={c.$id}>
                      {c.company_name} ({c.city || "BiH"})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Date and Time */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Datum i vrijeme poziva</Label>
            <Input
              type="datetime-local"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              className="text-xs font-mono"
              required
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Razlog poziva / Kontekst</Label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Npr. Klijent tražio ponudu za web, provjeriti mobilni prikaz..."
              rows={3}
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-xs shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>

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
              className="gap-1.5 bg-primary text-primary-foreground"
            >
              <RiTimeLine className="size-4" />
              {isSubmitting ? "Spremanje..." : "Sačuvaj termin"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
