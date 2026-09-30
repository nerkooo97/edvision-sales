import Link from "next/link"
import { RiAlertLine } from "@remixicon/react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { AD_PLATFORMS, monthLabel, summarizeAdMonth, type AdPlatform } from "@/lib/hub/ad-budget"
import { formatMoney } from "@/lib/hub/currency"
import type { HubAdBudget, HubProjectSummary } from "@/lib/hub/types"
import { cn } from "@/lib/utils"

const PLATFORM_NAMES: Record<AdPlatform, string> = { meta: "Meta", google: "Google Ads" }

/**
 * Client-managed advertising money for the current month, per project. It is shown apart from the income
 * figures on purpose: it is the client's money that goes to the platforms, not agency revenue.
 */
export function AdBudgetsPanel({
  month,
  rows,
  projects,
}: {
  month: string
  rows: HubAdBudget[]
  projects: HubProjectSummary[]
}) {
  const byId = new Map(projects.map((project) => [project.$id, project]))

  const lines = summarizeAdMonth(rows)
    .filter((line) => byId.has(line.projectId))
    .sort((a, b) => b.planned - a.planned)

  const totals = lines.reduce(
    (sum, line) => ({ planned: sum.planned + line.planned, spent: sum.spent + line.spent }),
    { planned: 0, spent: 0 }
  )

  return (
    <section className="space-y-4 rounded-xl border border-border bg-card p-5">
      <div>
        <h3 className="text-sm font-semibold">Oglasni budžeti klijenata, {monthLabel(month)}</h3>
        <p className="text-xs text-muted-foreground">
          Novac koji klijenti troše na Meta i Google Ads. Nije vaš prihod i nije uračunat u vrijednosti iznad.
        </p>
      </div>

      {lines.length === 0 ? (
        <p className="py-4 text-center text-xs text-muted-foreground">Za ovaj mjesec još nije unesen oglasni budžet.</p>
      ) : (
        <div className="w-full max-w-full overflow-x-auto rounded-lg border border-border">
          <Table className="min-w-[760px]">
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-transparent">
                <TableHead className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">Projekat</TableHead>
                {AD_PLATFORMS.map((platform) => (
                  <TableHead
                    key={platform}
                    className="text-right text-xs font-semibold tracking-wider text-muted-foreground uppercase"
                  >
                    {PLATFORM_NAMES[platform]} (potrošeno / plan)
                  </TableHead>
                ))}
                <TableHead className="text-right text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                  Ukupno (potrošeno / plan)
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.map((line) => {
                const project = byId.get(line.projectId)!
                return (
                  <TableRow key={line.projectId}>
                    <TableCell>
                      <Link href={`/hub/projects/${project.$id}`} className="text-sm font-semibold hover:text-primary">
                        {project.name}
                      </Link>
                      <span className="block text-xs text-muted-foreground">{project.client_name}</span>
                    </TableCell>
                    {AD_PLATFORMS.map((platform) => {
                      const amounts = line.platforms[platform]
                      const over = amounts.spent > amounts.planned
                      return (
                        <TableCell
                          key={platform}
                          className={cn("text-right font-mono text-sm tabular-nums", over && "font-semibold text-destructive")}
                        >
                          <span className="inline-flex items-center justify-end gap-1">
                            {over && <RiAlertLine className="size-3.5" />}
                            {formatMoney(amounts.spent, "EUR")} / {formatMoney(amounts.planned, "EUR")}
                          </span>
                        </TableCell>
                      )
                    })}
                    <TableCell className="text-right font-mono text-sm font-semibold tabular-nums">
                      {formatMoney(line.spent, "EUR")} / {formatMoney(line.planned, "EUR")}
                    </TableCell>
                  </TableRow>
                )
              })}
              <TableRow className="bg-muted/40 font-semibold hover:bg-muted/40">
                <TableCell className="text-xs tracking-wider uppercase">Ukupno</TableCell>
                {AD_PLATFORMS.map((platform) => (
                  <TableCell key={platform} className="text-right font-mono text-sm tabular-nums">
                    {formatMoney(lines.reduce((sum, line) => sum + line.platforms[platform].spent, 0), "EUR")} /{" "}
                    {formatMoney(lines.reduce((sum, line) => sum + line.platforms[platform].planned, 0), "EUR")}
                  </TableCell>
                ))}
                <TableCell className="text-right font-mono text-sm tabular-nums">
                  {formatMoney(totals.spent, "EUR")} / {formatMoney(totals.planned, "EUR")}
                  <span className="block text-[11px] font-normal text-muted-foreground">
                    {formatMoney(totals.spent, "KM")} / {formatMoney(totals.planned, "KM")}
                  </span>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  )
}
