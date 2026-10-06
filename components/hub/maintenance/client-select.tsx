"use client"

import * as React from "react"
import { RiArrowDownSLine } from "@remixicon/react"
import { Input } from "@/components/ui/input"
import type { HubClientOption } from "@/lib/hub/types"
import { matchesQuery, OptionList } from "./option-list"

interface ClientSelectProps {
  id?: string
  value: string
  onChange: (clientId: string) => void
  clients: HubClientOption[]
}

/** Searchable client picker: type to filter (accents ignored), then pick one from the list. */
export function ClientSelect({ id, value, onChange, clients }: ClientSelectProps) {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")

  // Active clients, plus the one already chosen even when it was deactivated since.
  const options = React.useMemo(
    () =>
      clients
        .filter((client) => client.is_active || client.$id === value)
        .map((client) => ({ value: client.$id, label: client.name })),
    [clients, value]
  )
  const openList = () => {
    setQuery("")
    setOpen(true)
  }
  const selectedName = options.find((option) => option.value === value)?.label ?? ""
  const visible = query ? options.filter((option) => matchesQuery(option.label, query)) : options

  return (
    <div className="relative">
      <Input
        id={id}
        role="combobox"
        aria-expanded={open}
        autoComplete="off"
        value={open ? query : selectedName}
        placeholder={open && selectedName ? selectedName : "Pretražite klijenta"}
        // Not opened on focus: a dialog focuses its first field by itself, and the list must stay closed then.
        onClick={() => !open && openList()}
        onBlur={() => setOpen(false)}
        onChange={(event) => {
          const typed = event.target.value
          // Typing into a closed field starts a fresh search instead of extending the shown name.
          setQuery(open ? typed : typed.startsWith(selectedName) ? typed.slice(selectedName.length) : "")
          setOpen(true)
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" && !open) {
            event.preventDefault()
            openList()
          }
          if (event.key === "Escape") setOpen(false)
          // Enter picks the only match instead of submitting the form half way.
          if (event.key === "Enter" && open) {
            event.preventDefault()
            if (visible.length === 1) {
              onChange(visible[0].value)
              setOpen(false)
            }
          }
        }}
        className="pr-9"
      />
      <RiArrowDownSLine className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground" />
      {open && (
        <OptionList
          options={visible}
          selected={value}
          emptyText="Nema klijenta s tim imenom."
          onPick={(option) => {
            onChange(option.value)
            setOpen(false)
          }}
        />
      )}
    </div>
  )
}
