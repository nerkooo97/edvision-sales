"use client"

import * as React from "react"
import { RiDownload2Line } from "@remixicon/react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { getClientAction } from "@/lib/hub/actions/clients"
import { defaultValues, missingRequired } from "@/lib/hub/contracts/form"
import { CLIENT_FIELDS, HEADER_FIELDS, prefillFromClient } from "@/lib/hub/contracts/party"
import { CONTRACT_TEMPLATES, getContractTemplate } from "@/lib/hub/contracts/templates"
import type { ContractTemplateId, ContractValues } from "@/lib/hub/contracts/types"
import type { HubClientOption } from "@/lib/hub/types"
import { FormField } from "../projects/form/form-field"
import { ClientSelect } from "../maintenance/client-select"
import { FieldGroupSection } from "./field-group-section"
import { TemplatePicker } from "./template-picker"

export function GeneratorView({ clients }: { clients: HubClientOption[] }) {
  const [templateId, setTemplateId] = React.useState<ContractTemplateId | null>(null)
  const [values, setValues] = React.useState<ContractValues>({})
  const [clientId, setClientId] = React.useState("")

  const template = templateId ? getContractTemplate(templateId) : null

  const selectTemplate = (id: ContractTemplateId) => {
    // Everything already typed stays; only what the new template needs and has no value yet gets its default.
    setValues((current) => ({ ...defaultValues(getContractTemplate(id)), ...current }))
    setTemplateId(id)
  }

  const setValue = (key: string, value: string) => setValues((current) => ({ ...current, [key]: value }))

  // The picker holds only names; the full client and its contacts are read once a client is chosen.
  const pickClient = async (id: string) => {
    setClientId(id)
    const result = await getClientAction(id)
    if (!result.success) return toast.error(result.error)
    const { client, contacts } = result.data
    setValues((current) => ({ ...current, ...prefillFromClient(client, contacts) }))
  }

  const missing = template ? missingRequired(template, values) : []
  const computed = template ? template.computed(values) : []

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <h3 className="text-sm font-semibold">1. Odaberite vrstu ugovora</h3>
        <TemplatePicker templates={CONTRACT_TEMPLATES} selected={templateId} onSelect={selectTemplate} />
      </section>

      {template && (
        <section className="space-y-4">
          <h3 className="text-sm font-semibold">2. Popunite podatke</h3>

          <FieldGroupSection group={HEADER_FIELDS} values={values} onChange={setValue} />

          <FieldGroupSection group={CLIENT_FIELDS} values={values} onChange={setValue}>
            <FormField label="Klijent iz baze (popunjava polja ispod)" htmlFor="contract-client">
              <ClientSelect id="contract-client" value={clientId} onChange={pickClient} clients={clients} />
              <p className="text-[11px] text-muted-foreground">
                Polja koja klijent nema u bazi ostaju prazna i popunjavaju se ručno. Sve se može ispraviti.
              </p>
            </FormField>
          </FieldGroupSection>

          {template.terms.map((group) => (
            <FieldGroupSection key={group.title} group={group} values={values} onChange={setValue} />
          ))}

          {computed.length > 0 && (
            <section className="space-y-2 rounded-xl border border-primary/30 bg-primary/5 p-4 lg:p-5">
              <h4 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">Izračunato</h4>
              <dl className="space-y-1 text-sm">
                {computed.map((row) => (
                  <div key={row.label} className="flex flex-wrap gap-x-3">
                    <dt className="text-muted-foreground">{row.label}:</dt>
                    <dd className="font-medium">{row.value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">
              {missing.length === 0
                ? "Sva obavezna polja su popunjena."
                : `Nedostaje obaveznih polja: ${missing.length} (${missing.slice(0, 3).join(", ")}${missing.length > 3 ? "..." : ""}).`}
            </p>
            <Button size="sm" disabled className="gap-1.5" title="Generisanje PDF-a je u izradi">
              <RiDownload2Line className="size-4" />
              Preuzmi PDF (uskoro)
            </Button>
          </div>
        </section>
      )}
    </div>
  )
}
