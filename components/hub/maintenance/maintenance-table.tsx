"use client"

import * as React from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  formatPeriod,
  MAINTENANCE_STATE_LABELS,
  MAINTENANCE_STATES,
  maintenanceState,
  type MaintenanceState,
} from "@/lib/hub/maintenance"
import type { HubMaintenanceContract } from "@/lib/hub/types"
import { cn } from "@/lib/utils"
import { RowActions } from "./row-actions"
import { StatusBadge, StatusChips, type StatusTone } from "./status-chips"

interface MaintenanceTableProps {
  contracts: HubMaintenanceContract[]
  clientNames: Map<string, string>
  canManage: boolean
  onEdit: (contract: HubMaintenanceContract) => void
  onDelete: (contract: HubMaintenanceContract) => void
}

const STATE_TONES: Record<MaintenanceState, StatusTone> = {
  expiring: "attention",
  active: "positive",
  expired: "negative",
}

const todayKey = () => new Date().toISOString().slice(0, 10)

function stateText(state: MaintenanceState, daysLeft: number): string {
  if (state === "expiring") return daysLeft === 0 ? "Ističe danas" : `Ističe za ${daysLeft} ${daysLeft === 1 ? "dan" : "dana"}`
  return MAINTENANCE_STATE_LABELS[state]
}

export function MaintenanceTable({ contracts, clientNames, canManage, onEdit, onDelete }: MaintenanceTableProps) {
  const [selected, setSelected] = React.useState<MaintenanceState | null>(null)

  // Soonest end first, so what needs renewing is at the top; expired contracts go last.
  const rows = React.useMemo(() => {
    const today = todayKey()
    const order = (state: MaintenanceState) => MAINTENANCE_STATES.indexOf(state)
    return contracts
      .map((contract) => ({ contract, ...maintenanceState(contract.end_date, today) }))
      .sort((a, b) => order(a.state) - order(b.state) || a.contract.end_date.localeCompare(b.contract.end_date))
  }, [contracts])

  const chips = MAINTENANCE_STATES.map((key) => ({
    key,
    label: MAINTENANCE_STATE_LABELS[key],
    count: rows.filter((row) => row.state === key).length,
    tone: STATE_TONES[key],
  }))
  const shown = selected ? rows.filter((row) => row.state === selected) : rows

  return (
    <div className="space-y-3">
      <StatusChips chips={chips} selected={selected} onSelect={setSelected} />

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <Table className="table-fixed">
          <colgroup>
            <col className="w-[30%]" />
            <col className="w-[20%]" />
            <col className="w-[22%]" />
            <col className="w-36" />
            <col className="w-48" />
            <col className="w-20" />
          </colgroup>
          <TableHeader>
            <TableRow>
              <TableHead>Komitent</TableHead>
              <TableHead>Domena</TableHead>
              <TableHead>Usluga</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Ugovor</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {shown.map(({ contract, state, daysLeft }) => {
              const name = clientNames.get(contract.client_id) ?? "Nepoznat klijent"
              const expired = state === "expired"
              return (
                <TableRow key={contract.$id} className={cn(expired && "text-muted-foreground")}>
                  <TableCell className={cn("truncate font-medium", expired && "font-normal")} title={name}>
                    {name}
                  </TableCell>
                  <TableCell className="truncate text-sm text-muted-foreground" title={contract.domain ?? undefined}>
                    {contract.domain ?? "—"}
                  </TableCell>
                  <TableCell className="truncate text-sm" title={contract.service}>
                    {contract.service}
                  </TableCell>
                  <TableCell>
                    <StatusBadge tone={STATE_TONES[state]}>{stateText(state, daysLeft)}</StatusBadge>
                  </TableCell>
                  <TableCell className="font-mono text-xs tabular-nums">
                    {formatPeriod(contract.start_date, contract.end_date)}
                  </TableCell>
                  <TableCell>
                    {canManage && <RowActions onEdit={() => onEdit(contract)} onDelete={() => onDelete(contract)} />}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
