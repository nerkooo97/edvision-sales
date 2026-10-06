"use client"

import * as React from "react"
import { RiBuilding2Line, RiCloseLine, RiMailLine, RiPhoneLine } from "@remixicon/react"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { HubClientOption } from "@/lib/hub/types"
import { stripDiacritics } from "@/lib/utils"
import { FormField } from "./form-field"
import type { ProjectFormField, ProjectFormValues } from "./project-form-state"

interface ClientPickerProps {
  values: ProjectFormValues
  onChange: <K extends ProjectFormField>(field: K, value: ProjectFormValues[K]) => void
  canEdit: boolean
  /** Active clients, plus the one this project is already linked to even if it was deactivated since. */
  clients: HubClientOption[]
  /** Whether this user may save a new client into the client base. */
  canSaveClient: boolean
}

const MAX_SUGGESTIONS = 6
const normalize = (value: string) => stripDiacritics(value).toLowerCase().replace(/\s+/g, " ").trim()

function LinkedClientCard({ client, canEdit, onClear }: { client: HubClientOption; canEdit: boolean; onClear: () => void }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border border-primary/30 bg-primary/5 p-3.5">
      <div className="min-w-0 space-y-1">
        <p className="flex items-center gap-1.5 text-sm font-semibold">
          <RiBuilding2Line className="size-4 text-primary" />
          {client.name}
          {!client.is_active && <span className="text-[11px] font-normal text-muted-foreground">(neaktivan)</span>}
        </p>
        {client.city && <p className="text-xs text-muted-foreground">{client.city}</p>}
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
          {client.email && (
            <span className="inline-flex items-center gap-1">
              <RiMailLine className="size-3" />
              {client.email}
            </span>
          )}
          {client.phone && (
            <span className="inline-flex items-center gap-1">
              <RiPhoneLine className="size-3" />
              {client.phone}
            </span>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground">Podaci se uzimaju iz baze klijenata i uvijek su ažurni.</p>
      </div>
      {canEdit && (
        <button
          type="button"
          onClick={onClear}
          className="inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <RiCloseLine className="size-3.5" />
          Promijeni
        </button>
      )}
    </div>
  )
}

export function ClientPicker({ values, onChange, canEdit, clients, canSaveClient }: ClientPickerProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const linked = values.client_id ? clients.find((client) => client.$id === values.client_id) : undefined

  const query = normalize(values.client_name)
  const suggestions = React.useMemo(
    () =>
      clients
        .filter((client) => client.is_active && (!query || normalize(client.name).includes(query)))
        .slice(0, MAX_SUGGESTIONS),
    [clients, query]
  )
  const exactMatch = query ? clients.find((client) => normalize(client.name) === query) : undefined

  const select = (client: HubClientOption) => {
    onChange("client_id", client.$id)
    onChange("client_name", client.name)
    setIsOpen(false)
  }

  const clear = () => {
    onChange("client_id", "")
    onChange("client_name", "")
    onChange("client_contact", "")
    onChange("client_email", "")
    onChange("client_phone", "")
    onChange("save_client", canSaveClient)
  }

  if (values.client_id) {
    // The saved client may be missing from the list only if it was deleted; show what we know then.
    return linked ? (
      <LinkedClientCard client={linked} canEdit={canEdit} onClear={clear} />
    ) : (
      <div className="rounded-xl border border-border p-3.5 text-sm">
        {values.client_name || "Klijent"}
        {canEdit && (
          <button type="button" onClick={clear} className="ml-3 cursor-pointer text-xs text-primary hover:underline">
            Promijeni
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <FormField label="Klijent" htmlFor="project-client_name" required>
          <Input
            id="project-client_name"
            value={values.client_name}
            disabled={!canEdit}
            autoComplete="off"
            maxLength={300}
            placeholder="Pretražite klijente ili upišite novog..."
            onFocus={() => setIsOpen(true)}
            onBlur={() => setTimeout(() => setIsOpen(false), 150)}
            onChange={(event) => {
              onChange("client_name", event.target.value)
              setIsOpen(true)
            }}
          />
        </FormField>

        {isOpen && canEdit && suggestions.length > 0 && (
          <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-border bg-popover p-1 shadow-lg">
            {suggestions.map((client) => (
              <li key={client.$id}>
                <button
                  type="button"
                  // mouseDown fires before the input's blur, so the click is not lost when the list closes.
                  onMouseDown={(event) => {
                    event.preventDefault()
                    select(client)
                  }}
                  className="flex w-full cursor-pointer flex-col rounded-lg px-3 py-2 text-left hover:bg-muted"
                >
                  <span className="text-sm font-medium">{client.name}</span>
                  {client.city && <span className="text-xs text-muted-foreground">{client.city}</span>}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {exactMatch && exactMatch.is_active ? (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          Klijent „{exactMatch.name}“ već postoji u bazi.{" "}
          <button type="button" onClick={() => select(exactMatch)} className="cursor-pointer font-medium underline">
            Odaberi ga
          </button>
        </p>
      ) : null}

      <div className="grid gap-3 rounded-xl border border-border bg-muted/30 p-3 sm:grid-cols-3">
        <FormField label="Kontakt osoba" htmlFor="project-client_contact">
          <Input
            id="project-client_contact"
            value={values.client_contact}
            disabled={!canEdit}
            maxLength={200}
            onChange={(event) => onChange("client_contact", event.target.value)}
          />
        </FormField>
        <FormField label="Email" htmlFor="project-client_email">
          <Input
            id="project-client_email"
            type="email"
            value={values.client_email}
            disabled={!canEdit}
            maxLength={320}
            onChange={(event) => onChange("client_email", event.target.value)}
          />
        </FormField>
        <FormField label="Telefon" htmlFor="project-client_phone">
          <Input
            id="project-client_phone"
            type="tel"
            value={values.client_phone}
            disabled={!canEdit}
            maxLength={50}
            placeholder="+387..."
            onChange={(event) => onChange("client_phone", event.target.value)}
          />
        </FormField>
      </div>

      {canEdit && canSaveClient && values.client_name.trim() && !exactMatch && (
        <div className="flex items-start gap-2.5">
          <Checkbox
            id="project-save_client"
            checked={values.save_client}
            onCheckedChange={(checked) => onChange("save_client", checked === true)}
            className="mt-0.5"
          />
          <Label htmlFor="project-save_client" className="cursor-pointer text-xs leading-snug font-normal">
            Sačuvaj u bazu klijenata
            <span className="block text-muted-foreground">
              Sljedeći put ga birate s liste i podaci se popune sami. Isključite za jednokratnog klijenta.
            </span>
          </Label>
        </div>
      )}
    </div>
  )
}
