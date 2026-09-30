"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { RiAlertLine, RiCheckboxCircleLine, RiTimeLine } from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { FINISHED_STATUSES, PROJECT_STATUSES } from "@/lib/hub/constants"
import { formatKm, isProjectOverdue } from "@/lib/hub/format"
import { STATUS_BAR_COLORS, STATUS_LABELS, TYPE_LABELS } from "@/lib/hub/labels"
import type { HubMember, HubProjectSummary } from "@/lib/hub/types"
import { cn, formatDate } from "@/lib/utils"
import { StatusBadge } from "../projects/project-badges"

type Scope = "all" | "active" | "finished"

const SCOPES: { value: Scope; label: string }[] = [
  { value: "all", label: "Svi" },
  { value: "active", label: "U toku" },
  { value: "finished", label: "Završeni" },
]

/** Soonest deadline first; without one, the start date; projects with neither go last. */
const sortKey = (project: HubProjectSummary) => project.planned_deadline ?? project.start_date ?? "9999"

/** Six equal segments, one per phase, filled up to the current phase and named underneath. */
function ProgressBar({ status }: { status: HubProjectSummary["status"] }) {
  const current = PROJECT_STATUSES.indexOf(status)
  return (
    <div className="space-y-1.5" role="img" aria-label={`Faza ${current + 1} od ${PROJECT_STATUSES.length}: ${STATUS_LABELS[status]}`}>
      <div className="flex h-1.5 w-full gap-0.5">
        {PROJECT_STATUSES.map((step, index) => (
          <div
            key={step}
            className={cn("h-full flex-1 rounded-full", index <= current ? STATUS_BAR_COLORS[step] : "bg-muted")}
          />
        ))}
      </div>
      {/* Six names do not fit on a phone; the status badge above already names the current phase there. */}
      <div className="hidden gap-0.5 sm:flex">
        {PROJECT_STATUSES.map((step, index) => (
          <span
            key={step}
            className={cn(
              "flex-1 truncate text-center text-[10px] leading-none",
              index === current
                ? "font-semibold text-foreground"
                : index < current
                  ? "text-muted-foreground"
                  : "text-muted-foreground/50"
            )}
          >
            {STATUS_LABELS[step]}
          </span>
        ))}
      </div>
    </div>
  )
}

function DateItem({ label, value, tone }: { label: string; value: string | null; tone?: string }) {
  return (
    <span>
      {label}: <strong className={cn("font-mono text-foreground", tone)}>{formatDate(value)}</strong>
    </span>
  )
}

export function TimelineList({ projects, members }: { projects: HubProjectSummary[]; members: HubMember[] }) {
  const router = useRouter()
  const [scope, setScope] = React.useState<Scope>("all")

  const names = React.useMemo(() => new Map(members.map((member) => [member.id, member.name])), [members])

  const visible = React.useMemo(
    () =>
      projects
        .filter((project) => {
          const finished = FINISHED_STATUSES.includes(project.status)
          return scope === "all" || (scope === "finished" ? finished : !finished)
        })
        .sort((a, b) => sortKey(a).localeCompare(sortKey(b))),
    [projects, scope]
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-full border border-border bg-card p-1">
          {SCOPES.map((option) => (
            <Button
              key={option.value}
              size="sm"
              variant={scope === option.value ? "default" : "ghost"}
              onClick={() => setScope(option.value)}
              className="h-7 cursor-pointer px-3 text-xs"
            >
              {option.label}
            </Button>
          ))}
        </div>
        <span className="text-xs text-muted-foreground">
          Prikazano <strong className="text-foreground">{visible.length}</strong> od{" "}
          <strong className="text-foreground">{projects.length}</strong> projekata
        </span>
      </div>

      {visible.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-14 text-center text-muted-foreground">
          <RiTimeLine className="size-8 opacity-40" />
          <p className="text-sm">Nema projekata za odabrani prikaz.</p>
        </div>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
          {visible.map((project) => {
            const overdue = isProjectOverdue(project)
            return (
              <li key={project.$id}>
                <button
                  type="button"
                  onClick={() => router.push(`/hub/projects/${project.$id}`)}
                  className="group block w-full cursor-pointer space-y-3 p-5 text-left transition-colors hover:bg-muted/40"
                >
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <span className="font-mono text-xs font-semibold text-muted-foreground">{project.code}</span>
                        <span className="text-sm font-bold transition-colors group-hover:text-primary">{project.name}</span>
                        <span className="text-xs text-muted-foreground">· {project.client_name}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        {TYPE_LABELS[project.type]} · Voditelj:{" "}
                        <strong className="text-foreground">{names.get(project.lead_id) ?? "—"}</strong>
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-mono text-sm font-bold tabular-nums">{formatKm(project.budget)}</span>
                      <StatusBadge status={project.status} />
                    </div>
                  </div>

                  <ProgressBar status={project.status} />

                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                      <DateItem label="Ponuda" value={project.offer_date} />
                      <DateItem label="Početak" value={project.start_date} />
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                      <span className={cn("inline-flex items-center gap-1", overdue && "font-semibold text-destructive")}>
                        {overdue && <RiAlertLine className="size-3.5" />}
                        Rok: <strong className="font-mono">{formatDate(project.planned_deadline, "Nije postavljen")}</strong>
                      </span>
                      {project.completion_date && (
                        <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
                          <RiCheckboxCircleLine className="size-3.5" />
                          Dovršeno: <strong className="font-mono">{formatDate(project.completion_date)}</strong>
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
