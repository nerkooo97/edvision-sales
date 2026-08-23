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
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { RiCheckLine, RiPhoneLine } from "@remixicon/react"
import type { CallItem } from "@/lib/appwrite/calls"
import { completeCallAction } from "@/lib/appwrite/calls"

interface CompleteCallDialogProps {
  call: CallItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

const OUTCOMES = [
  "Zainteresovan - Priprema se ponuda",
  "Dogovoren online sastanak / demo",
  "Poslata ponuda na razmatranje",
  "Čeka se odgovor / Zvati ponovo",
  "Odbio ponudu - Nema budžeta",
  "Ne javlja se na telefon",
]

const LEAD_STATUSES = [
  "U pregovorima",
  "Kvalifikovan",
  "Zaključeno - Dobijeno",
  "Kontaktiran",
  "Odbijeno",
  "Ne javlja se",
]

export function CompleteCallDialog({
  call,
  open,
  onOpenChange,
  onSuccess,
}: CompleteCallDialogProps) {
  const [outcome, setOutcome] = React.useState(OUTCOMES[0])
  const [newLeadStatus, setNewLeadStatus] = React.useState("U pregovorima")
  const [notes, setNotes] = React.useState("")
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  React.useEffect(() => {
    if (open) {
      setOutcome(OUTCOMES[0])
      setNewLeadStatus("U pregovorima")
      setNotes("")
    }
  }, [open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!call) return

    setIsSubmitting(true)
    const res = await completeCallAction({
      leadId: call.leadId,
      companyId: call.companyId,
      outcome,
      notes: notes || `Poziv obavljen sa ${call.companyName}. Ishod: ${outcome}`,
      newLeadStatus,
      phone: call.phone && call.phone !== "Nema broja" ? call.phone : undefined,
    })
    setIsSubmitting(false)

    if (res.success) {
      onOpenChange(false)
      onSuccess()
    } else {
      alert(res.error || "Greška pri evidentiranju ishoda poziva.")
    }
  }

  if (!call) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 text-emerald-600 font-semibold">
            <RiPhoneLine className="size-5" />
            <span>Završi poziv i evidentiraj ishod</span>
          </div>
          <DialogTitle className="text-base font-bold text-foreground">
            {call.companyName}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Zabilježite ishod razgovora. Zapis će se automatski upisati u Dnevnik kontakata i ažurirati status leada.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Outcome selection */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Ishod razgovora</Label>
            <Select value={outcome} onValueChange={setOutcome}>
              <SelectTrigger className="w-full text-xs">
                <SelectValue placeholder="Odaberite ishod" />
              </SelectTrigger>
              <SelectContent>
                {OUTCOMES.map((o) => (
                  <SelectItem key={o} value={o}>
                    {o}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* New Lead Pipeline Status */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Novi status leada u cjevovodu</Label>
            <Select value={newLeadStatus} onValueChange={setNewLeadStatus}>
              <SelectTrigger className="w-full text-xs">
                <SelectValue placeholder="Odaberite novi status" />
              </SelectTrigger>
              <SelectContent>
                {LEAD_STATUSES.map((st) => (
                  <SelectItem key={st} value={st}>
                    {st}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Zabilješka sa razgovora (Opcionalno)</Label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Unesite ključne detalje razgovora, zahtjeve klijenta ili dogovorene stavke..."
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
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <RiCheckLine className="size-4" />
              {isSubmitting ? "Snimanje..." : "Evidentiraj poziv"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
