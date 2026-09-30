"use client"

import * as React from "react"
import { RiAddLine, RiCheckboxCircleLine } from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { canUpdateTask } from "@/lib/hub/permissions"
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

      {showForm && (
        <TaskForm
          projectId={projectId}
          members={members}
          defaultAssigneeId={currentUser.id}
          onCancel={() => setShowForm(false)}
          onCreated={() => {
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
