"use client"

import * as React from "react"
import {
  PROJECT_PRIORITIES,
  PROJECT_STATUSES,
  type ProjectPriority,
  type ProjectStatus,
  type ProjectType,
} from "@/lib/hub/constants"
import type { HubProjectSummary } from "@/lib/hub/types"
import { stripDiacritics } from "@/lib/utils"

export type SortKey =
  | "code"
  | "name"
  | "client_name"
  | "budget"
  | "status"
  | "planned_deadline"
  | "priority"

export interface ProjectFilters {
  search: string
  status: ProjectStatus | "all"
  priority: ProjectPriority | "all"
  type: ProjectType | "all"
  lead: string
}

const DEFAULT_FILTERS: ProjectFilters = { search: "", status: "all", priority: "all", type: "all", lead: "all" }

const normalize = (value: string) => stripDiacritics(value).toLowerCase().trim()

function matchesFilters(project: HubProjectSummary, filters: ProjectFilters): boolean {
  if (filters.status !== "all" && project.status !== filters.status) return false
  if (filters.priority !== "all" && project.priority !== filters.priority) return false
  if (filters.type !== "all" && project.type !== filters.type) return false
  if (filters.lead !== "all" && project.lead_id !== filters.lead) return false

  const query = normalize(filters.search)
  if (!query) return true
  const haystack = normalize(`${project.code} ${project.name} ${project.client_name} ${project.contract_number ?? ""}`)
  return haystack.includes(query)
}

function compareBy(key: SortKey, a: HubProjectSummary, b: HubProjectSummary): number {
  switch (key) {
    case "budget":
      return a.budget - b.budget
    case "status":
      return PROJECT_STATUSES.indexOf(a.status) - PROJECT_STATUSES.indexOf(b.status)
    case "priority":
      return PROJECT_PRIORITIES.indexOf(a.priority) - PROJECT_PRIORITIES.indexOf(b.priority)
    case "planned_deadline":
      return (a.planned_deadline ?? "").localeCompare(b.planned_deadline ?? "")
    case "code":
      return a.code.localeCompare(b.code, "bs", { numeric: true })
    default:
      return a[key].localeCompare(b[key], "bs")
  }
}

export function useProjectFilters(projects: HubProjectSummary[]) {
  const [filters, setFilters] = React.useState<ProjectFilters>(DEFAULT_FILTERS)
  const [sortKey, setSortKey] = React.useState<SortKey>("code")
  const [sortDirection, setSortDirection] = React.useState<"asc" | "desc">("desc")

  const visibleProjects = React.useMemo(() => {
    const filtered = projects.filter((project) => matchesFilters(project, filters))
    const direction = sortDirection === "asc" ? 1 : -1
    return filtered.sort((a, b) => {
      // Rows without a deadline always sink to the bottom, whichever way the column is sorted.
      if (sortKey === "planned_deadline" && (!a.planned_deadline || !b.planned_deadline)) {
        return a.planned_deadline ? -1 : b.planned_deadline ? 1 : 0
      }
      return compareBy(sortKey, a, b) * direction
    })
  }, [projects, filters, sortKey, sortDirection])

  const updateFilter = <K extends keyof ProjectFilters>(key: K, value: ProjectFilters[K]) =>
    setFilters((current) => ({ ...current, [key]: value }))

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) setSortDirection((current) => (current === "asc" ? "desc" : "asc"))
    else {
      setSortKey(key)
      setSortDirection("asc")
    }
  }

  const hasActiveFilters = JSON.stringify(filters) !== JSON.stringify(DEFAULT_FILTERS)

  return {
    filters,
    updateFilter,
    resetFilters: () => setFilters(DEFAULT_FILTERS),
    hasActiveFilters,
    sortKey,
    sortDirection,
    toggleSort,
    visibleProjects,
  }
}
