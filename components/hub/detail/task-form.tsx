"use client"

import * as React from "react"
import { RiLoader4Line } from "@remixicon/react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { createTaskAction, updateTaskAction } from "@/lib/hub/actions/tasks"
import { PROJECT_PRIORITIES, type ProjectPriority } from "@/lib/hub/constants"
import { toDateInputValue } from "@/lib/hub/format"
import { PRIORITY_LABELS } from "@/lib/hub/labels"
import { hoursToMinutes, minutesToHoursText } from "@/lib/hub/revisions"
import type { HubMember, HubTask } from "@/lib/hub/types"
import { FormField } from "../projects/form/form-field"

interface TaskFormProps {
  projectId: string
  members: HubMember[]
  /** Assignee preselected for a new task. */
  defaultAssigneeId: string
  /** The task being edited; omitted when creating a new one. */
  task?: HubTask
  /** False for a team member: they may change only the comment and the time spent, never the task itself. */
  canEditAll?: boolean
  onSaved: () => void
  onCancel: () => void
}

const today = () => new Date().toISOString().slice(0, 10)

export function TaskForm({
  projectId,
  members,
  defaultAssigneeId,
  task,
  canEditAll = true,
  onSaved,
  onCancel,
}: TaskFormProps) {
  const isEdit = task !== undefined
  // Fields a team member may not touch are shown but disabled, so they still see the whole task.
  const lockedFields = isEdit && !canEditAll

  const [title, setTitle] = React.useState(task?.title ?? "")
  const [description, setDescription] = React.useState(task?.description ?? "")
  const [assigneeId, setAssigneeId] = React.useState(task?.assignee_id ?? defaultAssigneeId)
  const [priority, setPriority] = React.useState<ProjectPriority>(task?.priority ?? "medium")
  const [deadline, setDeadline] = React.useState(toDateInputValue(task?.deadline))
  const [comment, setComment] = React.useState(task?.comment ?? "")
  const [isRevision, setIsRevision] = React.useState(Boolean(task?.is_revision))
  const [requestedDate, setRequestedDate] = React.useState(toDateInputValue(task?.requested_date) || today())
  const [hours, setHours] = React.useState(minutesToHoursText(task?.time_spent_minutes))
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  /** Only what actually changed, so unchanged fields never reach the server (or the activity log). */
  const changesFrom = (original: HubTask, minutes: number | null) => {
    const changes: Record<string, unknown> = {}
    if (title.trim() !== original.title) changes.title = title
    if (description.trim() !== (original.description ?? "")) changes.description = description
    if (assigneeId !== original.assignee_id) changes.assignee_id = assigneeId
    if (priority !== original.priority) changes.priority = priority
    if (deadline !== toDateInputValue(original.deadline)) changes.deadline = deadline
    if (comment.trim() !== (original.comment ?? "")) changes.comment = comment
    if (isRevision !== Boolean(original.is_revision)) changes.is_revision = isRevision
    if (isRevision) {
      if (requestedDate !== toDateInputValue(original.requested_date)) changes.requested_date = requestedDate
      if (minutes !== original.time_spent_minutes) changes.time_spent_minutes = minutes
    }
    return changes
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!title.trim()) return setError("Naziv zadatka je obavezan.")
    if (!assigneeId) return setError("Odaberite osobu kojoj se zadatak dodjeljuje.")

    const minutes = hoursToMinutes(hours)
    if (isRevision && Number.isNaN(minutes)) return setError("Unesite ispravan broj sati.")

    const payload = isEdit
      ? changesFrom(task, minutes)
      : {
          title,
          description,
          assignee_id: assigneeId,
          priority,
          deadline,
          comment,
          is_revision: isRevision,
          ...(isRevision ? { requested_date: requestedDate, time_spent_minutes: minutes } : {}),
        }
    if (isEdit && Object.keys(payload).length === 0) return onCancel()

    setIsSubmitting(true)
    setError(null)
    const result = isEdit ? await updateTaskAction(task.$id, payload) : await createTaskAction(projectId, payload)
    setIsSubmitting(false)

    if (!result.success) return setError(result.error)
    toast.success(isEdit ? "Zadatak je sačuvan." : "Zadatak je dodan.")
    onSaved()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
      <h4 className="text-sm font-semibold">{isEdit ? "Uredi zadatak" : "Novi zadatak"}</h4>

      {lockedFields && (
        <p className="rounded-lg border border-border bg-muted/40 p-2.5 text-xs text-muted-foreground">
          Možete mijenjati samo komentar i utrošeno vrijeme. Ostale podatke zadatka uređuje voditelj projekta.
        </p>
      )}

      {error && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-2.5 text-xs text-destructive">
          {error}
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        <FormField label="Naziv zadatka" htmlFor="task-title" required className="md:col-span-2">
          <Input
            id="task-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={300}
            placeholder="npr. Izrada wireframe-a"
            disabled={lockedFields}
            autoFocus={!lockedFields}
          />
        </FormField>

        <FormField label="Dodijeljeno">
          <Select value={assigneeId} onValueChange={setAssigneeId} disabled={lockedFields}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Odaberite osobu" />
            </SelectTrigger>
            <SelectContent>
              {members.map((member) => (
                <SelectItem key={member.id} value={member.id}>
                  {member.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>

        <FormField label="Prioritet">
          <Select value={priority} onValueChange={(value) => setPriority(value as ProjectPriority)} disabled={lockedFields}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PROJECT_PRIORITIES.map((option) => (
                <SelectItem key={option} value={option}>
                  {PRIORITY_LABELS[option]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>

        <FormField label="Rok" htmlFor="task-deadline">
          <Input
            id="task-deadline"
            type="date"
            value={deadline}
            onChange={(event) => setDeadline(event.target.value)}
            disabled={lockedFields}
          />
        </FormField>

        <div className="md:col-span-2">
          <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
            <Checkbox
              checked={isRevision}
              onCheckedChange={(checked) => setIsRevision(checked === true)}
              disabled={lockedFields}
            />
            Izmjena po zahtjevu klijenta
          </label>
          <p className="mt-0.5 pl-6 text-xs text-muted-foreground">
            Označi kad klijent traži ispravke nakon isporuke. Projekat dobija oznaku s brojem izmjena i utrošenim
            vremenom.
          </p>
        </div>

        {isRevision && (
          <>
            <FormField label="Datum zahtjeva" htmlFor="task-requested-date" required>
              <Input
                id="task-requested-date"
                type="date"
                value={requestedDate}
                onChange={(event) => setRequestedDate(event.target.value)}
                disabled={lockedFields}
              />
            </FormField>
            <FormField label="Utrošeno vrijeme (sati)" htmlFor="task-hours">
              <Input
                id="task-hours"
                type="number"
                min={0}
                step="0.25"
                inputMode="decimal"
                value={hours}
                onChange={(event) => setHours(event.target.value)}
                placeholder="npr. 2,5 (može i kasnije)"
              />
            </FormField>
          </>
        )}

        <FormField label="Komentar" htmlFor="task-comment" className="md:col-span-2">
          <Input
            id="task-comment"
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            maxLength={1000}
            placeholder="Kratka napomena uz zadatak"
          />
        </FormField>

        <FormField label="Opis" htmlFor="task-description" className="md:col-span-2">
          <Textarea
            id="task-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={2}
            maxLength={3000}
            disabled={lockedFields}
          />
        </FormField>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={isSubmitting} className="cursor-pointer">
          Odustani
        </Button>
        <Button type="submit" size="sm" disabled={isSubmitting} className="cursor-pointer gap-1.5">
          {isSubmitting && <RiLoader4Line className="size-4 animate-spin" />}
          {isEdit ? "Sačuvaj" : "Dodaj zadatak"}
        </Button>
      </div>
    </form>
  )
}
