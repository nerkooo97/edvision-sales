"use client"

import { cn } from "@/lib/utils"

interface ChipPickerProps {
  options: { id: string; label: string }[]
  selected: string[]
  onChange: (selected: string[]) => void
  disabled?: boolean
  emptyText: string
}

/** Compact multi-select: each option is a toggle chip. Suited to short lists such as team members. */
export function ChipPicker({ options, selected, onChange, disabled, emptyText }: ChipPickerProps) {
  if (options.length === 0) return <p className="text-xs text-muted-foreground">{emptyText}</p>

  const toggle = (id: string) =>
    onChange(selected.includes(id) ? selected.filter((value) => value !== id) : [...selected, id])

  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((option) => {
        const isSelected = selected.includes(option.id)
        return (
          <button
            key={option.id}
            type="button"
            disabled={disabled}
            aria-pressed={isSelected}
            onClick={() => toggle(option.id)}
            className={cn(
              "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
              isSelected
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background text-muted-foreground hover:bg-muted"
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
