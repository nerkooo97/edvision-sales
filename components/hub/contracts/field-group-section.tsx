"use client"

import type { ContractValues, FieldGroup } from "@/lib/hub/contracts/types"
import { FormSection } from "../projects/form/form-field"
import { FieldInput } from "./field-input"

interface FieldGroupSectionProps {
  group: FieldGroup
  values: ContractValues
  onChange: (key: string, value: string) => void
  /** Optional content above the fields, e.g. the client picker. */
  children?: React.ReactNode
}

export function FieldGroupSection({ group, values, onChange, children }: FieldGroupSectionProps) {
  return (
    <section className="space-y-4 rounded-xl border border-border bg-card p-4 lg:p-5">
      <FormSection title={group.title}>
        {children}
        <div className="grid gap-4 sm:grid-cols-2">
          {group.fields.map((field) => (
            <FieldInput
              key={field.key}
              field={field}
              value={values[field.key] ?? ""}
              onChange={(value) => onChange(field.key, value)}
            />
          ))}
        </div>
      </FormSection>
    </section>
  )
}
