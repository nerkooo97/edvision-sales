import { Badge } from "@/components/ui/badge"
import type { ProjectPriority, ProjectStatus } from "@/lib/hub/constants"
import { PRIORITY_LABELS, PRIORITY_STYLES, STATUS_LABELS, STATUS_STYLES } from "@/lib/hub/labels"
import { cn } from "@/lib/utils"

export function StatusBadge({ status, className }: { status: ProjectStatus; className?: string }) {
  return (
    <Badge variant="secondary" className={cn("font-medium", STATUS_STYLES[status], className)}>
      {STATUS_LABELS[status]}
    </Badge>
  )
}

export function PriorityLabel({ priority }: { priority: ProjectPriority }) {
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs font-medium", PRIORITY_STYLES[priority])}>
      <span aria-hidden>●</span>
      {PRIORITY_LABELS[priority]}
    </span>
  )
}
