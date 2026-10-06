"use client"

import { RiCheckLine, RiFileList3Line } from "@remixicon/react"
import type { ContractTemplate, ContractTemplateId } from "@/lib/hub/contracts/types"
import { cn } from "@/lib/utils"

interface TemplatePickerProps {
  templates: ContractTemplate[]
  selected: ContractTemplateId | null
  onSelect: (id: ContractTemplateId) => void
}

export function TemplatePicker({ templates, selected, onSelect }: TemplatePickerProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {templates.map((template) => {
        const isSelected = template.id === selected
        return (
          <button
            key={template.id}
            type="button"
            aria-pressed={isSelected}
            onClick={() => onSelect(template.id)}
            className={cn(
              "flex cursor-pointer flex-col gap-2 rounded-xl border p-4 text-left transition-colors",
              isSelected ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/50"
            )}
          >
            <span className="flex items-center justify-between">
              <RiFileList3Line className={cn("size-5", isSelected ? "text-primary" : "text-muted-foreground")} />
              {isSelected && <RiCheckLine className="size-4 text-primary" />}
            </span>
            <span className="text-sm font-semibold">{template.title}</span>
            <span className="text-xs text-muted-foreground">{template.description}</span>
          </button>
        )
      })}
    </div>
  )
}
