"use client"

import * as React from "react"
import { RiAddLine, RiCheckLine, RiDownload2Line, RiLoader4Line } from "@remixicon/react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { getClientAction } from "@/lib/hub/actions/clients"
import { Input } from "@/components/ui/input"
import { createGeneratedContractAction, getNextContractNumberAction } from "@/lib/hub/actions/generated-contracts"
import { defaultValues, missingRequired } from "@/lib/hub/contracts/form"
import { CLIENT_FIELDS, CLIENT_FIELD_KEYS, HEADER_FIELDS, prefillFromClient } from "@/lib/hub/contracts/party"
import { downloadContractPdf } from "@/lib/hub/contracts/pdf/download"
import { CONTRACT_TEMPLATES, getContractTemplate } from "@/lib/hub/contracts/templates"
import type { ContractTemplateId, ContractValues } from "@/lib/hub/contracts/types"
import type { HubClientOption } from "@/lib/hub/types"
import { FormField } from "../projects/form/form-field"
import { ClientSelect } from "../maintenance/client-select"
import { FieldGroupSection } from "./field-group-section"
import { TemplatePicker } from "./template-picker"

interface GeneratorViewProps {
  clients: HubClientOption[]
  /** Saving (and so numbering) a contract is for those who manage contracts. */
  canSave: boolean
}

export function GeneratorView({ clients, canSave }: GeneratorViewProps) {
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
  // Another client replaces the whole "Naručilac" part, so nothing of the previous one is left behind.
  const latestPick = React.useRef("")
  const pickClient = async (id: string) => {
    latestPick.current = id
    setClientId(id)
    const result = await getClientAction(id)
    if (latestPick.current !== id) return
    if (!result.success) return toast.error(result.error)
    const { client, contacts } = result.data
    const blank = Object.fromEntries(CLIENT_FIELD_KEYS.map((key) => [key, ""]))
    setValues((current) => ({ ...current, ...blank, ...prefillFromClient(client, contacts) }))
  }

  const missing = template ? missingRequired(template, values) : []
  const computed = template ? template.computed(values) : []

  // Saving stores the form and gives the number; the PDF is then made in the browser and only downloaded.
  // A saved contract is locked: a change means a new contract with a new number, so the form starts over.
  const [isGenerating, setIsGenerating] = React.useState(false)
  const [saved, setSaved] = React.useState<{ number: string; values: ContractValues } | null>(null)

  const downloadPdf = async (pdfValues: ContractValues) => {
    if (!templateId) return
    try {
      const { overflow } = await downloadContractPdf(templateId, pdfValues)
      if (overflow.length > 0) {
        toast.warning(`Neki tekst je predug za svoje polje u ugovoru: ${overflow.map((text) => `"${text}"`).join(", ")}. Provjerite PDF.`)
      }
    } catch (error) {
      console.error("Contract PDF failed:", error)
      toast.error("Generisanje PDF-a nije uspjelo. Ugovor je sačuvan, preuzmite ga ponovo.")
    }
  }

  const saveAndDownload = async () => {
    if (!templateId || !clientId || missing.length > 0 || saved) return
    setIsGenerating(true)
    const result = await createGeneratedContractAction({ template: templateId, client_id: clientId, values })
    if (!result.success) {
      setIsGenerating(false)
      toast.error(result.error)
      return
    }
    setSaved({ number: result.data.contractNumber, values: result.data.values })
    toast.success(`Ugovor ${result.data.contractNumber} je sačuvan.`)
    if (!result.data.trackedInTables) {
      toast.warning("Ugovor nije upisan u tabele ugovora o održavanju; unesite ga tamo ručno.")
    }
    await downloadPdf(result.data.values)
    setIsGenerating(false)
  }

  // The number the contract will get, shown read-only; read again when the year of the contract changes.
  const numberYear = Number((values.concluded_date ?? "").slice(0, 4)) || new Date().getFullYear()
  const [nextNumber, setNextNumber] = React.useState<string | null>(null)
  React.useEffect(() => {
    if (!canSave || !template) return
    let cancelled = false
    getNextContractNumberAction(numberYear).then((result) => {
      if (!cancelled) setNextNumber(result.success ? result.data : null)
    })
    return () => {
      cancelled = true
    }
  }, [canSave, template, numberYear, saved])

  const startNew = () => {
    latestPick.current = ""
    setSaved(null)
    setTemplateId(null)
    setValues({})
    setClientId("")
  }

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <h3 className="text-sm font-semibold">1. Odaberite vrstu ugovora</h3>
        <TemplatePicker templates={CONTRACT_TEMPLATES} selected={templateId} onSelect={selectTemplate} />
      </section>

      {template && (
        <section className="space-y-4">
          <h3 className="text-sm font-semibold">2. Popunite podatke</h3>

          <FieldGroupSection group={HEADER_FIELDS} values={values} onChange={setValue} childrenInRow>
            <FormField label="Broj ugovora (dodjeljuje sistem)" htmlFor="contract-number">
              <Input
                id="contract-number"
                readOnly
                tabIndex={-1}
                value={saved?.number ?? nextNumber ?? (canSave ? "…" : "dodjeljuje se pri čuvanju")}
                className="cursor-default bg-muted font-mono font-semibold"
              />
              {!saved && canSave && (
                <p className="text-[11px] text-muted-foreground">
                  Konačan broj se dodjeljuje pri čuvanju; ako neko u međuvremenu sačuva ugovor, dobićete sljedeći.
                </p>
              )}
            </FormField>
          </FieldGroupSection>

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

          {saved ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-500/30 bg-emerald-50 p-4 dark:bg-emerald-950/30">
              <p className="flex items-center gap-1.5 text-sm font-medium text-emerald-700 dark:text-emerald-300">
                <RiCheckLine className="size-4" />
                Ugovor {saved.number} je sačuvan uz klijenta.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => downloadPdf(saved.values)} className="cursor-pointer gap-1.5">
                  <RiDownload2Line className="size-4" />
                  Preuzmi ponovo
                </Button>
                <Button size="sm" onClick={startNew} className="cursor-pointer gap-1.5">
                  <RiAddLine className="size-4" />
                  Novi ugovor
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">
                {!canSave
                  ? "Ugovore prave administrator, account manager i voditelj projekta."
                  : !clientId
                    ? "Odaberite klijenta iz baze: ugovor se čuva uz njega."
                    : missing.length === 0
                      ? "Sva obavezna polja su popunjena. Broj ugovora dodjeljuje sistem pri čuvanju."
                      : `Nedostaje obaveznih polja: ${missing.length} (${missing.slice(0, 3).join(", ")}${missing.length > 3 ? "..." : ""}).`}
              </p>
              <Button
                size="sm"
                disabled={!canSave || !clientId || missing.length > 0 || isGenerating}
                onClick={saveAndDownload}
                className="cursor-pointer gap-1.5"
              >
                {isGenerating ? <RiLoader4Line className="size-4 animate-spin" /> : <RiDownload2Line className="size-4" />}
                {isGenerating ? "Čuvanje..." : "Sačuvaj i preuzmi PDF"}
              </Button>
            </div>
          )}
        </section>
      )}
    </div>
  )
}
