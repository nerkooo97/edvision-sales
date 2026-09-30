"use client"

import * as React from "react"
import { RiAlertLine, RiDeleteBinLine, RiLoader4Line } from "@remixicon/react"
import { toast } from "sonner"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { deleteTaskAction, updateTaskAction } from "@/lib/hub/actions/tasks"
import { TASK_STATUSES, type TaskStatus } from "@/lib/hub/constants"
import { PRIORITY_LABELS, TASK_STATUS_LABELS } from "@/lib/hub/labels"
import type { HubTask } from "@/lib/hub/types"
import { cn, formatDate } from "@/lib/utils"

interface TaskItemProps {
  task: HubTask
  assigneeName: string
  canUpdate: boolean
  canDelete: boolean
  onChanged: () => void
}

const STATUS_STYLES: Record<TaskStatus, string> = {
  todo: "bg-muted text-muted-foreground",
  in_progress: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  done: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
}

export function TaskItem({ task, assigneeName, canUpdate, canDelete, onChanged }: TaskItemProps) {
  const [isPending, startTransition] = React.useTransition()
  const [confirmOpen, setConfirmOpen] = React.useState(false)
  const [isDeleting, setIsDeleting] = React.useState(false)

  const isDone = task.status === "done"
  const isLate = !isDone && task.deadline !== null && task.deadline.slice(0, 10) < new Date().toISOString().slice(0, 10)

  const changeStatus = (status: TaskStatus) =>
    startTransition(async () => {
      const result = await updateTaskAction(task.$id, { status })
      if (result.success) onChanged()
      else toast.error(result.error)
    })

  const handleDelete = async () => {
    setIsDeleting(true)
    const result = await deleteTaskAction(task.$id)
    setIsDeleting(false)
    if (!result.success) return toast.error(result.error)
    setConfirmOpen(false)
    toast.success("Zadatak je obrisan.")
    onChanged()
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-xl border border-border bg-card p-3.5 sm:flex-row sm:items-center sm:justify-between",
        isDone && "opacity-70"
      )}
    >
      <div className="flex min-w-0 items-start gap-3">
        <Checkbox
          checked={isDone}
          disabled={!canUpdate || isPending}
          onCheckedChange={(checked) => changeStatus(checked ? "done" : "todo")}
          className="mt-0.5"
          aria-label="Označi kao završeno"
        />
        <div className="min-w-0 space-y-1">
          <p className={cn("text-sm font-semibold", isDone && "text-muted-foreground line-through")}>{task.title}</p>
          {task.description && <p className="text-xs text-muted-foreground">{task.description}</p>}
          {task.comment && <p className="text-xs text-muted-foreground italic">„{task.comment}“</p>}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
            <span>
              Dodijeljeno: <strong className="text-foreground">{assigneeName}</strong>
            </span>
            <span>Prioritet: {PRIORITY_LABELS[task.priority]}</span>
            {task.deadline && (
              <span className={cn("inline-flex items-center gap-1 font-mono", isLate && "font-semibold text-destructive")}>
                {isLate && <RiAlertLine className="size-3" />}
                Rok: {formatDate(task.deadline)}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 self-end sm:self-center">
        {canUpdate ? (
          <Select value={task.status} onValueChange={(value) => changeStatus(value as TaskStatus)} disabled={isPending}>
            <SelectTrigger size="sm" className={cn("h-7 min-w-32 border-transparent text-xs font-medium", STATUS_STYLES[task.status])}>
              {isPending && <RiLoader4Line className="size-3 animate-spin" />}
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TASK_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {TASK_STATUS_LABELS[status]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium", STATUS_STYLES[task.status])}>
            {TASK_STATUS_LABELS[task.status]}
          </span>
        )}

        {canDelete && (
          <Button
            variant="ghost"
            size="icon"
            className="size-8 cursor-pointer text-muted-foreground hover:text-destructive"
            title="Obriši zadatak"
            onClick={() => setConfirmOpen(true)}
          >
            <RiDeleteBinLine className="size-4" />
          </Button>
        )}
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Brisanje zadatka</AlertDialogTitle>
            <AlertDialogDescription>
              Obrisati zadatak <strong className="text-foreground">{task.title}</strong>? Ova radnja je trajna.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Odustani</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault()
                handleDelete()
              }}
              disabled={isDeleting}
              className="cursor-pointer bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Brisanje..." : "Obriši"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
