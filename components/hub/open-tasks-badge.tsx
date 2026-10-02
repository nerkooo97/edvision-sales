import { RiAlertLine, RiListCheck2 } from "@remixicon/react"
import { FINISHED_STATUSES, type ProjectStatus } from "@/lib/hub/constants"
import { openTasksLabel } from "@/lib/hub/format"
import { cn } from "@/lib/utils"

interface OpenTasksBadgeProps {
  total: number
  done: number
  status: ProjectStatus
  className?: string
}

/**
 * Unfinished tasks of a project. Plain grey while the project is still being worked on; amber with a warning
 * sign once the project counts as finished but tasks are still open, which is when it is easy to overlook them.
 */
export function OpenTasksBadge({ total, done, status, className }: OpenTasksBadgeProps) {
  const open = total - done
  if (open <= 0) return null

  const forgotten = FINISHED_STATUSES.includes(status)
  const Icon = forgotten ? RiAlertLine : RiListCheck2

  return (
    <span
      title={forgotten ? "Projekat je završen, a ima još otvorenih zadataka." : `${done} od ${total} zadataka je završeno.`}
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap",
        forgotten ? "bg-amber-500/15 text-amber-700 dark:text-amber-400" : "bg-muted text-muted-foreground",
        className
      )}
    >
      <Icon className="size-3" />
      {openTasksLabel(open)}
    </span>
  )
}
