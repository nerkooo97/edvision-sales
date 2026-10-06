"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { RiArrowDownSLine, RiArrowUpSLine, RiFolderChartLine } from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { PROJECT_STATUSES } from "@/lib/hub/constants"
import { canCreateProject, canDeleteProject, canSetProjectStatus, canViewProjectMoney } from "@/lib/hub/permissions"
import { getUserTeamIds, isParticipant } from "@/lib/hub/participation"
import type { HubClientOption, HubMember, HubProjectSummary, HubTeam, HubUser } from "@/lib/hub/types"
import { DeleteProjectDialog } from "./delete-project-dialog"
import { ProjectFormSheet, type ProjectFormTarget } from "./form/project-form-sheet"
import { downloadProjectsCsv } from "./export-projects-csv"
import { columnsFor, defaultVisibleColumns, type ColumnId } from "./project-columns"
import { ProjectRow } from "./project-row"
import { ProjectsToolbar } from "./projects-toolbar"
import { TableActions } from "./table-actions"
import { useLocalProjects } from "./use-local-projects"
import { useProjectFilters } from "./use-project-filters"

interface ProjectsTableProps {
  projects: HubProjectSummary[]
  /** More projects exist than were loaded (the list is capped). */
  hasMore: boolean
  members: HubMember[]
  teams: HubTeam[]
  clients: HubClientOption[]
  currentUser: HubUser
}

export function ProjectsTable({ projects, hasMore, members, teams, clients, currentUser }: ProjectsTableProps) {
  const router = useRouter()

  const { rows, applyServerProject, markDeleted } = useLocalProjects(projects)

  const canViewMoney = canViewProjectMoney(currentUser.role)
  const availableColumns = React.useMemo(() => columnsFor(canViewMoney), [canViewMoney])
  const [visibleColumns, setVisibleColumns] = React.useState<ReadonlySet<ColumnId>>(
    new Set(defaultVisibleColumns(canViewMoney))
  )
  const toggleColumn = (column: ColumnId) =>
    setVisibleColumns((current) => {
      const next = new Set(current)
      if (next.has(column)) next.delete(column)
      else next.add(column)
      return next
    })
  const shownColumns = availableColumns.filter((column) => visibleColumns.has(column.id))

  const [sheetOpen, setSheetOpen] = React.useState(false)
  const [formTarget, setFormTarget] = React.useState<ProjectFormTarget>({ mode: "create" })
  const [projectToDelete, setProjectToDelete] = React.useState<HubProjectSummary | null>(null)

  const { filters, updateFilter, resetFilters, hasActiveFilters, sortKey, sortDirection, toggleSort, visibleProjects } =
    useProjectFilters(rows)

  const memberNames = React.useMemo(() => new Map(members.map((member) => [member.id, member.name])), [members])
  const userTeamIds = React.useMemo(() => getUserTeamIds(teams, currentUser.id), [teams, currentUser.id])

  const openForm = (target: ProjectFormTarget) => {
    setFormTarget(target)
    setSheetOpen(true)
  }

  const handleDeleted = (projectId: string) => {
    markDeleted(projectId)
    router.refresh()
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
        onCreate={() => openForm({ mode: "create" })}
        extraActions={
          <TableActions
            columns={availableColumns}
            visibleColumns={visibleColumns}
            onToggleColumn={toggleColumn}
            onExport={() => downloadProjectsCsv(visibleProjects, (leadId) => memberNames.get(leadId) ?? "—", canViewMoney)}
            canExport={visibleProjects.length > 0}
          />
        }
      />

      <div className="w-full max-w-full overflow-hidden rounded-xl border border-border bg-card">
        <Table className="w-full min-w-[900px]">
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-transparent">
              {shownColumns.map((column) => (
                <TableHead
                  key={column.id}
                  className={`text-xs font-semibold tracking-wider text-muted-foreground uppercase ${column.className}`}
                >
                  {column.sortKey ? (
                    <button
                      type="button"
                      onClick={() => toggleSort(column.sortKey!)}
                      className={`inline-flex cursor-pointer items-center gap-0.5 uppercase hover:text-foreground ${
                        column.className.includes("text-right") ? "flex-row-reverse" : ""
                      }`}
                    >
                      {column.label}
                      {sortKey === column.sortKey &&
                        (sortDirection === "asc" ? (
                          <RiArrowUpSLine className="size-3.5" />
                        ) : (
                          <RiArrowDownSLine className="size-3.5" />
                        ))}
                    </button>
                  ) : (
                    column.label
                  )}
                </TableHead>
              ))}
              <TableHead className="min-w-24 text-right text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                Akcije
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {visibleProjects.length === 0 ? (
              <TableRow>
                <TableCell colSpan={shownColumns.length + 1} className="h-48 text-center">
                  <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                    <RiFolderChartLine className="size-8 opacity-40" />
                    <p className="text-sm font-medium text-foreground">Nema pronađenih projekata</p>
                    <p className="text-xs">
                      {hasActiveFilters
                        ? "Pokušajte s drugačijim filterima."
                        : canCreateProject(currentUser.role)
                          ? "Kliknite na 'Novi projekat' za unos prvog projekta."
                          : "Projekti će se pojaviti ovdje kad budu kreirani."}
                    </p>
                    {hasActiveFilters && (
                      <Button size="sm" variant="outline" onClick={resetFilters} className="mt-2 cursor-pointer">
                        Poništi filtere
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              visibleProjects.map((project) => {
                const participant = isParticipant(project, currentUser.id, userTeamIds)
                return (
                  <ProjectRow
                    key={project.$id}
                    project={project}
                    visibleColumns={visibleColumns}
                    leadName={memberNames.get(project.lead_id) ?? "—"}
                    allowedStatuses={PROJECT_STATUSES.filter((status) =>
                      canSetProjectStatus(currentUser.role, status, participant)
                    )}
                    canDelete={canDeleteProject(currentUser.role)}
                    onOpen={() => router.push(`/hub/projects/${project.$id}`)}
                    onEdit={() => openForm({ mode: "edit", projectId: project.$id })}
                    onDelete={() => setProjectToDelete(project)}
                    onStatusChanged={applyServerProject}
                  />
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {hasMore && (
        <p className="px-1 text-xs text-muted-foreground">
          Učitano je najnovijih {projects.length} projekata; stariji projekti nisu prikazani.
        </p>
      )}

      <ProjectFormSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        target={formTarget}
        members={members}
        teams={teams}
        clients={clients}
        currentUser={currentUser}
        userTeamIds={userTeamIds}
        onSaved={() => router.refresh()}
      />

      <DeleteProjectDialog
        project={projectToDelete}
        open={projectToDelete !== null}
        onOpenChange={(open) => !open && setProjectToDelete(null)}
        onDeleted={handleDeleted}
      />
    </div>
  )
}
