"use client"

import * as React from "react"
import { RiAddLine } from "@remixicon/react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  categoryOrder,
  CONTRACT_STATUS_LABELS,
  countMonths,
  formatMonths,
  hasMonth,
  isContractStatus,
  isMarketingCategory,
  MARKETING_CATEGORIES,
  MARKETING_CATEGORY_LABELS,
  MONTH_SHORT_NAMES,
} from "@/lib/hub/maintenance"
import type { HubMarketingContract } from "@/lib/hub/types"
import { cn, formatDate } from "@/lib/utils"
import { RowActions } from "./row-actions"

interface MarketingTableProps {
  contracts: HubMarketingContract[]
  clientNames: Map<string, string>
  canManage: boolean
  onEdit: (contract: HubMarketingContract) => void
  onDelete: (contract: HubMarketingContract) => void
  /** Current month (0-11) when the list shows the current year, otherwise null: no quick add is offered. */
  currentMonth: number | null
  /** Id of the contract whose month is being saved right now. */
  savingId: string | null
  onAddCurrentMonth: (contract: HubMarketingContract) => void
}

const COLUMN_COUNT = 7

const categoryTitle = (category: string) =>
  isMarketingCategory(category) ? MARKETING_CATEGORY_LABELS[category] : category

/** Dates of a signed contract, or the reason there are none. */
function ContractDates({ contract }: { contract: HubMarketingContract }) {
  if (contract.contract_status === "signed") {
    return (
      <>
        <TableCell className="font-mono text-xs tabular-nums text-blue-600 dark:text-blue-400">
          {formatDate(contract.contract_start)}
        </TableCell>
        <TableCell className="font-mono text-xs tabular-nums text-blue-600 dark:text-blue-400">
          {formatDate(contract.contract_end)}
        </TableCell>
      </>
    )
  }
  if (contract.contract_status === "not_needed") {
    return (
      <TableCell colSpan={2} className="text-center text-xs italic text-orange-600 dark:text-orange-400">
        {CONTRACT_STATUS_LABELS.not_needed}
      </TableCell>
    )
  }
  return (
    <TableCell colSpan={2} className="text-center text-xs font-medium text-red-600 dark:text-red-400">
      {isContractStatus(contract.contract_status) ? CONTRACT_STATUS_LABELS[contract.contract_status] : "—"}
    </TableCell>
  )
}

export function MarketingTable({
  contracts,
  clientNames,
  canManage,
  onEdit,
  onDelete,
  currentMonth,
  savingId,
  onAddCurrentMonth,
}: MarketingTableProps) {
  // Excel order: categories in a fixed order, clients alphabetically inside each one.
  const groups = React.useMemo(() => {
    const nameOf = (contract: HubMarketingContract) => clientNames.get(contract.client_id) ?? ""
    const sorted = [...contracts].sort(
      (a, b) => categoryOrder(a.category) - categoryOrder(b.category) || nameOf(a).localeCompare(nameOf(b), "bs")
    )
    const categories = [...MARKETING_CATEGORIES, ...new Set(sorted.map((c) => c.category))]
    return [...new Set(categories)]
      .map((category) => ({ category, rows: sorted.filter((contract) => contract.category === category) }))
      .filter((group) => group.rows.length > 0)
  }, [contracts, clientNames])

  return (
    <div className="rounded-xl border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Komitent</TableHead>
            <TableHead>Usluga</TableHead>
            <TableHead>Ugovor od</TableHead>
            <TableHead>Ugovor do</TableHead>
            <TableHead>Mjeseci</TableHead>
            <TableHead className="text-center">Broj mjeseci</TableHead>
            <TableHead className="w-24" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {groups.map(({ category, rows }) => (
            <React.Fragment key={category}>
              <TableRow className="bg-muted/60 hover:bg-muted/60">
                <TableCell colSpan={COLUMN_COUNT} className="text-xs font-semibold text-primary">
                  {categoryTitle(category)}
                </TableCell>
              </TableRow>
              {rows.map((contract) => (
                <TableRow
                  key={contract.$id}
                  className={cn(
                    contract.contract_status === "to_create" &&
                      "bg-red-50 text-red-700 hover:bg-red-100/70 dark:bg-red-950/30 dark:text-red-300"
                  )}
                >
                  <TableCell className="font-medium">{clientNames.get(contract.client_id) ?? "Nepoznat klijent"}</TableCell>
                  <TableCell>{contract.service}</TableCell>
                  <ContractDates contract={contract} />
                  <TableCell className="text-xs">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span>{formatMonths(contract.months) || "—"}</span>
                      {canManage && currentMonth !== null && !hasMonth(contract.months, currentMonth) && (
                        <button
                          type="button"
                          disabled={savingId === contract.$id}
                          onClick={() => onAddCurrentMonth(contract)}
                          title={`Dodaj tekući mjesec (${MONTH_SHORT_NAMES[currentMonth]})`}
                          className="inline-flex cursor-pointer items-center gap-0.5 rounded-full border border-primary/40 px-2 py-0.5 text-[11px] font-medium text-primary hover:bg-primary/10 disabled:cursor-wait disabled:opacity-50"
                        >
                          <RiAddLine className="size-3" />
                          {MONTH_SHORT_NAMES[currentMonth]}
                        </button>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-center tabular-nums">{countMonths(contract.months) || "—"}</TableCell>
                  <TableCell>
                    {canManage && <RowActions onEdit={() => onEdit(contract)} onDelete={() => onDelete(contract)} />}
                  </TableCell>
                </TableRow>
              ))}
            </React.Fragment>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
