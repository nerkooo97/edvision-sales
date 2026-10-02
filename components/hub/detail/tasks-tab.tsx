"use client"

import * as React from "react"
import { RiAddLine, RiAlertLine, RiCheckboxCircleLine } from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { canUpdateTask } from "@/lib/hub/permissions"
import { formatHours, revisionStats, revisionsLabel } from "@/lib/hub/revisions"
import type { HubMember, HubTask, HubUser } from "@/lib/hub/types"
import type { NameResolver } from "./detail-types"
import { TaskForm } from "./task-form"
import { TaskItem } from "./task-item"

interface TasksTabProps {
  projectId: string
  tasks: HubTask[]
  members: HubMember[]
  currentUser: HubUser
  isParticipant: boolean
  canCreateTask: boolean
  canDeleteTask: boolean
  nameOf: NameResolver
  onChanged: () => void
}

export function TasksTab({
  projectId,
  tasks,
  members,
  currentUser,
  isParticipant,
  canCreateTask,
  canDeleteTask,
  nameOf,
  onChanged,
}: TasksTabProps) {
  const [showForm, setShowForm] = React.useState(false)
  const revisions = React.useMemo(() => revisionStats(tasks), [tasks])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">Zadaci projekta</h3>
          <p className="text-xs text-muted-foreground">Operativne obaveze tima sa statusima i rokovima.</p>
        </div>
        {canCreateTask && !showForm && (
          <Button size="sm" onClick={() => setShowForm(true)} className="cursor-pointer gap-1.5">
            <RiAddLine className="size-4" />
            Novi zadatak
          </Button>
        )}
      </div>

      {revisions.count > 0 && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-2.5 text-sm text-amber-800 dark:text-amber-300">
          <RiAlertLine className="size-4 shrink-0" />
          <span>
            Klijent je tražio <strong>{revisionsLabel(revisions.count)}</strong> nakon isporuke
            {revisions.minutes > 0 && (
              <>
                , ukupno utrošeno <strong>{formatHours(revisions.minutes)}</strong>
              </>
            )}
            .
          </span>
        </div>
      )}

      {showForm && (
        <TaskForm
          projectId={projectId}
          members={members}
          defaultAssigneeId={currentUser.id}
          onCancel={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false)
            onChanged()
          }}
        />
      )}

      {tasks.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-10 text-center text-muted-foreground">
          <RiCheckboxCircleLine className="size-8 opacity-40" />
          <p className="text-sm">Za ovaj projekat još nema zadataka.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => (
            <TaskItem
              key={task.$id}
              task={task}
              projectId={projectId}
              members={members}
              canEditAll={currentUser.role !== "team_member"}
              assigneeName={nameOf(task.assignee_id)}
              canUpdate={canUpdateTask(currentUser.role, isParticipant, task.assignee_id === currentUser.id)}
              canDelete={canDeleteTask}
              onChanged={onChanged}
            />
          ))}
        </div>
      )}
    </div>
  )
}
