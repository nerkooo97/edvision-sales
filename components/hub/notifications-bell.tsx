"use client"

import * as React from "react"
import Link from "next/link"
import {
  RiAlertLine,
  RiCheckboxCircleLine,
  RiMegaphoneLine,
  RiNotification3Line,
  RiRefreshLine,
  RiTimeLine,
} from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { getNotificationsAction, type Notifications } from "@/lib/hub/actions/notifications"
import { isPastDeadline } from "@/lib/hub/format"
import type { HubProjectSummary } from "@/lib/hub/types"
import { cn, formatDate } from "@/lib/utils"

function Section({
  title,
  icon,
  tone,
  children,
}: {
  title: string
  icon: React.ReactNode
  tone: string
  children: React.ReactNode
}) {
  return (
    <section className="space-y-2">
      <h4 className={cn("flex items-center gap-1.5 text-[11px] font-bold tracking-wider uppercase", tone)}>
        {icon}
        {title}
      </h4>
      {children}
    </section>
  )
}

function ProjectLink({ project, onNavigate }: { project: HubProjectSummary; onNavigate: () => void }) {
  return (
    <Link
      href={`/hub/projects/${project.$id}`}
      onClick={onNavigate}
      className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3 transition-colors hover:bg-muted/50"
    >
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold">{project.name}</span>
        <span className="block truncate text-xs text-muted-foreground">{project.client_name}</span>
      </span>
      <span className="shrink-0 font-mono text-xs text-muted-foreground">{formatDate(project.planned_deadline)}</span>
    </Link>
  )
}

const EMPTY = "text-xs text-muted-foreground rounded-lg border border-dashed border-border p-3"

