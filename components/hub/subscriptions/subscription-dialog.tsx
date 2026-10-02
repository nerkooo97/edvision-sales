"use client"

import * as React from "react"
import { RiLoader4Line } from "@remixicon/react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createSubscriptionAction, updateSubscriptionAction } from "@/lib/hub/actions/subscriptions"
import { toDateInputValue } from "@/lib/hub/format"
import {
  DEFAULT_SUBSCRIPTION_CURRENCY,
  isSubscriptionCurrency,
  SUBSCRIPTION_CURRENCIES,
  SUBSCRIPTION_PRESETS,
  type SubscriptionCurrency,
} from "@/lib/hub/subscriptions"
import type { HubMember, HubSubscription } from "@/lib/hub/types"
import { cn } from "@/lib/utils"
import { FormField } from "../projects/form/form-field"

interface SubscriptionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** null = create a new subscription */
  subscription: HubSubscription | null
  /** Everyone with an account; the subscription is registered to one of them. */
  holders: Pick<HubMember, "id" | "name">[]
  onSaved: () => void
}

function SubscriptionForm({
  holders,
  subscription,
  onSaved,
  onClose,
}: Omit<SubscriptionDialogProps, "open" | "onOpenChange"> & { onClose: () => void }) {
  const [name, setName] = React.useState(subscription?.name ?? "")
  const [paymentDate, setPaymentDate] = React.useState(toDateInputValue(subscription?.payment_date))
  const [holderId, setHolderId] = React.useState(subscription?.holder_id ?? "")
  const [price, setPrice] = React.useState(subscription ? String(subscription.price) : "")
  const [currency, setCurrency] = React.useState<SubscriptionCurrency>(
    subscription?.currency && isSubscriptionCurrency(subscription.currency)
      ? subscription.currency
      : subscription
        ? "KM"
        : DEFAULT_SUBSCRIPTION_CURRENCY
  )
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!name.trim()) return setError("Naziv pretplate je obavezan.")
    if (!paymentDate) return setError("Datum plaćanja je obavezan.")
    if (!holderId) return setError("Odaberite na koga je pretplata.")
    const amount = Number(price)
    if (price.trim() === "" || !Number.isFinite(amount)) return setError("Unesite ispravnu cijenu.")

    setIsSubmitting(true)
    setError(null)
    const payload = { name, payment_date: paymentDate, holder_id: holderId, price: amount, currency }
    const result = subscription
      ? await updateSubscriptionAction(subscription.$id, payload)
      : await createSubscriptionAction(payload)
    setIsSubmitting(false)

    if (!result.success) return setError(result.error)
    toast.success(subscription ? "Pretplata je sačuvana." : "Pretplata je dodana.")
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

      <FormField label="Naziv pretplate" htmlFor="subscription-name" required>
        <Input
          id="subscription-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={200}
          autoFocus
        />
        <div className="flex flex-wrap gap-1.5 pt-1">
          {SUBSCRIPTION_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              aria-pressed={name.trim() === preset}
              onClick={() => setName(preset)}
              className={cn(
                "cursor-pointer rounded-full border px-2.5 py-1 text-xs transition-colors",
                name.trim() === preset
                  ? "border-primary bg-primary/10 font-medium text-primary"
                  : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
              )}
            >
              {preset}
            </button>
          ))}
        </div>
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Datum plaćanja" htmlFor="subscription-date" required>
          <Input
            id="subscription-date"
            type="date"
            value={paymentDate}
            onChange={(event) => setPaymentDate(event.target.value)}
          />
        </FormField>
        <FormField label="Cijena" htmlFor="subscription-price" required>
          <div className="flex gap-2">
            <Input
              id="subscription-price"
              type="number"
              min={0}
              step="0.01"
              inputMode="decimal"
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              placeholder="0"
              className="min-w-0 flex-1"
            />
            <Select value={currency} onValueChange={(value) => setCurrency(value as SubscriptionCurrency)}>
              <SelectTrigger className="w-24 shrink-0" aria-label="Valuta">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SUBSCRIPTION_CURRENCIES.map((code) => (
                  <SelectItem key={code} value={code}>
                    {code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </FormField>
      </div>

      <FormField label="Ime na koga je pretplata" htmlFor="subscription-holder" required>
        <Select value={holderId} onValueChange={setHolderId}>
          <SelectTrigger id="subscription-holder" className="w-full">
            <SelectValue placeholder="Odaberite korisnika" />
          </SelectTrigger>
          <SelectContent>
            {holders.map((holder) => (
              <SelectItem key={holder.id} value={holder.id}>
                {holder.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>

      <DialogFooter>
        <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting} className="cursor-pointer">
          Odustani
        </Button>
        <Button type="submit" size="sm" disabled={isSubmitting} className="cursor-pointer gap-1.5">
          {isSubmitting && <RiLoader4Line className="size-4 animate-spin" />}
          {subscription ? "Sačuvaj" : "Dodaj pretplatu"}
        </Button>
      </DialogFooter>
    </form>
  )
}

export function SubscriptionDialog({ open, onOpenChange, subscription, holders, onSaved }: SubscriptionDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{subscription ? "Uredi pretplatu" : "Nova pretplata"}</DialogTitle>
          <DialogDescription>Unesite podatke o aktivnoj pretplati.</DialogDescription>
        </DialogHeader>
        {/* Remounted per subscription so the fields always start from that subscription's values. */}
        {open && (
          <SubscriptionForm
            key={subscription?.$id ?? "new"}
            subscription={subscription}
            holders={holders}
            onSaved={onSaved}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
