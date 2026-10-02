import type { SortKey } from "./use-project-filters"

export type ColumnId =
  | "code"
  | "name"
  | "client"
  | "type"
  | "budget"
  | "status"
  | "offer"
  | "start"
  | "deadline"
  | "completion"
  | "lead"
  | "priority"
  | "tasks"

export interface ColumnDef {
  id: ColumnId
  label: string
  sortKey?: SortKey
  className: string
  /** Shown until the user hides it; the extra date columns start hidden to keep the table compact. */
  defaultVisible: boolean
  /** The project name is what makes a row recognisable, so it cannot be hidden. */
  locked?: boolean
  /** Project money: only available to the administrator. */
  money?: boolean
}

export const PROJECT_COLUMNS: ColumnDef[] = [
  { id: "code", label: "Šifra", sortKey: "code", className: "min-w-24", defaultVisible: true },
  { id: "name", label: "Projekat", sortKey: "name", className: "min-w-52", defaultVisible: true, locked: true },
  { id: "client", label: "Klijent", sortKey: "client_name", className: "min-w-40", defaultVisible: true },
  { id: "type", label: "Tip", className: "min-w-36", defaultVisible: true },
  { id: "budget", label: "Vrijednost", sortKey: "budget", className: "min-w-32 text-right", defaultVisible: true, money: true },
  { id: "status", label: "Status", sortKey: "status", className: "min-w-44", defaultVisible: true },
  { id: "offer", label: "Ponuda", className: "min-w-28", defaultVisible: false },
  { id: "start", label: "Početak", className: "min-w-28", defaultVisible: false },
  { id: "deadline", label: "Rok", sortKey: "planned_deadline", className: "min-w-28", defaultVisible: true },
  { id: "completion", label: "Završeno", className: "min-w-28", defaultVisible: false },
  { id: "lead", label: "Voditelj", className: "min-w-32", defaultVisible: true },
  { id: "priority", label: "Prioritet", sortKey: "priority", className: "min-w-28", defaultVisible: true },
  { id: "tasks", label: "Zadaci", className: "min-w-20", defaultVisible: true },
]

/** The columns a user may see at all; money columns exist only for those who may see project money. */
export const columnsFor = (canViewMoney: boolean): ColumnDef[] =>
  PROJECT_COLUMNS.filter((column) => canViewMoney || !column.money)

export const defaultVisibleColumns = (canViewMoney: boolean): ColumnId[] =>
  columnsFor(canViewMoney)
    .filter((column) => column.defaultVisible)
    .map((column) => column.id)
