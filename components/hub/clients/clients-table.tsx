"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { RiAddLine, RiBuilding2Line, RiDeleteBinLine, RiEditLine, RiSearchLine } from "@remixicon/react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { getClientAction, updateClientAction } from "@/lib/hub/actions/clients"
import { DEFAULT_COUNTRY } from "@/lib/hub/countries"
import { formatKm } from "@/lib/hub/format"
import type { HubClient, HubClientListItem, HubProjectSummary } from "@/lib/hub/types"
import { formatDate, stripDiacritics } from "@/lib/utils"
import { buildClientStats, buildClientsOverview } from "./client-stats"
import { ClientFormDialog } from "./client-form-dialog"
import { ClientsSummary } from "./clients-summary"
import { DeleteClientDialog } from "./delete-client-dialog"

interface ClientsTableProps {
  clients: HubClientListItem[]
  /** Project summaries, only used to show how many projects and how much value each client has. */
  projects: HubProjectSummary[]
  canManage: boolean
  canDelete: boolean
  /** The value column and value cards are shown only to those who may see project money. */
  canViewMoney: boolean
}

// Text columns share the free space; numeric columns are narrow and right-aligned, header and cell alike.
const COLUMNS: { label: string; className: string; money?: true }[] = [
  { label: "Klijent", className: "" },
  { label: "Kontakt", className: "" },
  { label: "Grad", className: "" },
  { label: "Projekti", className: "w-28 text-right" },
  { label: "Zadnji projekat", className: "w-36 text-right" },
  { label: "Vrijednost", className: "w-40 text-right", money: true },
  { label: "Akcije", className: "w-52 text-right" },
]

const normalize = (value: string) => stripDiacritics(value).toLowerCase().trim()

