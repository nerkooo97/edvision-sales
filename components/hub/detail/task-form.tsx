"use client"

import * as React from "react"
import { RiLoader4Line } from "@remixicon/react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { createTaskAction } from "@/lib/hub/actions/tasks"
import { PROJECT_PRIORITIES, type ProjectPriority } from "@/lib/hub/constants"
import { PRIORITY_LABELS } from "@/lib/hub/labels"
import type { HubMember } from "@/lib/hub/types"
import { FormField } from "../projects/form/form-field"

interface TaskFormProps {
  projectId: string
  members: HubMember[]
  defaultAssigneeId: string
  onCreated: () => void
  onCancel: () => void
}

export function TaskForm({ projectId, members, defaultAssigneeId, onCreated, onCancel }: TaskFormProps) {
  const [title, setTitle] = React.useState("")
  const [description, setDescription] = React.useState("")
  const [assigneeId, setAssigneeId] = React.useState(defaultAssigneeId)
  const [priority, setPriority] = React.useState<ProjectPriority>("medium")
  const [deadline, setDeadline] = React.useState("")
  const [comment, setComment] = React.useState("")
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!title.trim()) return setError("Naziv zadatka je obavezan.")
    if (!assigneeId) return setError("Odaberite osobu kojoj se zadatak dodjeljuje.")

    setIsSubmitting(true)
    setError(null)
    const result = await createTaskAction(projectId, {
      title,
      description,
      assignee_id: assigneeId,
      priority,
      deadline,
      comment,
    })
    setIsSubmitting(false)

    if (!result.success) return setError(result.error)
    toast.success("Zadatak je dodan.")
    onCreated()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
      <h4 className="text-sm font-semibold">Novi zadatak</h4>

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
            autoFocus
          />
        </FormField>

        <FormField label="Dodijeljeno">
          <Select value={assigneeId} onValueChange={setAssigneeId}>
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
          <Select value={priority} onValueChange={(value) => setPriority(value as ProjectPriority)}>
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
          <Input id="task-deadline" type="date" value={deadline} onChange={(event) => setDeadline(event.target.value)} />
        </FormField>

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
          />
        </FormField>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={isSubmitting} className="cursor-pointer">
          Odustani
        </Button>
        <Button type="submit" size="sm" disabled={isSubmitting} className="cursor-pointer gap-1.5">
          {isSubmitting && <RiLoader4Line className="size-4 animate-spin" />}
          Dodaj zadatak
        </Button>
      </div>
    </form>
  )
}
