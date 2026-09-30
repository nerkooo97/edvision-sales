"use client"

import { RiAddLine, RiSearchLine } from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PROJECT_PRIORITIES, PROJECT_STATUSES, PROJECT_TYPES } from "@/lib/hub/constants"
import { PRIORITY_LABELS, STATUS_LABELS, TYPE_LABELS } from "@/lib/hub/labels"
import type { HubMember } from "@/lib/hub/types"
import type { ProjectFilters } from "./use-project-filters"

interface ProjectsToolbarProps {
  filters: ProjectFilters
  onFilterChange: <K extends keyof ProjectFilters>(key: K, value: ProjectFilters[K]) => void
  onReset: () => void
  hasActiveFilters: boolean
  leads: HubMember[]
  shownCount: number
  totalCount: number
  canCreate: boolean
  onCreate: () => void
  /** The Kanban board already groups by status, so it hides this filter. */
  showStatusFilter?: boolean
  /** Extra buttons placed before "new project" (column chooser, export). */
  extraActions?: React.ReactNode
}

function FilterSelect({
  value,
  onChange,
  allLabel,
  options,
}: {
  value: string
  onChange: (value: string) => void
  allLabel: string
  options: { value: string; label: string }[]
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger size="sm" className="h-9 min-w-36">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{allLabel}</SelectItem>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export function ProjectsToolbar({
  filters,
  onFilterChange,
  onReset,
  hasActiveFilters,
  leads,
  shownCount,
  totalCount,
  canCreate,
  onCreate,
  showStatusFilter = true,
  extraActions,
}: ProjectsToolbarProps) {
  return (
    <div className="space-y-3">
      <div className="flex flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-center">
        <div className="relative w-full sm:max-w-xs">
          <RiSearchLine className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Pretraži po nazivu, šifri, klijentu..."
            value={filters.search}
            onChange={(event) => onFilterChange("search", event.target.value)}
            className="h-9 bg-background pl-9"
          />
        </div>

        <div className="flex items-center justify-between gap-3 sm:justify-end">
          <div className="text-xs text-muted-foreground">
            Prikazano <span className="font-medium text-foreground">{shownCount}</span> od{" "}
            <span className="font-medium text-foreground">{totalCount}</span>
          </div>
          {extraActions}
          {canCreate && (
            <Button size="sm" onClick={onCreate} className="cursor-pointer gap-1.5 shadow-xs">
              <RiAddLine className="size-4" />
              <span>Novi projekat</span>
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {showStatusFilter && (
        <FilterSelect
          value={filters.status}
          onChange={(value) => onFilterChange("status", value as ProjectFilters["status"])}
          allLabel="Svi statusi"
          options={PROJECT_STATUSES.map((status) => ({ value: status, label: STATUS_LABELS[status] }))}
        />
        )}
        <FilterSelect
          value={filters.priority}
          onChange={(value) => onFilterChange("priority", value as ProjectFilters["priority"])}
          allLabel="Svi prioriteti"
          options={PROJECT_PRIORITIES.map((priority) => ({ value: priority, label: PRIORITY_LABELS[priority] }))}
        />
        <FilterSelect
          value={filters.type}
          onChange={(value) => onFilterChange("type", value as ProjectFilters["type"])}
          allLabel="Sve usluge"
          options={PROJECT_TYPES.map((type) => ({ value: type, label: TYPE_LABELS[type] }))}
        />
        <FilterSelect
          value={filters.lead}
          onChange={(value) => onFilterChange("lead", value)}
          allLabel="Svi voditelji"
          options={leads.map((lead) => ({ value: lead.id, label: lead.name }))}
        />
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={onReset} className="cursor-pointer text-destructive">
            Poništi filtere
          </Button>
        )}
      </div>
    </div>
  )
}
