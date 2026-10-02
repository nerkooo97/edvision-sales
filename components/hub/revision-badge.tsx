import { RiAlertLine } from "@remixicon/react"
import { formatHours, revisionsLabel } from "@/lib/hub/revisions"
import { cn } from "@/lib/utils"

interface RevisionBadgeProps {
  /** Both are null on projects older than the columns; no revisions then. */
  count: number | null | undefined
  minutes: number | null | undefined
  /** Spell out where the changes come from ("... po zahtjevu klijenta nakon završetka"); the short form suits tight spots. */
  verbose?: boolean
  className?: string
}

/** "!" marker for a project the client asked changes on after delivery; renders nothing without revisions. */
export function RevisionBadge({ count, minutes, verbose, className }: RevisionBadgeProps) {
  if (!count) return null
  const spent = minutes ? ` · ${formatHours(minutes)}` : ""

  return (
    <span
      title={`Klijent je tražio ${revisionsLabel(count)} nakon isporuke${minutes ? `; utrošeno ${formatHours(minutes)}` : ""}.`}
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap text-amber-700 dark:text-amber-400",
        className
      )}
    >
      <RiAlertLine className="size-3" />
      {revisionsLabel(count)}
      {verbose && " po zahtjevu klijenta nakon završetka"}
      {spent}
    </span>
  )
}
