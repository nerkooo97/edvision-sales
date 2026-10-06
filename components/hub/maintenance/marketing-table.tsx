"use client"

import * as React from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  categoryOrder,
  CONTRACT_STATUS_LABELS,
  CONTRACT_STATUSES,
  formatPeriod,
  isContractStatus,
  isMarketingCategory,
  MARKETING_CATEGORIES,
  MARKETING_CATEGORY_LABELS,
  type ContractStatus,
} from "@/lib/hub/maintenance"
import type { HubMarketingContract } from "@/lib/hub/types"
import { cn } from "@/lib/utils"
import { MonthGrid, MonthGridHeader } from "./month-grid"
import { RowActions } from "./row-actions"
import { StatusBadge, StatusChips, type StatusTone } from "./status-chips"

interface MarketingTableProps {
  contracts: HubMarketingContract[]
  clientNames: Map<string, string>
  canManage: boolean
  onEdit: (contract: HubMarketingContract) => void
  onDelete: (contract: HubMarketingContract) => void
  /** Current month (0-11) when the list shows the current year, otherwise null: no month is outlined. */
  currentMonth: number | null
  /** Id of the contract whose months are being saved right now. */
  savingId: string | null
  onToggleMonth: (contract: HubMarketingContract, month: number) => void
}

const COLUMN_COUNT = 6

const STATUS_TONES: Record<ContractStatus, StatusTone> = {
  signed: "positive",
  to_create: "attention",
  not_needed: "neutral",
}

const toneOf = (status: string): StatusTone => (isContractStatus(status) ? STATUS_TONES[status] : "neutral")
const labelOf = (status: string) => (isContractStatus(status) ? CONTRACT_STATUS_LABELS[status] : status)
const categoryTitle = (category: string) =>
  isMarketingCategory(category) ? MARKETING_CATEGORY_LABELS[category] : category

export function MarketingTable({
  contracts,
  clientNames,
  canManage,
  onEdit,
  onDelete,
  currentMonth,
  savingId,
  onToggleMonth,
}: MarketingTableProps) {
  const [status, setStatus] = React.useState<ContractStatus | null>(null)

  const chips = CONTRACT_STATUSES.map((key) => ({
    key,
    label: CONTRACT_STATUS_LABELS[key],
    count: contracts.filter((contract) => contract.contract_status === key).length,
    tone: STATUS_TONES[key],
  }))

  // Excel order: categories in a fixed order, clients alphabetically inside each one.
  const groups = React.useMemo(() => {
    const nameOf = (contract: HubMarketingContract) => clientNames.get(contract.client_id) ?? ""
    const shown = status ? contracts.filter((contract) => contract.contract_status === status) : contracts
    const sorted = [...shown].sort(
      (a, b) => categoryOrder(a.category) - categoryOrder(b.category) || nameOf(a).localeCompare(nameOf(b), "bs")
    )
    const categories = [...new Set([...MARKETING_CATEGORIES, ...sorted.map((contract) => contract.category)])]
    return categories
      .map((category) => ({ category, rows: sorted.filter((contract) => contract.category === category) }))
      .filter((group) => group.rows.length > 0)
  }, [contracts, clientNames, status])

  return (
    <div className="space-y-3">
      <StatusChips chips={chips} selected={status} onSelect={setStatus} />

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <Table className="table-fixed">
          <colgroup>
            <col className="w-[32%]" />
            <col className="w-[20%]" />
            <col className="w-36" />
            <col className="w-48" />
            <col className="w-[260px]" />
            <col className="w-20" />
          </colgroup>
          <TableHeader>
            <TableRow>
              <TableHead>Komitent</TableHead>
              <TableHead>Usluga</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Ugovor</TableHead>
              <TableHead>
                <MonthGridHeader />
              </TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {groups.map(({ category, rows }) => (
              <React.Fragment key={category}>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableCell colSpan={COLUMN_COUNT} className="py-1.5 text-xs font-semibold text-muted-foreground">
                    {categoryTitle(category)}
                    <span className="ml-1.5 font-normal tabular-nums">· {rows.length}</span>
                  </TableCell>
                </TableRow>
                {rows.map((contract) => {
                  const name = clientNames.get(contract.client_id) ?? "Nepoznat klijent"
                  const stopped = contract.contract_status === "not_needed"
                  const period = formatPeriod(contract.contract_start, contract.contract_end)
                  return (
                    <TableRow key={contract.$id} className={cn(stopped && "text-muted-foreground")}>
                      <TableCell className={cn("truncate font-medium", stopped && "font-normal")} title={name}>
                        {name}
                      </TableCell>
                      <TableCell className="truncate text-sm" title={contract.service}>
                        {contract.service}
                      </TableCell>
                      <TableCell>
                        <StatusBadge tone={toneOf(contract.contract_status)}>{labelOf(contract.contract_status)}</StatusBadge>
                      </TableCell>
                      <TableCell className="font-mono text-xs tabular-nums">
                        {period || <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell>
                        <MonthGrid
                          months={contract.months}
                          currentMonth={currentMonth}
                          muted={stopped}
                          busy={savingId === contract.$id}
                          onToggle={canManage ? (month) => onToggleMonth(contract, month) : undefined}
                        />
                      </TableCell>
                      <TableCell>
                        {canManage && <RowActions onEdit={() => onEdit(contract)} onDelete={() => onDelete(contract)} />}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
