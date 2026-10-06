"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { DragDropContext, type DragStart, type DropResult } from "@hello-pangea/dnd"
import { toast } from "sonner"
import { changeProjectStatusAction } from "@/lib/hub/actions/projects"
import { PROJECT_STATUSES, type ProjectStatus } from "@/lib/hub/constants"
import { STATUS_LABELS } from "@/lib/hub/labels"
import { canCreateProject, canSetProjectStatus } from "@/lib/hub/permissions"
import { getUserTeamIds, isParticipant } from "@/lib/hub/participation"
import type { HubClientOption, HubMember, HubProjectSummary, HubTeam, HubUser } from "@/lib/hub/types"
import { ProjectFormSheet } from "../projects/form/project-form-sheet"
import { ProjectsToolbar } from "../projects/projects-toolbar"
import { useLocalProjects } from "../projects/use-local-projects"
import { useProjectFilters } from "../projects/use-project-filters"
import { KanbanColumn } from "./kanban-column"

interface KanbanBoardProps {
  projects: HubProjectSummary[]
  /** More projects exist than were loaded (the list is capped). */
  hasMore: boolean
  members: HubMember[]
  teams: HubTeam[]
  clients: HubClientOption[]
  currentUser: HubUser
}

/** Soonest deadline first inside a column; projects without a deadline go last. */
function byDeadline(a: HubProjectSummary, b: HubProjectSummary): number {
  if (!a.planned_deadline || !b.planned_deadline) return a.planned_deadline ? -1 : b.planned_deadline ? 1 : 0
  return a.planned_deadline.localeCompare(b.planned_deadline)
}

export function KanbanBoard({ projects, hasMore, members, teams, clients, currentUser }: KanbanBoardProps) {
  const router = useRouter()
  const { rows, applyOverride, clearOverride, applyServerProject } = useLocalProjects(projects)
  const { filters, updateFilter, resetFilters, hasActiveFilters, visibleProjects } = useProjectFilters(rows)

  const [dragged, setDragged] = React.useState<HubProjectSummary | null>(null)
  const [formOpen, setFormOpen] = React.useState(false)

  const memberNames = React.useMemo(() => new Map(members.map((member) => [member.id, member.name])), [members])
  const userTeamIds = React.useMemo(() => getUserTeamIds(teams, currentUser.id), [teams, currentUser.id])

  const canMoveTo = React.useCallback(
    (project: HubProjectSummary, status: ProjectStatus) =>
      canSetProjectStatus(currentUser.role, status, isParticipant(project, currentUser.id, userTeamIds)),
    [currentUser, userTeamIds]
  )

  const columns = React.useMemo(() => {
    const grouped = Object.fromEntries(PROJECT_STATUSES.map((status) => [status, [] as HubProjectSummary[]]))
    for (const project of visibleProjects) grouped[project.status].push(project)
    for (const status of PROJECT_STATUSES) grouped[status].sort(byDeadline)
    return grouped as Record<ProjectStatus, HubProjectSummary[]>
  }, [visibleProjects])

  const handleDragStart = (start: DragStart) =>
    setDragged(rows.find((project) => project.$id === start.draggableId) ?? null)

  const handleDragEnd = async (result: DropResult) => {
    setDragged(null)
    const { destination, draggableId } = result
    const project = rows.find((row) => row.$id === draggableId)
    if (!destination || !project) return

    const target = destination.droppableId as ProjectStatus
    if (target === project.status) return

    // The column already refused the drop if this were not allowed; this guards against edge cases.
    if (!canMoveTo(project, target)) return toast.error(`Nemate dozvolu za status "${STATUS_LABELS[target]}".`)

    applyOverride(project.$id, { status: target })
    const response = await changeProjectStatusAction(project.$id, { status: target })

    if (response.success) {
      applyServerProject(response.data)
      toast.success(`${project.code}: ${STATUS_LABELS[target]}`)
    } else {
      clearOverride(project.$id)
      toast.error(response.error)
    }
  }

  return (
    <div className="w-full min-w-0 max-w-full space-y-4">
      <ProjectsToolbar
        filters={filters}
        onFilterChange={updateFilter}
        onReset={resetFilters}
        hasActiveFilters={hasActiveFilters}
        leads={members}
        shownCount={visibleProjects.length}
        totalCount={rows.length}
        canCreate={canCreateProject(currentUser.role)}
        onCreate={() => setFormOpen(true)}
        showStatusFilter={false}
      />

      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-muted-foreground">
        <span>
          Ukupno projekata: <strong className="font-mono text-foreground">{rows.length}</strong>
        </span>
      </div>

      <p className="text-xs text-muted-foreground">
        Prevucite karticu u drugu kolonu za promjenu faze. Dozvoljene faze zavise od vaše uloge.
      </p>

      <div className="w-full max-w-full overflow-x-auto pb-4">
        <DragDropContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="inline-flex items-start gap-4 px-1">
            {PROJECT_STATUSES.map((status) => (
              <KanbanColumn
                key={status}
                status={status}
                projects={columns[status]}
                leadNameOf={(leadId) => memberNames.get(leadId) ?? "—"}
                isDropDisabled={dragged !== null && dragged.status !== status && !canMoveTo(dragged, status)}
                isDragging={dragged !== null}
                onOpen={(projectId) => router.push(`/hub/projects/${projectId}`)}
              />
            ))}
          </div>
        </DragDropContext>
      </div>

      {hasMore && (
        <p className="px-1 text-xs text-muted-foreground">
          Učitano je najnovijih {projects.length} projekata; stariji projekti nisu prikazani.
        </p>
      )}

      <ProjectFormSheet
        open={formOpen}
        onOpenChange={setFormOpen}
        target={{ mode: "create" }}
        members={members}
        teams={teams}
        clients={clients}
        currentUser={currentUser}
        userTeamIds={userTeamIds}
        onSaved={() => router.refresh()}
      />
    </div>
  )
}
