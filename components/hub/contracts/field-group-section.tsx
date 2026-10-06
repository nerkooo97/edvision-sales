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
  /** Puts the content in the same row as the fields (first cell) instead of above them. */
  childrenInRow?: boolean
}

export function FieldGroupSection({ group, values, onChange, children, childrenInRow }: FieldGroupSectionProps) {
  return (
    <section className="space-y-4 rounded-xl border border-border bg-card p-4 lg:p-5">
      <FormSection title={group.title}>
        {!childrenInRow && children}
        <div className="grid items-start gap-4 sm:grid-cols-2">
          {childrenInRow && children}
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
