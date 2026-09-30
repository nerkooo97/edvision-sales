import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatKm } from "@/lib/hub/format"
import type { MonthSummary } from "@/lib/hub/retainer"
import { cn, formatDate } from "@/lib/utils"

const HEADERS = ["Mjesec", "Sedmica", "Ugovoreno", "Isporučeno", "Razlika", "Naknada", "Dodatne objave", "Za fakturu", "Stanje"]

function Difference({ month }: { month: MonthSummary }) {
  if (month.extra > 0) return <span className="font-semibold text-amber-600">+{month.extra}</span>
  if (month.shortfall > 0) return <span className="font-semibold text-destructive">−{month.shortfall}</span>
  return <span className="text-muted-foreground">0</span>
}

/** Month-by-month figures for invoicing: the monthly fee plus any extra posts beyond the agreed number. */
export function DeliveryMonths({ months, hasExtraPrice }: { months: MonthSummary[]; hasExtraPrice: boolean }) {
  return (
    <div className="space-y-2">
      <div className="w-full max-w-full overflow-x-auto rounded-xl border border-border bg-card">
        <Table className="min-w-[860px]">
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-transparent">
              {HEADERS.map((label, index) => (
                <TableHead
                  key={label}
                  className={cn(
                    "text-xs font-semibold tracking-wider text-muted-foreground uppercase",
                    index >= 2 && index <= 7 && "text-right"
                  )}
                >
                  {label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {months.map((month) => (
              <TableRow key={month.index}>
                <TableCell>
                  <span className="text-sm font-semibold">{month.index + 1}. mjesec</span>
                  <span className="block font-mono text-[11px] text-muted-foreground">
                    {formatDate(month.start)} – {formatDate(month.end)}
                  </span>
                </TableCell>
                <TableCell className="text-right font-mono text-sm tabular-nums">{month.weeks}</TableCell>
                <TableCell className="text-right font-mono text-sm tabular-nums">{month.contracted}</TableCell>
                <TableCell className="text-right font-mono text-sm font-semibold tabular-nums">{month.delivered}</TableCell>
                <TableCell className="text-right font-mono text-sm tabular-nums">
                  <Difference month={month} />
                </TableCell>
                <TableCell className="text-right font-mono text-sm tabular-nums">{formatKm(month.monthlyFee)}</TableCell>
                <TableCell className="text-right font-mono text-sm tabular-nums">
                  {month.extra > 0 ? (hasExtraPrice ? formatKm(month.extraAmount) : `${month.extra} kom`) : "—"}
                </TableCell>
                <TableCell className="text-right font-mono text-sm font-bold tabular-nums">
                  {formatKm(month.invoiceTotal)}
                </TableCell>
                <TableCell>
                  {month.isClosed ? (
                    <Badge variant="secondary" className="bg-emerald-500/15 font-medium text-emerald-700 dark:text-emerald-400">
                      Za fakturisanje
                    </Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">U toku / predstoji</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <p className="px-1 text-[11px] text-muted-foreground">
        Dodatne objave se računaju za cijeli mjesec: manjak u jednoj sedmici nadoknađuje se viškom u drugoj, a fakturiše se
        samo ukupan višak mjeseca iznad dogovorenog.
        {!hasExtraPrice && " Cijena dodatne objave nije unesena, pa se prikazuje samo broj objava."}
      </p>
    </div>
  )
}
