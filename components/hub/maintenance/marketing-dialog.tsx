"use client"

import * as React from "react"
import { RiLoader4Line } from "@remixicon/react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createMarketingContractAction, updateMarketingContractAction } from "@/lib/hub/actions/marketing-contracts"
import { toDateInputValue } from "@/lib/hub/format"
import {
  ALL_MONTHS_MASK,
  CONTRACT_STATUS_LABELS,
  CONTRACT_STATUSES,
  hasMonth,
  isContractStatus,
  isMarketingCategory,
  MARKETING_CATEGORIES,
  MARKETING_CATEGORY_LABELS,
  MARKETING_SERVICE_SUGGESTIONS,
  MONTH_SHORT_NAMES,
  toggleMonth,
  type ContractStatus,
  type MarketingCategory,
} from "@/lib/hub/maintenance"
import type { HubClientOption, HubMarketingContract } from "@/lib/hub/types"
import { cn } from "@/lib/utils"
import { FormField } from "../projects/form/form-field"
import { ClientSelect } from "./client-select"
import { ServiceInput } from "./service-input"

interface MarketingDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** null = create a new contract */
  contract: HubMarketingContract | null
  clients: HubClientOption[]
  /** Year of the list that is open; a new contract starts in it. */
  year: number
  onSaved: () => void
}

function MarketingForm({
  contract,
  clients,
  year,
  onSaved,
  onClose,
}: Omit<MarketingDialogProps, "open" | "onOpenChange"> & { onClose: () => void }) {
  const [clientId, setClientId] = React.useState(contract?.client_id ?? "")
  const [category, setCategory] = React.useState<MarketingCategory>(
    contract && isMarketingCategory(contract.category) ? contract.category : "facebook_instagram"
  )
  const [service, setService] = React.useState(contract?.service ?? MARKETING_CATEGORY_LABELS.facebook_instagram)
  const [status, setStatus] = React.useState<ContractStatus>(
    contract && isContractStatus(contract.contract_status) ? contract.contract_status : "signed"
  )
  const [start, setStart] = React.useState(toDateInputValue(contract?.contract_start))
  const [end, setEnd] = React.useState(toDateInputValue(contract?.contract_end))
  const [months, setMonths] = React.useState(contract?.months ?? 0)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  // While the service still carries the name of the previous category, it follows the category.
  const changeCategory = (next: MarketingCategory) => {
    if (service.trim() === "" || service === MARKETING_CATEGORY_LABELS[category]) {
      setService(MARKETING_CATEGORY_LABELS[next])
    }
    setCategory(next)
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!clientId) return setError("Odaberite klijenta.")
    if (!service.trim()) return setError("Usluga je obavezna.")
    if (status === "signed" && (!start || !end)) return setError("Za postojeći ugovor unesite datum početka i kraja.")

    setIsSubmitting(true)
    setError(null)
    const payload = {
      client_id: clientId,
      category,
      service,
      contract_status: status,
      contract_start: start,
      contract_end: end,
      year: contract?.year ?? year,
      months,
    }
    const result = contract
      ? await updateMarketingContractAction(contract.$id, payload)
      : await createMarketingContractAction(payload)
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

      <FormField label="Komitent" htmlFor="marketing-client" required>
        <ClientSelect id="marketing-client" value={clientId} onChange={setClientId} clients={clients} />
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Kategorija" htmlFor="marketing-category" required>
          <Select value={category} onValueChange={(value) => changeCategory(value as MarketingCategory)}>
            <SelectTrigger id="marketing-category" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MARKETING_CATEGORIES.map((item) => (
                <SelectItem key={item} value={item}>
                  {MARKETING_CATEGORY_LABELS[item]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
        <FormField label="Usluga" htmlFor="marketing-service" required>
          <ServiceInput
            id="marketing-service"
            value={service}
            onChange={setService}
            suggestions={MARKETING_SERVICE_SUGGESTIONS}
          />
        </FormField>
      </div>

      <FormField label="Status ugovora" htmlFor="marketing-status" required>
        <Select value={status} onValueChange={(value) => setStatus(value as ContractStatus)}>
          <SelectTrigger id="marketing-status" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CONTRACT_STATUSES.map((item) => (
              <SelectItem key={item} value={item}>
                {CONTRACT_STATUS_LABELS[item]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>

      {status === "signed" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Ugovor od" htmlFor="marketing-start" required>
            <Input id="marketing-start" type="date" value={start} onChange={(event) => setStart(event.target.value)} />
          </FormField>
          <FormField label="Ugovor do" htmlFor="marketing-end" required>
            <Input id="marketing-end" type="date" value={end} onChange={(event) => setEnd(event.target.value)} />
          </FormField>
        </div>
      )}

      <FormField label={`Mjeseci rada u ${contract?.year ?? year}.`}>
        <div className="flex flex-wrap gap-1.5">
          {MONTH_SHORT_NAMES.map((name, month) => (
            <button
              key={name}
              type="button"
              aria-pressed={hasMonth(months, month)}
              onClick={() => setMonths(toggleMonth(months, month))}
              className={cn(
                "w-12 cursor-pointer rounded-md border py-1 text-xs transition-colors",
                hasMonth(months, month)
                  ? "border-primary bg-primary/10 font-medium text-primary"
                  : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
              )}
            >
              {name}
            </button>
          ))}
        </div>
        <div className="flex gap-3 pt-1 text-xs">
          <button type="button" className="cursor-pointer text-primary hover:underline" onClick={() => setMonths(ALL_MONTHS_MASK)}>
            Svi mjeseci
          </button>
          <button type="button" className="cursor-pointer text-muted-foreground hover:underline" onClick={() => setMonths(0)}>
            Očisti
          </button>
        </div>
      </FormField>

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

export function MarketingDialog({ open, onOpenChange, contract, clients, year, onSaved }: MarketingDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{contract ? "Uredi ugovor" : "Novi ugovor"}</DialogTitle>
          <DialogDescription>Digitalni marketing: trajanje ugovora i mjeseci u kojima se radi.</DialogDescription>
        </DialogHeader>
        {/* Remounted per contract so the fields always start from that contract's values. */}
        {open && (
          <MarketingForm
            key={contract?.$id ?? "new"}
            contract={contract}
            clients={clients}
            year={year}
            onSaved={onSaved}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
