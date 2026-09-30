import { describeActivity } from "@/lib/hub/activity-text"
import type { HubActivity } from "@/lib/hub/types"
import { formatDateTime } from "@/lib/utils"
import type { NameResolver } from "./detail-types"

export function ActivityTab({ activities, nameOf }: { activities: HubActivity[]; nameOf: NameResolver }) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold">Historija aktivnosti</h3>
        <p className="text-xs text-muted-foreground">Evidencija promjena statusa, podataka, zadataka i komentara.</p>
      </div>

      {activities.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
          Još nema zabilježenih aktivnosti.
        </p>
      ) : (
        <ol className="relative space-y-4 pl-5 before:absolute before:top-2 before:bottom-2 before:left-[5px] before:w-px before:bg-border">
          {activities.map((activity) => (
            <li key={activity.$id} className="relative">
              <span className="absolute top-1.5 -left-5 size-2.5 rounded-full bg-primary ring-4 ring-background" />
              <div className="flex flex-wrap items-baseline gap-x-2">
                <span className="text-sm font-semibold">{nameOf(activity.user_id)}</span>
                <span className="font-mono text-[11px] text-muted-foreground">{formatDateTime(activity.$createdAt)}</span>
              </div>
              <p className="text-sm text-muted-foreground">{describeActivity(activity)}</p>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
