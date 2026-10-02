"use client"

import { Input } from "@/components/ui/input"
import { formatKm } from "@/lib/hub/format"
import { CONTRACT_MAX_MONTHS, MAX_WEEKLY_QUOTA, getContractEnd, getContractWeeks } from "@/lib/hub/retainer"
import { formatDate } from "@/lib/utils"
import { FormField } from "./form-field"
import { contractTotal, parseBudget, type ProjectFormField, type ProjectFormValues } from "./project-form-state"

interface ContractFieldsProps {
  values: ProjectFormValues
  onChange: <K extends ProjectFormField>(field: K, value: ProjectFormValues[K]) => void
  canEdit: (field: ProjectFormField) => boolean
  /** The monthly fee, the extra-post price and the contract total are shown only when this is true. */
  showMoney: boolean
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

/** Contract terms of a recurring service (e.g. social media): term, monthly fee and agreed posts per week. */
export function ContractFields({ values, onChange, canEdit, showMoney }: ContractFieldsProps) {
  const months = parseBudget(values.contract_months)
  const hasTerm =
    DATE_PATTERN.test(values.contract_start_date) && Number.isInteger(months) && months >= 1 && months <= CONTRACT_MAX_MONTHS

  const field = (name: ProjectFormField, type = "text") => ({
    id: `project-${name}`,
    type,
    value: values[name] as string,
    disabled: !canEdit(name),
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => onChange(name, event.target.value as never),
  })

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <FormField label="Početak ugovora" htmlFor="project-contract_start_date" required>
          <Input {...field("contract_start_date", "date")} />
        </FormField>
        <FormField label="Trajanje (mjeseci)" htmlFor="project-contract_months" required>
          <Input {...field("contract_months", "number")} min={1} max={CONTRACT_MAX_MONTHS} step={1} inputMode="numeric" />
        </FormField>
        {showMoney && (
          <FormField label="Mjesečna naknada (KM)" htmlFor="project-monthly_fee" required>
            <Input {...field("monthly_fee", "number")} min={0} step="0.01" inputMode="decimal" placeholder="0" />
          </FormField>
        )}
        <FormField label="Objava sedmično" htmlFor="project-weekly_quota" required>
          <Input {...field("weekly_quota", "number")} min={1} max={MAX_WEEKLY_QUOTA} step={1} inputMode="numeric" placeholder="npr. 3" />
        </FormField>
        {showMoney && (
          <FormField label="Cijena dodatne objave (KM)" htmlFor="project-extra_post_price" className="sm:col-span-2">
            <Input {...field("extra_post_price", "number")} min={0} step="0.01" inputMode="decimal" placeholder="Za objave iznad dogovorenog broja" />
          </FormField>
        )}
      </div>

      <div className="rounded-xl border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
        {hasTerm ? (
          <>
            Ugovor traje do <strong className="text-foreground">{formatDate(getContractEnd(values.contract_start_date, months))}</strong>{" "}
            ({getContractWeeks(values.contract_start_date, months).length} sedmica).
            {showMoney && (
              <>
                {" "}
                Ukupna vrijednost: <strong className="text-foreground">{formatKm(contractTotal(values))}</strong>.
              </>
            )}{" "}
            Kraj ugovora postaje rok projekta.
          </>
        ) : (
          showMoney
            ? "Unesite početak i trajanje da vidite kraj ugovora i ukupnu vrijednost."
            : "Unesite početak i trajanje da vidite kraj ugovora."
        )}
      </div>
    </div>
  )
}
