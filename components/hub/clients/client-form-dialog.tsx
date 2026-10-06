"use client"

import * as React from "react"
import { RiLoader4Line } from "@remixicon/react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { createClientAction, updateClientAction } from "@/lib/hub/actions/clients"
import { BIH_REGIONS, COUNTRIES, DEFAULT_COUNTRY } from "@/lib/hub/countries"
import type { HubClient } from "@/lib/hub/types"
import { FormField } from "../projects/form/form-field"

interface ClientFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** null = create a new client */
  client: HubClient | null
  onSaved: () => void
}

type TextKey = "name" | "email" | "phone" | "address" | "postal_code" | "city" | "region" | "tax_id" | "website" | "notes"
type Values = Record<TextKey, string> & { country: string; vat_registered: boolean; is_active: boolean }

const valuesFrom = (client: HubClient | null): Values => ({
  name: client?.name ?? "",
  email: client?.email ?? "",
  phone: client?.phone ?? "",
  address: client?.address ?? "",
  postal_code: client?.postal_code ?? "",
  city: client?.city ?? "",
  region: client?.region ?? "",
  country: client?.country ?? DEFAULT_COUNTRY,
  tax_id: client?.tax_id ?? "",
  vat_registered: client?.vat_registered ?? false,
  website: client?.website ?? "",
  notes: client?.notes ?? "",
  is_active: client?.is_active ?? true,
})

const REGION_LIST_ID = "client-region-options"

function SwitchRow({ title, hint, checked, onChange }: { title: string; hint: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border p-3">
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  )
}

function ClientForm({ client, onSaved, onClose }: Omit<ClientFormDialogProps, "open" | "onOpenChange"> & { onClose: () => void }) {
  const [values, setValues] = React.useState<Values>(() => valuesFrom(client))
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const set = <K extends keyof Values>(key: K, value: Values[K]) => setValues((current) => ({ ...current, [key]: value }))
  const text = (key: TextKey) => ({
    id: `client-${key}`,
    value: values[key],
    onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => set(key, event.target.value),
  })

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!values.name.trim()) return setError("Naziv klijenta je obavezan.")

    setIsSubmitting(true)
    setError(null)
    const result = client ? await updateClientAction(client.$id, values) : await createClientAction(values)
    setIsSubmitting(false)

    if (!result.success) return setError(result.error)
    toast.success(client ? "Klijent je sačuvan." : "Klijent je dodan.")
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

      <div className="grid gap-3 sm:grid-cols-2">
        <FormField label="Naziv klijenta" htmlFor="client-name" required className="sm:col-span-2">
          <Input {...text("name")} maxLength={300} autoFocus />
        </FormField>
        <FormField label="ID broj (JIB)" htmlFor="client-tax_id">
          <Input {...text("tax_id")} maxLength={50} placeholder="13 cifara" />
        </FormField>
        <FormField label="Telefon" htmlFor="client-phone">
          <Input {...text("phone")} type="tel" maxLength={50} placeholder="+387..." />
        </FormField>
        <FormField label="Email" htmlFor="client-email">
          <Input {...text("email")} type="email" maxLength={320} />
        </FormField>
        <FormField label="Web stranica" htmlFor="client-website">
          <Input {...text("website")} maxLength={500} placeholder="www.primjer.ba" />
        </FormField>
        <FormField label="Adresa" htmlFor="client-address" className="sm:col-span-2">
          <Input {...text("address")} maxLength={300} />
        </FormField>
        <FormField label="Poštanski broj" htmlFor="client-postal_code">
          <Input {...text("postal_code")} maxLength={20} />
        </FormField>
        <FormField label="Grad" htmlFor="client-city">
          <Input {...text("city")} maxLength={100} />
        </FormField>
        <FormField label="Kanton / regija" htmlFor="client-region">
          <Input {...text("region")} maxLength={100} list={values.country === DEFAULT_COUNTRY ? REGION_LIST_ID : undefined} />
          <datalist id={REGION_LIST_ID}>
            {BIH_REGIONS.map((region) => (
              <option key={region} value={region} />
            ))}
          </datalist>
        </FormField>
        <FormField label="Država" htmlFor="client-country">
          <Select value={values.country} onValueChange={(country) => set("country", country)}>
            <SelectTrigger id="client-country" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(COUNTRIES).map(([code, name]) => (
                <SelectItem key={code} value={code}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
        <FormField label="Napomene" htmlFor="client-notes" className="sm:col-span-2">
          <Textarea {...text("notes")} rows={3} maxLength={3000} />
        </FormField>
      </div>

      <SwitchRow
        title="U sistemu PDV-a"
        hint="PDV broj je ID broj bez početne cifre 4."
        checked={values.vat_registered}
        onChange={(checked) => set("vat_registered", checked)}
      />
      {client && (
        <SwitchRow
          title="Aktivan klijent"
          hint="Neaktivni klijenti se ne nude pri kreiranju novih projekata."
          checked={values.is_active}
          onChange={(checked) => set("is_active", checked)}
        />
      )}

      <DialogFooter>
        <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting} className="cursor-pointer">
          Odustani
        </Button>
        <Button type="submit" size="sm" disabled={isSubmitting} className="cursor-pointer gap-1.5">
          {isSubmitting && <RiLoader4Line className="size-4 animate-spin" />}
          {client ? "Sačuvaj" : "Dodaj klijenta"}
        </Button>
      </DialogFooter>
    </form>
  )
}

export function ClientFormDialog({ open, onOpenChange, client, onSaved }: ClientFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{client ? "Uredi klijenta" : "Novi klijent"}</DialogTitle>
          <DialogDescription>
            Podaci se automatski prikazuju na svim projektima ovog klijenta. Kontakt osobe se dodaju na stranici klijenta.
          </DialogDescription>
        </DialogHeader>
        {open && <ClientForm key={client?.$id ?? "new"} client={client} onSaved={onSaved} onClose={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  )
}
