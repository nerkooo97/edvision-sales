"use client"

import { Draggable, Droppable } from "@hello-pangea/dnd"
import { RiFolderOpenLine } from "@remixicon/react"
import type { ProjectStatus } from "@/lib/hub/constants"
import { STATUS_ACCENTS, STATUS_LABELS } from "@/lib/hub/labels"
import type { HubProjectSummary } from "@/lib/hub/types"
import { cn } from "@/lib/utils"
import { KanbanCard } from "./kanban-card"

interface KanbanColumnProps {
  status: ProjectStatus
  projects: HubProjectSummary[]
  leadNameOf: (leadId: string) => string
  /** While a card is dragged, columns it may not be dropped into are dimmed and refuse the drop. */
  isDropDisabled: boolean
  isDragging: boolean
  onOpen: (projectId: string) => void
}

export function KanbanColumn({ status, projects, leadNameOf, isDropDisabled, isDragging, onOpen }: KanbanColumnProps) {
  return (
    <div
      className={cn(
        "flex w-[280px] shrink-0 flex-col overflow-hidden rounded-2xl border border-border bg-muted/30 transition-opacity",
        isDragging && isDropDisabled && "opacity-40"
      )}
    >
      <div className={cn("border-t-4 border-b border-border bg-card px-4 py-3", STATUS_ACCENTS[status])}>
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-xs font-semibold tracking-tight">{STATUS_LABELS[status]}</h3>
          <span className="flex size-5 items-center justify-center rounded-full bg-muted text-[11px] font-bold text-muted-foreground">
            {projects.length}
          </span>
        </div>
      </div>

      <Droppable droppableId={status} isDropDisabled={isDropDisabled}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={cn(
              "min-h-[200px] flex-1 space-y-2.5 p-2.5 transition-colors",
              snapshot.isDraggingOver && "bg-primary/5"
            )}
          >
            {projects.length === 0 && !snapshot.isDraggingOver && (
              <div className="flex h-28 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border text-muted-foreground">
                <RiFolderOpenLine className="size-5 opacity-50" />
                <span className="text-[11px]">Nema projekata</span>
              </div>
            )}

            {projects.map((project, index) => (
              <Draggable key={project.$id} draggableId={project.$id} index={index}>
                {(dragProvided, dragSnapshot) => (
                  <KanbanCard
                    project={project}
                    leadName={leadNameOf(project.lead_id)}
                    isDragging={dragSnapshot.isDragging}
                    {...dragProvided.draggableProps}
                    {...dragProvided.dragHandleProps}
                    onClick={() => onOpen(project.$id)}
                    innerRef={dragProvided.innerRef}
                  />
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  )
}
