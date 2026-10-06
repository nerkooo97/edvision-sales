"use client"

import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { FieldDef } from "@/lib/hub/contracts/types"
import { cn } from "@/lib/utils"
import { FormField } from "../projects/form/form-field"

interface FieldInputProps {
  field: FieldDef
  value: string
  onChange: (value: string) => void
}

/** One form control for a template field; the kind of the field decides which control it is. */
export function FieldInput({ field, value, onChange }: FieldInputProps) {
  const id = `contract-${field.key}`

  return (
    <FormField label={field.label} htmlFor={id} required={field.required} className={cn(field.wide && "sm:col-span-2")}>
      {field.kind === "select" ? (
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger id={id} className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {field.options?.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <div className="flex items-center gap-2">
          <Input
            id={id}
            type={field.kind === "date" ? "date" : "text"}
            inputMode={field.kind === "money" ? "decimal" : field.kind === "number" ? "numeric" : undefined}
            autoComplete="off"
            value={value}
            placeholder={field.placeholder}
            maxLength={field.maxLength}
            onChange={(event) => onChange(event.target.value)}
            className={cn("min-w-0 flex-1", field.kind === "number" && field.unit && "max-w-24")}
          />
          {field.unit && <span className="shrink-0 text-xs text-muted-foreground">{field.unit}</span>}
        </div>
      )}
    </FormField>
  )
}
