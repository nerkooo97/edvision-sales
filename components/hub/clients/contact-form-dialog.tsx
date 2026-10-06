"use client"

import * as React from "react"
import { RiLoader4Line } from "@remixicon/react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { createContactAction, updateContactAction } from "@/lib/hub/actions/client-contacts"
import type { HubClientContact } from "@/lib/hub/types"
import { FormField } from "../projects/form/form-field"

interface ContactFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  clientId: string
  /** null = add a new contact */
  contact: HubClientContact | null
  /** A client's first contact always becomes its primary one. */
  isFirst: boolean
  onSaved: () => void
}

type TextKey = "first_name" | "last_name" | "position" | "email" | "phone"
type Values = Record<TextKey, string> & { is_primary: boolean; is_active: boolean }

const valuesFrom = (contact: HubClientContact | null, isFirst: boolean): Values => ({
  first_name: contact?.first_name ?? "",
  last_name: contact?.last_name ?? "",
  position: contact?.position ?? "",
  email: contact?.email ?? "",
  phone: contact?.phone ?? "",
  is_primary: contact?.is_primary ?? isFirst,
  is_active: contact?.is_active ?? true,
})

function ContactForm({
  clientId,
  contact,
  isFirst,
  onSaved,
  onClose,
}: Omit<ContactFormDialogProps, "open" | "onOpenChange"> & { onClose: () => void }) {
  const [values, setValues] = React.useState<Values>(() => valuesFrom(contact, isFirst))
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const set = <K extends keyof Values>(key: K, value: Values[K]) => setValues((current) => ({ ...current, [key]: value }))
  const text = (key: TextKey) => ({
    id: `contact-${key}`,
    value: values[key],
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => set(key, event.target.value),
  })

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!values.first_name.trim()) return setError("Ime je obavezno.")

    setIsSubmitting(true)
    setError(null)
    const result = contact
      ? await updateContactAction(contact.$id, values)
      : await createContactAction({ ...values, client_id: clientId })
    setIsSubmitting(false)

    if (!result.success) return setError(result.error)
    toast.success(contact ? "Kontakt je sačuvan." : "Kontakt je dodan.")
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
        <FormField label="Ime" htmlFor="contact-first_name" required>
          <Input {...text("first_name")} maxLength={100} autoFocus />
        </FormField>
        <FormField label="Prezime" htmlFor="contact-last_name">
          <Input {...text("last_name")} maxLength={100} />
        </FormField>
        <FormField label="Pozicija" htmlFor="contact-position" className="sm:col-span-2">
          <Input {...text("position")} maxLength={150} placeholder="npr. Direktor" />
        </FormField>
        <FormField label="Email" htmlFor="contact-email">
          <Input {...text("email")} type="email" maxLength={320} />
        </FormField>
        <FormField label="Telefon" htmlFor="contact-phone">
          <Input {...text("phone")} type="tel" maxLength={50} placeholder="+387..." />
        </FormField>
      </div>

      <div className="space-y-2">
        <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-border p-3">
          <span>
            <span className="block text-sm font-medium">Glavni kontakt</span>
            <span className="block text-xs text-muted-foreground">Prikazuje se na projektima i u ugovorima.</span>
          </span>
          <Switch checked={values.is_primary} onCheckedChange={(checked) => set("is_primary", checked)} />
        </label>
        {contact && (
          <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-border p-3">
            <span>
              <span className="block text-sm font-medium">Aktivan kontakt</span>
              <span className="block text-xs text-muted-foreground">Osoba koja više ne radi kod klijenta ostaje u historiji.</span>
            </span>
            <Switch checked={values.is_active} onCheckedChange={(checked) => set("is_active", checked)} />
          </label>
        )}
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting} className="cursor-pointer">
          Odustani
        </Button>
        <Button type="submit" size="sm" disabled={isSubmitting} className="cursor-pointer gap-1.5">
          {isSubmitting && <RiLoader4Line className="size-4 animate-spin" />}
          {contact ? "Sačuvaj" : "Dodaj kontakt"}
        </Button>
      </DialogFooter>
    </form>
  )
}

export function ContactFormDialog({ open, onOpenChange, ...props }: ContactFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{props.contact ? "Uredi kontakt" : "Novi kontakt"}</DialogTitle>
          <DialogDescription>Kontakt osoba klijenta.</DialogDescription>
        </DialogHeader>
        {open && <ContactForm key={props.contact?.$id ?? "new"} {...props} onClose={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  )
}