export function NotificationsBell() {
  const [open, setOpen] = React.useState(false)
  const [data, setData] = React.useState<Notifications | null>(null)

  const load = React.useCallback(async () => {
    const result = await getNotificationsAction()
    if (result.success) setData(result.data)
  }, [])

  // Loaded once per page for the red dot; loaded again whenever the panel is opened.
  React.useEffect(() => {
    let cancelled = false
    getNotificationsAction().then((result) => {
      if (!cancelled && result.success) setData(result.data)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const overdueTasks = data?.myTasks.filter((task) => isPastDeadline(task.deadline)) ?? []
  const alertCount = (data?.overdue.length ?? 0) +
    (data?.dueSoon.length ?? 0) +
    (data?.renewalsSoon.length ?? 0) +
    (data?.maintenanceExpiring.length ?? 0) +
    (data?.adOverspend.length ?? 0) +
    overdueTasks.length
  const close = () => setOpen(false)

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="relative cursor-pointer"
        title="Obavijesti i rokovi"
        onClick={() => {
          setOpen(true)
          load()
        }}
      >
        <RiNotification3Line className="size-5" />
        {alertCount > 0 && (
          <span className="absolute top-1 right-1 flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white">
            {alertCount > 99 ? "99+" : alertCount}
          </span>
        )}
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
          <SheetHeader className="border-b border-border bg-muted/20 px-5 py-4">
            <SheetTitle>Obavijesti i rokovi</SheetTitle>
            <SheetDescription>Kašnjenja, rokovi u narednih 7 dana i vaši zadaci.</SheetDescription>
          </SheetHeader>

          <div className="flex-1 space-y-6 overflow-y-auto p-5">
            {!data ? (
              <p className="text-sm text-muted-foreground">Učitavanje...</p>
            ) : (
              <>
                <Section title={`Projekti u kašnjenju (${data.overdue.length})`} icon={<RiAlertLine className="size-3.5" />} tone="text-destructive">
                  {data.overdue.length === 0 ? (
                    <p className={EMPTY}>Nema projekata koji kasne.</p>
                  ) : (
                    <div className="space-y-2">
                      {data.overdue.map((project) => (
                        <ProjectLink key={project.$id} project={project} onNavigate={close} />
                      ))}
                    </div>
                  )}
                </Section>

                <Section title={`Rok ističe uskoro (${data.dueSoon.length})`} icon={<RiTimeLine className="size-3.5" />} tone="text-amber-600 dark:text-amber-400">
                  {data.dueSoon.length === 0 ? (
                    <p className={EMPTY}>Nijedan rok ne ističe u narednih 7 dana.</p>
                  ) : (
                    <div className="space-y-2">
                      {data.dueSoon.map((project) => (
                        <ProjectLink key={project.$id} project={project} onNavigate={close} />
                      ))}
                    </div>
                  )}
                </Section>

                <Section title={`Ugovori pred istekom, 30 dana (${data.renewalsSoon.length})`} icon={<RiRefreshLine className="size-3.5" />} tone="text-blue-600 dark:text-blue-400">
                  {data.renewalsSoon.length === 0 ? (
                    <p className={EMPTY}>Nijedan ugovor ne ističe u narednih 30 dana.</p>
                  ) : (
                    <div className="space-y-2">
                      {data.renewalsSoon.map((project) => (
                        <ProjectLink key={project.$id} project={project} onNavigate={close} />
                      ))}
                    </div>
                  )}
                </Section>

                {data.maintenanceExpiring.length > 0 && (
                  <Section
                    title={`Održavanje stranica ističe (${data.maintenanceExpiring.length})`}
                    icon={<RiRefreshLine className="size-3.5" />}
                    tone="text-amber-600 dark:text-amber-400"
                  >
                    <div className="space-y-2">
                      {data.maintenanceExpiring.map((contract) => (
                        <Link
                          key={contract.id}
                          href="/hub/maintenance"
                          onClick={close}
                          className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3 transition-colors hover:bg-muted/50"
                        >
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-semibold">{contract.client_name}</span>
                            <span className="block truncate text-xs text-muted-foreground">{contract.domain ?? "Održavanje web stranice"}</span>
                          </span>
                          <span className="shrink-0 font-mono text-xs text-muted-foreground">{formatDate(contract.end_date)}</span>
                        </Link>
                      ))}
                    </div>
                  </Section>
                )}

                {data.adOverspend.length > 0 && (
                  <Section
                    title={`Oglasni budžet prekoračen (${data.adOverspend.length})`}
                    icon={<RiMegaphoneLine className="size-3.5" />}
                    tone="text-destructive"
                  >
                    <div className="space-y-2">
                      {data.adOverspend.map((item) => (
                        <Link
                          key={item.project_id}
                          href={`/hub/projects/${item.project_id}`}
                          onClick={close}
                          className="flex items-center justify-between gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-3 transition-colors hover:bg-destructive/10"
                        >
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-semibold">{item.project_name}</span>
                            <span className="block truncate text-xs text-muted-foreground">
                              {item.project_code} · ovaj mjesec
                            </span>
                          </span>
                          <span className="shrink-0 text-xs font-semibold text-destructive">
                            {item.platforms.map((platform) => (platform === "meta" ? "Meta" : "Google Ads")).join(", ")}
                          </span>
                        </Link>
                      ))}
                    </div>
                  </Section>
                )}

                <Section title={`Moji zadaci (${data.myTasks.length})`} icon={<RiCheckboxCircleLine className="size-3.5" />} tone="text-foreground">
                  {data.myTasks.length === 0 ? (
                    <p className={EMPTY}>Nemate otvorenih zadataka.</p>
                  ) : (
                    <div className="space-y-2">
                      {data.myTasks.map((task) => {
                        const late = isPastDeadline(task.deadline)
                        return (
                          <Link
                            key={task.$id}
                            href={`/hub/projects/${task.project_id}`}
                            onClick={close}
                            className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3 transition-colors hover:bg-muted/50"
                          >
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-semibold">{task.title}</span>
                              <span className="block truncate text-xs text-muted-foreground">
                                {task.project_code} · {task.project_name}
                              </span>
                            </span>
                            {task.deadline && (
                              <span className={cn("shrink-0 font-mono text-xs", late ? "font-semibold text-destructive" : "text-muted-foreground")}>
                                {formatDate(task.deadline)}
                              </span>
                            )}
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </Section>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
