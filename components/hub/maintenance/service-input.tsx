"use client"

import * as React from "react"
import { Input } from "@/components/ui/input"
import { matchesQuery, OptionList } from "./option-list"

interface ServiceInputProps {
  id?: string
  value: string
  onChange: (value: string) => void
  /** Offered while typing; anything else can still be typed freely. */
  suggestions: readonly string[]
}

/** Free text field that offers the usual service names. */
export function ServiceInput({ id, value, onChange, suggestions }: ServiceInputProps) {
  const [open, setOpen] = React.useState(false)

  // An untouched or fully matching value shows every suggestion; otherwise the list narrows as you type.
  const exact = suggestions.includes(value)
  const visible = (value.trim() === "" || exact ? [...suggestions] : suggestions.filter((item) => matchesQuery(item, value)))
    .map((item) => ({ value: item, label: item }))

  return (
    <div className="relative">
      <Input
        id={id}
        autoComplete="off"
        value={value}
        maxLength={200}
        onClick={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onChange={(event) => {
          onChange(event.target.value)
          setOpen(true)
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") setOpen(false)
          if (event.key === "ArrowDown") setOpen(true)
        }}
      />
      {open && visible.length > 0 && (
        <OptionList
          options={visible}
          selected={value}
          emptyText=""
          onPick={(option) => {
            onChange(option.value)
            setOpen(false)
          }}
        />
      )}
    </div>
  )
}
