"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { HubMaintenanceContract } from "@/lib/hub/types"
import { formatDate } from "@/lib/utils"
import { RowActions } from "./row-actions"

interface MaintenanceTableProps {
  contracts: HubMaintenanceContract[]
  clientNames: Map<string, string>
  canManage: boolean
  onEdit: (contract: HubMaintenanceContract) => void
  onDelete: (contract: HubMaintenanceContract) => void
}

export function MaintenanceTable({ contracts, clientNames, canManage, onEdit, onDelete }: MaintenanceTableProps) {
  return (
    <div className="rounded-xl border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">R.br.</TableHead>
            <TableHead>Komitent</TableHead>
            <TableHead>Domena</TableHead>
            <TableHead>Usluga</TableHead>
            <TableHead>Od</TableHead>
            <TableHead>Do</TableHead>
            <TableHead className="w-24" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {contracts.map((contract, index) => (
            <TableRow key={contract.$id}>
              <TableCell className="text-xs tabular-nums text-muted-foreground">{index + 1}</TableCell>
              <TableCell className="font-medium">{clientNames.get(contract.client_id) ?? "Nepoznat klijent"}</TableCell>
              <TableCell className="text-muted-foreground">{contract.domain ?? "—"}</TableCell>
              <TableCell>{contract.service}</TableCell>
              <TableCell className="font-mono text-xs tabular-nums text-blue-600 dark:text-blue-400">
                {formatDate(contract.start_date)}
              </TableCell>
              <TableCell className="font-mono text-xs tabular-nums text-blue-600 dark:text-blue-400">
                {formatDate(contract.end_date)}
              </TableCell>
              <TableCell>
                {canManage && <RowActions onEdit={() => onEdit(contract)} onDelete={() => onDelete(contract)} />}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
