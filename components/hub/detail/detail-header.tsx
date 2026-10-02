"use client"

import Link from "next/link"
import { RiAlertLine, RiArrowLeftLine, RiBuilding2Line, RiDeleteBinLine, RiEditLine } from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { formatKm, getDaysOverdue } from "@/lib/hub/format"
import { TYPE_LABELS } from "@/lib/hub/labels"
import type { HubProject } from "@/lib/hub/types"
import { PriorityLabel } from "../projects/project-badges"
import { ProjectStatusSelect } from "../projects/project-status-select"
import { RevisionBadge } from "../revision-badge"
import type { ProjectDetailData } from "./detail-types"

interface DetailHeaderProps {
  data: ProjectDetailData
  canEdit: boolean
  onEdit: () => void
  onDelete: () => void
  onStatusChanged: (project: HubProject) => void
}

export function DetailHeader({ data, canEdit, onEdit, onDelete, onStatusChanged }: DetailHeaderProps) {
  const { project, permissions } = data
  const daysOverdue = getDaysOverdue(project)

  return (
    <div className="space-y-4">
      <Link
        href="/hub/projects"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <RiArrowLeftLine className="size-3.5" />
        Nazad na registar
      </Link>

      <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="rounded border border-border bg-muted/40 px-2 py-0.5 font-mono font-semibold">
              {project.code}
            </span>
            <span>{TYPE_LABELS[project.type]}</span>
            <span aria-hidden>·</span>
            <PriorityLabel priority={project.priority} />
            <RevisionBadge count={project.revisions_count} minutes={project.revisions_minutes} verbose />
          </div>
          <h2 className="text-2xl font-bold tracking-tight">{project.name}</h2>
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <RiBuilding2Line className="size-4" />
            {project.client_name}
            {project.client_contact && <span>({project.client_contact})</span>}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4 lg:justify-end">
          {permissions.canViewMoney && (
            <div className="text-right">
              <span className="block text-[11px] text-muted-foreground">Vrijednost projekta</span>
              <span className="font-mono text-lg font-bold tabular-nums">{formatKm(project.budget)}</span>
            </div>
          )}

          <ProjectStatusSelect
            projectId={project.$id}
            status={project.status}
            allowedStatuses={permissions.allowedStatuses}
            onChanged={onStatusChanged}
          />

          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={onEdit} className="cursor-pointer gap-1.5">
              <RiEditLine className="size-4" />
              {canEdit ? "Uredi" : "Podaci"}
            </Button>
            {permissions.canDelete && (
              <Button
                size="sm"
                variant="outline"
                onClick={onDelete}
                className="cursor-pointer gap-1.5 text-destructive hover:text-destructive"
              >
                <RiDeleteBinLine className="size-4" />
                Obriši
              </Button>
            )}
          </div>
        </div>
      </div>

      {daysOverdue > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
          <RiAlertLine className="mt-0.5 size-5 shrink-0" />
          <p>
            <strong>Projekat kasni {daysOverdue} dana</strong> u odnosu na planirani rok. Voditelj bi trebao ažurirati
            status ili kontaktirati klijenta.
          </p>
        </div>
      )}
    </div>
  )
}
