"use client"

import * as React from "react"
import { RiLoader4Line } from "@remixicon/react"
import { toast } from "sonner"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { changeProjectStatusAction } from "@/lib/hub/actions/projects"
import { PROJECT_STATUSES, type ProjectStatus } from "@/lib/hub/constants"
import { STATUS_LABELS, STATUS_STYLES } from "@/lib/hub/labels"
import type { HubProject } from "@/lib/hub/types"
import { cn } from "@/lib/utils"
import { StatusBadge } from "./project-badges"

interface ProjectStatusSelectProps {
  projectId: string
  status: ProjectStatus
  /** Statuses this user may move the project into; the server enforces the same rule. */
  allowedStatuses: readonly ProjectStatus[]
  onChanged: (project: HubProject) => void
}

export function ProjectStatusSelect({ projectId, status, allowedStatuses, onChanged }: ProjectStatusSelectProps) {
  const [isPending, startTransition] = React.useTransition()

  const canChangeAtAll = allowedStatuses.some((allowed) => allowed !== status)
  if (!canChangeAtAll) return <StatusBadge status={status} />

  const handleChange = (next: string) => {
    startTransition(async () => {
      const result = await changeProjectStatusAction(projectId, { status: next })
      if (result.success) {
        onChanged(result.data)
        toast.success(`Status: ${STATUS_LABELS[next as ProjectStatus]}`)
      } else {
        toast.error(result.error)
      }
    })
  }

  return (
    <Select value={status} onValueChange={handleChange} disabled={isPending}>
      <SelectTrigger
        size="sm"
        className={cn("h-7 min-w-36 gap-1.5 border-transparent text-xs font-medium", STATUS_STYLES[status])}
        onClick={(event) => event.stopPropagation()}
      >
        {isPending && <RiLoader4Line className="size-3 animate-spin" />}
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {PROJECT_STATUSES.map((option) => (
          <SelectItem key={option} value={option} disabled={option !== status && !allowedStatuses.includes(option)}>
            {STATUS_LABELS[option]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
