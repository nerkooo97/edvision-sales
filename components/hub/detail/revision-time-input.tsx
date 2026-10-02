"use client"

import * as React from "react"
import { RiLoader4Line } from "@remixicon/react"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import { updateTaskAction } from "@/lib/hub/actions/tasks"
import { hoursToMinutes, minutesToHoursText } from "@/lib/hub/revisions"

interface RevisionTimeInputProps {
  taskId: string
  minutes: number | null
  onSaved: () => void
}

/** Hours spent on a client revision, saved when the field loses focus. */
export function RevisionTimeInput({ taskId, minutes, onSaved }: RevisionTimeInputProps) {
  const [text, setText] = React.useState(minutesToHoursText(minutes))
  const [isSaving, setIsSaving] = React.useState(false)

  const save = async () => {
    const next = hoursToMinutes(text)
    if (Number.isNaN(next)) {
      setText(minutesToHoursText(minutes))
      return toast.error("Unesite ispravan broj sati.")
    }
    if (next === minutes) return

    setIsSaving(true)
    const result = await updateTaskAction(taskId, { time_spent_minutes: next })
    setIsSaving(false)

    if (!result.success) {
      setText(minutesToHoursText(minutes))
      return toast.error(result.error)
    }
    onSaved()
  }

  return (
    <span className="inline-flex items-center gap-1.5">
      <Input
        type="number"
        min={0}
        step="0.25"
        inputMode="decimal"
        value={text}
        onChange={(event) => setText(event.target.value)}
        onBlur={save}
        onKeyDown={(event) => event.key === "Enter" && event.currentTarget.blur()}
        disabled={isSaving}
        placeholder="0"
        aria-label="Utrošeno vrijeme u satima"
        className="h-6 w-16 px-1.5 text-right font-mono text-xs"
      />
      <span>h</span>
      {isSaving && <RiLoader4Line className="size-3 animate-spin" />}
    </span>
  )
}
