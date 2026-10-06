"use client"

import * as React from "react"
import { RiLoader4Line } from "@remixicon/react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { createMaintenanceContractAction, updateMaintenanceContractAction } from "@/lib/hub/actions/maintenance-contracts"
import { toDateInputValue } from "@/lib/hub/format"
import { MAINTENANCE_SERVICE_SUGGESTIONS, suggestMaintenanceEnd } from "@/lib/hub/maintenance"
import type { HubClientOption, HubMaintenanceContract } from "@/lib/hub/types"
import { FormField } from "../projects/form/form-field"
import { ClientSelect } from "./client-select"
import { ServiceInput } from "./service-input"

const DEFAULT_SERVICE = "Održavanje web stranice"

interface MaintenanceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** null = create a new contract */
  contract: HubMaintenanceContract | null
  clients: HubClientOption[]
  onSaved: () => void
}

function MaintenanceForm({
  contract,
  clients,
  onSaved,
  onClose,
}: Omit<MaintenanceDialogProps, "open" | "onOpenChange"> & { onClose: () => void }) {
  const [clientId, setClientId] = React.useState(contract?.client_id ?? "")
  const [domain, setDomain] = React.useState(contract?.domain ?? "")
  const [service, setService] = React.useState(contract?.service ?? DEFAULT_SERVICE)
  const [start, setStart] = React.useState(toDateInputValue(contract?.start_date))
  const [end, setEnd] = React.useState(toDateInputValue(contract?.end_date))
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  // Contracts run for a year: the end follows the start until it is set by hand to something else.
  const changeStart = (next: string) => {
    if (next && (end === "" || (start !== "" && end === suggestMaintenanceEnd(start)))) {
      setEnd(suggestMaintenanceEnd(next))
    }
    setStart(next)
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!clientId) return setError("Odaberite klijenta.")
    if (!service.trim()) return setError("Usluga je obavezna.")
    if (!start || !end) return setError("Unesite datum početka i kraja ugovora.")

    setIsSubmitting(true)
    setError(null)
    const payload = { client_id: clientId, domain, service, start_date: start, end_date: end }
    const result = contract
      ? await updateMaintenanceContractAction(contract.$id, payload)
      : await createMaintenanceContractAction(payload)
    setIsSubmitting(false)

    if (!result.success) return setError(result.error)
    toast.success(contract ? "Ugovor je sačuvan." : "Ugovor je dodan.")
    onSaved()
    onClose()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-2.5 text-xs text-destructive">
          {error}
        </div>
      )}

      <FormField label="Komitent" htmlFor="maintenance-client" required>
        <ClientSelect id="maintenance-client" value={clientId} onChange={setClientId} clients={clients} />
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Domena" htmlFor="maintenance-domain">
          <Input
            id="maintenance-domain"
            value={domain}
            onChange={(event) => setDomain(event.target.value)}
            placeholder="primjer.ba"
            maxLength={300}
          />
        </FormField>
        <FormField label="Usluga" htmlFor="maintenance-service" required>
          <ServiceInput
            id="maintenance-service"
            value={service}
            onChange={setService}
            suggestions={MAINTENANCE_SERVICE_SUGGESTIONS}
          />
        </FormField>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Od" htmlFor="maintenance-start" required>
          <Input id="maintenance-start" type="date" value={start} onChange={(event) => changeStart(event.target.value)} />
        </FormField>
        <FormField label="Do" htmlFor="maintenance-end" required>
          <Input id="maintenance-end" type="date" value={end} onChange={(event) => setEnd(event.target.value)} />
        </FormField>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting} className="cursor-pointer">
          Odustani
        </Button>
        <Button type="submit" size="sm" disabled={isSubmitting} className="cursor-pointer gap-1.5">
          {isSubmitting && <RiLoader4Line className="size-4 animate-spin" />}
          {contract ? "Sačuvaj" : "Dodaj ugovor"}
        </Button>
      </DialogFooter>
    </form>
  )
}

export function MaintenanceDialog({ open, onOpenChange, contract, clients, onSaved }: MaintenanceDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{contract ? "Uredi ugovor" : "Novi ugovor"}</DialogTitle>
          <DialogDescription>Održavanje web stranice: ugovor traje godinu dana.</DialogDescription>
        </DialogHeader>
        {/* Remounted per contract so the fields always start from that contract's values. */}
        {open && (
          <MaintenanceForm
            key={contract?.$id ?? "new"}
            contract={contract}
            clients={clients}
            onSaved={onSaved}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
