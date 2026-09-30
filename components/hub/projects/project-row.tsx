"use client"

import { RiAlertLine, RiCheckboxCircleLine, RiDeleteBinLine, RiEditLine } from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { TableCell, TableRow } from "@/components/ui/table"
import type { ProjectStatus } from "@/lib/hub/constants"
import { formatKm, isProjectOverdue } from "@/lib/hub/format"
import { TYPE_LABELS } from "@/lib/hub/labels"
import type { HubProject, HubProjectSummary } from "@/lib/hub/types"
import { formatDate } from "@/lib/utils"
import { PriorityLabel } from "./project-badges"
import type { ColumnId } from "./project-columns"
import { ProjectStatusSelect } from "./project-status-select"

interface ProjectRowProps {
  project: HubProjectSummary
  visibleColumns: ReadonlySet<ColumnId>
  leadName: string
  allowedStatuses: readonly ProjectStatus[]
  canDelete: boolean
  onOpen: () => void
  onEdit: () => void
  onDelete: () => void
  onStatusChanged: (project: HubProject) => void
}

const DATE_CELL = "font-mono text-xs tabular-nums text-muted-foreground"

export function ProjectRow({
  project,
  visibleColumns,
  leadName,
  allowedStatuses,
  canDelete,
  onOpen,
  onEdit,
  onDelete,
  onStatusChanged,
}: ProjectRowProps) {
  const overdue = isProjectOverdue(project)
  const allTasksDone = project.tasks_total > 0 && project.tasks_done === project.tasks_total
  const show = (column: ColumnId) => visibleColumns.has(column)

  return (
    <TableRow className="group cursor-pointer transition-colors hover:bg-muted/40" onClick={onOpen}>
      {show("code") && <TableCell className="font-mono text-xs text-muted-foreground">{project.code}</TableCell>}

      {show("name") && (
        <TableCell>
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-semibold text-foreground transition-colors group-hover:text-primary">
              {project.name}
            </span>
            {project.contract_number && (
              <span className="font-mono text-xs text-muted-foreground">{project.contract_number}</span>
            )}
          </div>
        </TableCell>
      )}

      {show("client") && <TableCell className="text-sm">{project.client_name}</TableCell>}
      {show("type") && <TableCell className="text-xs text-muted-foreground">{TYPE_LABELS[project.type]}</TableCell>}

      {show("budget") && (
        <TableCell className="text-right font-mono text-sm font-semibold tabular-nums">
          {formatKm(project.budget)}
        </TableCell>
      )}

      {show("status") && (
        <TableCell onClick={(event) => event.stopPropagation()}>
          <ProjectStatusSelect
            projectId={project.$id}
            status={project.status}
            allowedStatuses={allowedStatuses}
            onChanged={onStatusChanged}
          />
        </TableCell>
      )}

      {show("offer") && <TableCell className={DATE_CELL}>{formatDate(project.offer_date)}</TableCell>}
      {show("start") && <TableCell className={DATE_CELL}>{formatDate(project.start_date)}</TableCell>}

      {show("deadline") && (
        <TableCell>
          <span
            className={`inline-flex items-center gap-1 font-mono text-xs tabular-nums ${
              overdue ? "font-semibold text-destructive" : "text-muted-foreground"
            }`}
            title={overdue ? "Rok je istekao" : undefined}
          >
            {overdue && <RiAlertLine className="size-3.5" />}
            {formatDate(project.planned_deadline)}
          </span>
        </TableCell>
      )}

      {show("completion") && <TableCell className={DATE_CELL}>{formatDate(project.completion_date)}</TableCell>}
      {show("lead") && <TableCell className="text-sm">{leadName}</TableCell>}

      {show("priority") && (
        <TableCell>
          <PriorityLabel priority={project.priority} />
        </TableCell>
      )}

      {show("tasks") && (
        <TableCell>
          {project.tasks_total > 0 ? (
            <span className="inline-flex items-center gap-1 font-mono text-xs text-muted-foreground">
              <RiCheckboxCircleLine className={`size-3.5 ${allTasksDone ? "text-emerald-500" : ""}`} />
              {project.tasks_done}/{project.tasks_total}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground/60">—</span>
          )}
        </TableCell>
      )}

      <TableCell className="text-right" onClick={(event) => event.stopPropagation()}>
        <div className="inline-flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="size-8 cursor-pointer text-muted-foreground hover:text-primary"
            title="Uredi projekat"
            onClick={onEdit}
          >
            <RiEditLine className="size-4" />
          </Button>
          {canDelete && (
            <Button
              variant="ghost"
              size="icon"
              className="size-8 cursor-pointer text-muted-foreground hover:text-destructive"
              title="Obriši projekat"
              onClick={onDelete}
            >
              <RiDeleteBinLine className="size-4" />
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  )
}
