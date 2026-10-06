"use client"

import { cn, stripDiacritics } from "@/lib/utils"

export interface ListOption {
  value: string
  label: string
}

export const matchesQuery = (label: string, query: string) =>
  stripDiacritics(label).toLowerCase().includes(stripDiacritics(query).toLowerCase().trim())

interface OptionListProps {
  options: ListOption[]
  selected?: string
  emptyText: string
  onPick: (option: ListOption) => void
}

/** Dropdown under an input. Picking uses mouse-down so the input keeps focus and does not close first. */
export function OptionList({ options, selected, emptyText, onPick }: OptionListProps) {
  return (
    <ul
      role="listbox"
      className="absolute top-full left-0 z-50 mt-1 max-h-56 w-full overflow-auto rounded-2xl border border-border bg-popover p-1 text-sm text-popover-foreground shadow-md"
    >
      {options.length === 0 ? (
        <li className="px-3 py-2 text-xs text-muted-foreground">{emptyText}</li>
      ) : (
        options.map((option) => (
          <li
            key={option.value}
            role="option"
            aria-selected={option.value === selected}
            onMouseDown={(event) => {
              event.preventDefault()
              onPick(option)
            }}
            className={cn(
              "cursor-pointer rounded-xl px-3 py-1.5 hover:bg-accent hover:text-accent-foreground",
              option.value === selected && "bg-accent font-medium"
            )}
          >
            {option.label}
          </li>
        ))
      )}
    </ul>
  )
}