export function ClientsTable({ clients, projects, canManage, canDelete, canViewMoney }: ClientsTableProps) {
  const columns = COLUMNS.filter((column) => canViewMoney || !("money" in column))
  const router = useRouter()
  const refresh = () => router.refresh()

  const [search, setSearch] = React.useState("")
  const [showInactive, setShowInactive] = React.useState(false)
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<HubClient | null>(null)
  const [toDelete, setToDelete] = React.useState<HubClientListItem | null>(null)

  const stats = React.useMemo(() => buildClientStats(projects), [projects])
  const overview = React.useMemo(() => buildClientsOverview(clients, stats), [clients, stats])

  const visible = React.useMemo(() => {
    const query = normalize(search)
    return clients.filter((client) => {
      if (!showInactive && !client.is_active) return false
      if (!query) return true
      return normalize(`${client.name} ${client.email ?? ""} ${client.city ?? ""} ${client.tax_id ?? ""}`).includes(query)
    })
  }, [clients, search, showInactive])

  const openDialog = (client: HubClient | null) => {
    setEditing(client)
    setDialogOpen(true)
  }

  // The list holds only the shown columns; the full row is read when a client is opened for editing.
  const openEdit = async (item: HubClientListItem) => {
    const result = await getClientAction(item.$id)
    if (!result.success) return toast.error(result.error)
    openDialog(result.data.client)
  }

  const toggleActive = async (client: HubClientListItem) => {
    const result = await updateClientAction(client.$id, { is_active: !client.is_active })
    if (!result.success) return toast.error(result.error)
    toast.success(client.is_active ? "Klijent je deaktiviran." : "Klijent je aktiviran.")
    refresh()
  }

  return (
    <div className="w-full min-w-0 max-w-full space-y-4">
      <ClientsSummary overview={overview} showMoney={canViewMoney} />

      <div className="flex flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-center">
        <div className="relative w-full sm:max-w-xs">
          <RiSearchLine className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Pretraži klijente..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="h-9 bg-background pl-9"
          />
        </div>

        <div className="flex items-center justify-between gap-4 sm:justify-end">
          <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
            <Switch checked={showInactive} onCheckedChange={setShowInactive} />
            Prikaži neaktivne
          </label>
          {canManage && (
            <Button size="sm" onClick={() => openDialog(null)} className="cursor-pointer gap-1.5 shadow-xs">
              <RiAddLine className="size-4" />
              Novi klijent
            </Button>
          )}
        </div>
      </div>

      <div className="w-full max-w-full overflow-hidden rounded-xl border border-border bg-card">
        <Table className="w-full min-w-[1000px]">
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-transparent">
              {columns.map((column) => (
                <TableHead
                  key={column.label}
                  className={`text-xs font-semibold tracking-wider text-muted-foreground uppercase ${column.className}`}
                >
                  {column.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-44 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <RiBuilding2Line className="size-8 opacity-40" />
                    <p className="text-sm font-medium text-foreground">Nema pronađenih klijenata</p>
                    <p className="text-xs">
                      {clients.length === 0 && canManage
                        ? "Dodajte prvog klijenta ili ga sačuvajte pri kreiranju projekta."
                        : "Pokušajte s drugačijom pretragom."}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              visible.map((client) => {
                const clientStats = stats.get(client.$id)
                return (
                  <TableRow
                    key={client.$id}
                    className="cursor-pointer transition-colors hover:bg-muted/40"
                    onClick={() => router.push(`/hub/clients/${client.$id}`)}
                  >
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <span className="flex items-center gap-2 text-sm font-semibold">
                          {client.name}
                          {!client.is_active && (
                            <Badge variant="outline" className="h-4 px-1.5 text-[10px] font-normal">
                              Neaktivan
                            </Badge>
                          )}
                        </span>
                        {client.tax_id && <span className="font-mono text-xs text-muted-foreground">{client.tax_id}</span>}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {client.email && <div>{client.email}</div>}
                      {client.phone && <div>{client.phone}</div>}
                      {!client.email && !client.phone && "—"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {client.city ?? "—"}
                      {client.country && client.country !== DEFAULT_COUNTRY && (
                        <span className="ml-1.5 font-mono text-[11px] text-muted-foreground">{client.country}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="block font-mono text-sm tabular-nums">{clientStats?.count ?? 0}</span>
                      {clientStats && clientStats.active > 0 && (
                        <span className="block text-[11px] text-emerald-600 dark:text-emerald-400">
                          {clientStats.active} u toku
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-muted-foreground tabular-nums">
                      {formatDate(clientStats?.lastProjectAt)}
                    </TableCell>
                    {canViewMoney && (
                      <TableCell className="text-right font-mono text-sm font-semibold tabular-nums">
                        {formatKm(clientStats?.value ?? 0)}
                      </TableCell>
                    )}
                    <TableCell className="text-right" onClick={(event) => event.stopPropagation()}>
                      <div className="inline-flex items-center gap-1">
                        {canManage && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8 cursor-pointer text-muted-foreground hover:text-primary"
                              title="Uredi klijenta"
                              onClick={() => openEdit(client)}
                            >
                              <RiEditLine className="size-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 cursor-pointer px-2 text-xs text-muted-foreground"
                              onClick={() => toggleActive(client)}
                            >
                              {client.is_active ? "Deaktiviraj" : "Aktiviraj"}
                            </Button>
                          </>
                        )}
                        {canDelete && !stats.get(client.$id) && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 cursor-pointer text-muted-foreground hover:text-destructive"
                            title="Obriši klijenta"
                            onClick={() => setToDelete(client)}
                          >
                            <RiDeleteBinLine className="size-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      <p className="px-1 text-xs text-muted-foreground">
        Prikazano <span className="font-medium text-foreground">{visible.length}</span> od{" "}
        <span className="font-medium text-foreground">{clients.length}</span> klijenata.{" "}
        <Link href="/hub/projects" className="text-primary hover:underline">
          Idi na projekte
        </Link>
      </p>

      <ClientFormDialog open={dialogOpen} onOpenChange={setDialogOpen} client={editing} onSaved={refresh} />
      <DeleteClientDialog
        client={toDelete}
        open={toDelete !== null}
        onOpenChange={(open) => !open && setToDelete(null)}
        onDeleted={refresh}
      />
    </div>
  )
}
