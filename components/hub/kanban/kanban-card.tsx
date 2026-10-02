import { RiAlertLine, RiCheckboxCircleLine } from "@remixicon/react"
import { isProjectOverdue } from "@/lib/hub/format"
import { TYPE_LABELS } from "@/lib/hub/labels"
import type { HubProjectSummary } from "@/lib/hub/types"
import { cn, formatDate } from "@/lib/utils"
import { PriorityLabel } from "../projects/project-badges"
import { RevisionBadge } from "../revision-badge"

interface KanbanCardProps extends React.HTMLAttributes<HTMLDivElement> {
  project: HubProjectSummary
  leadName: string
  isDragging: boolean
  /** Ref handed out by the drag-and-drop library; it must land on the root element. */
  innerRef?: React.Ref<HTMLDivElement>
}

/** Presentational card; the drag-and-drop props are passed straight through onto the root element. */
export function KanbanCard({ project, leadName, isDragging, innerRef, className, ...rest }: KanbanCardProps) {
  const overdue = isProjectOverdue(project)
  const allDone = project.tasks_total > 0 && project.tasks_done === project.tasks_total

  return (
    <div
      {...rest}
      ref={innerRef}
      className={cn(
        "group cursor-grab space-y-2 rounded-xl border border-border bg-card p-3 shadow-xs transition-shadow select-none hover:shadow-md active:cursor-grabbing",
        isDragging && "rotate-1 shadow-lg ring-2 ring-primary/30",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] text-muted-foreground">{project.code}</span>
        <PriorityLabel priority={project.priority} />
      </div>

      <div>
        <h4 className="line-clamp-2 text-sm font-semibold transition-colors group-hover:text-primary">{project.name}</h4>
        <p className="truncate text-xs text-muted-foreground">{project.client_name}</p>
        <p className="truncate text-[11px] text-muted-foreground/70">{TYPE_LABELS[project.type]}</p>
        <RevisionBadge count={project.revisions_count} minutes={project.revisions_minutes} className="mt-1" />
      </div>

      <div className="flex items-center border-t border-border pt-2">
        <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <span className="flex size-5 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-foreground">
            {leadName.charAt(0).toUpperCase()}
          </span>
          <span className="max-w-20 truncate">{leadName}</span>
        </span>
      </div>

      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        {project.tasks_total > 0 ? (
          <span className="inline-flex items-center gap-1 font-mono">
            <RiCheckboxCircleLine className={cn("size-3.5", allDone && "text-emerald-500")} />
            {project.tasks_done}/{project.tasks_total}
          </span>
        ) : (
          <span>Nema zadataka</span>
        )}
        {project.planned_deadline && (
          <span
            className={cn("inline-flex items-center gap-1 font-mono", overdue && "font-semibold text-destructive")}
            title={overdue ? "Rok je istekao" : undefined}
          >
            {overdue && <RiAlertLine className="size-3" />}
            {formatDate(project.planned_deadline)}
          </span>
        )}
      </div>
    </div>
  )
}
