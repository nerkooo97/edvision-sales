"use client"

import { RiDownload2Line, RiLayoutColumnLine } from "@remixicon/react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { ColumnDef, ColumnId } from "./project-columns"

interface TableActionsProps {
  /** Columns this user may choose from. */
  columns: ColumnDef[]
  visibleColumns: ReadonlySet<ColumnId>
  onToggleColumn: (column: ColumnId) => void
  onExport: () => void
  canExport: boolean
}

/** Column chooser and CSV export, shown next to the "new project" button. */
export function TableActions({ columns, visibleColumns, onToggleColumn, onExport, canExport }: TableActionsProps) {
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" variant="outline" className="cursor-pointer gap-1.5">
            <RiLayoutColumnLine className="size-4" />
            <span className="hidden sm:inline">Kolone</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuLabel>Prikazane kolone</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {columns.map((column) => (
            <DropdownMenuCheckboxItem
              key={column.id}
              checked={visibleColumns.has(column.id)}
              disabled={column.locked}
              // Keep the menu open so several columns can be toggled in one go.
              onSelect={(event) => event.preventDefault()}
              onCheckedChange={() => onToggleColumn(column.id)}
            >
              {column.label}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Button
        size="sm"
        variant="outline"
        onClick={onExport}
        disabled={!canExport}
        className="cursor-pointer gap-1.5"
        title="Preuzmi prikazane projekte kao CSV (Excel)"
      >
        <RiDownload2Line className="size-4" />
        <span className="hidden sm:inline">Izvezi CSV</span>
      </Button>
    </>
  )
}
