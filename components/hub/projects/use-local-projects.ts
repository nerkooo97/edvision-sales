"use client"

import * as React from "react"
import type { HubProject, HubProjectSummary } from "@/lib/hub/types"

interface Override {
  /** $updatedAt of the server row this change was made on top of. */
  base: string
  patch: Partial<HubProjectSummary>
}

/**
 * Instant feedback for changes made on a list screen. Local changes are layered over the rows the
 * server sent (no syncing effect needed) and drop away as soon as the server row is newer than the
 * one they were based on, so fresh data can never be hidden by a stale local change.
 */
export function useLocalProjects(projects: HubProjectSummary[]) {
  const [overrides, setOverrides] = React.useState<Record<string, Override>>({})
  const [deletedIds, setDeletedIds] = React.useState<string[]>([])

  const rows = React.useMemo(
    () =>
      projects
        .filter((project) => !deletedIds.includes(project.$id))
        .map((project) => {
          const override = overrides[project.$id]
          return override && override.base === project.$updatedAt ? { ...project, ...override.patch } : project
        }),
    [projects, overrides, deletedIds]
  )

  const applyOverride = (projectId: string, patch: Partial<HubProjectSummary>) => {
    const base = projects.find((project) => project.$id === projectId)?.$updatedAt
    if (base === undefined) return
    setOverrides((current) => ({ ...current, [projectId]: { base, patch: { ...current[projectId]?.patch, ...patch } } }))
  }

  const clearOverride = (projectId: string) =>
    setOverrides((current) => {
      const next = { ...current }
      delete next[projectId]
      return next
    })

  /** Applies a project returned by the server after a status change, including the dates it stamped. */
  const applyServerProject = (updated: HubProject) =>
    applyOverride(updated.$id, {
      status: updated.status,
      offer_date: updated.offer_date,
      agreement_date: updated.agreement_date,
      start_date: updated.start_date,
      completion_date: updated.completion_date,
      invoice_date: updated.invoice_date,
    })

  const markDeleted = (projectId: string) => setDeletedIds((current) => [...current, projectId])

  return { rows, applyOverride, clearOverride, applyServerProject, markDeleted }
}
