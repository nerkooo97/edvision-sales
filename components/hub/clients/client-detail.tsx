"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  RiArrowLeftLine,
  RiBuilding2Line,
  RiDeleteBinLine,
  RiEditLine,
  RiExternalLinkLine,
  RiMailLine,
  RiMapPinLine,
  RiPhoneLine,
} from "@remixicon/react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { updateClientAction } from "@/lib/hub/actions/clients"
import { FINISHED_STATUSES } from "@/lib/hub/constants"
import { formatKm, toSafeWebUrl } from "@/lib/hub/format"
import type { HubClient, HubProjectSummary } from "@/lib/hub/types"
import { formatDate } from "@/lib/utils"
import { StatusBadge } from "../projects/project-badges"
import { ClientFormDialog } from "./client-form-dialog"
import { DeleteClientDialog } from "./delete-client-dialog"

interface ClientDetailProps {
  client: HubClient
  projects: HubProjectSummary[]
  canManage: boolean
  canDelete: boolean
  /** Project values are shown only to those who may see project money. */
  canViewMoney: boolean
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <span className="block text-xs text-muted-foreground">{label}</span>
      <span className="font-mono text-xl font-bold tabular-nums">{value}</span>
    </div>
  )
}

export function ClientDetail({ client, projects, canManage, canDelete, canViewMoney }: ClientDetailProps) {
  const router = useRouter()
  const refresh = () => router.refresh()

  const [editOpen, setEditOpen] = React.useState(false)
  const [deleteOpen, setDeleteOpen] = React.useState(false)

  const totalValue = projects.reduce((sum, project) => sum + project.budget, 0)
  const activeCount = projects.filter((project) => !FINISHED_STATUSES.includes(project.status)).length
  const website = toSafeWebUrl(client.website)
  const place = [client.address, client.city].filter(Boolean).join(", ")

  const toggleActive = async () => {
    const result = await updateClientAction(client.$id, { is_active: !client.is_active })
    if (!result.success) return toast.error(result.error)
    toast.success(client.is_active ? "Klijent je deaktiviran." : "Klijent je aktiviran.")
    refresh()
  }

  return (
    <div className="space-y-6">
      <Link
        href="/hub/clients"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <RiArrowLeftLine className="size-3.5" />
        Nazad na klijente
      </Link>

      <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-2">
          <h2 className="flex flex-wrap items-center gap-2 text-2xl font-bold tracking-tight">
            <RiBuilding2Line className="size-6 text-primary" />
            {client.name}
            {!client.is_active && <Badge variant="outline">Neaktivan</Badge>}
          </h2>
          {client.contact_person && <p className="text-sm text-muted-foreground">Kontakt: {client.contact_person}</p>}
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm">
            {client.email && (
              <a href={`mailto:${client.email}`} className="inline-flex items-center gap-1 text-primary hover:underline">
                <RiMailLine className="size-3.5" />
                {client.email}
              </a>
            )}
            {client.phone && (
              <a href={`tel:${client.phone}`} className="inline-flex items-center gap-1 text-primary hover:underline">
                <RiPhoneLine className="size-3.5" />
                {client.phone}
              </a>
            )}
            {website && (
              <a
                href={website}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-primary hover:underline"
              >
                {client.website}
                <RiExternalLinkLine className="size-3.5" />
              </a>
            )}
            {place && (
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                <RiMapPinLine className="size-3.5" />
                {place}
              </span>
            )}
            {client.tax_id && <span className="font-mono text-muted-foreground">JIB/PDV: {client.tax_id}</span>}
          </div>
          {client.notes && <p className="max-w-2xl text-sm whitespace-pre-line text-muted-foreground">{client.notes}</p>}
        </div>

        {canManage && (
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => setEditOpen(true)} className="cursor-pointer gap-1.5">
              <RiEditLine className="size-4" />
              Uredi
            </Button>
            <Button size="sm" variant="outline" onClick={toggleActive} className="cursor-pointer">
              {client.is_active ? "Deaktiviraj" : "Aktiviraj"}
            </Button>
            {canDelete && projects.length === 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setDeleteOpen(true)}
                className="cursor-pointer gap-1.5 text-destructive hover:text-destructive"
              >
                <RiDeleteBinLine className="size-4" />
                Obriši
              </Button>
            )}
          </div>
        )}
      </div>

      <div className={`grid gap-4 ${canViewMoney ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
        <Stat label="Projekata ukupno" value={String(projects.length)} />
        <Stat label="U toku" value={String(activeCount)} />
        {canViewMoney && <Stat label="Ukupna vrijednost" value={formatKm(totalValue)} />}
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold">Projekti klijenta</h3>
        <div className="w-full max-w-full overflow-hidden rounded-xl border border-border bg-card">
          <Table className="min-w-[700px]">
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-transparent">
                {["Šifra", "Projekat", "Status", "Rok", ...(canViewMoney ? ["Vrijednost"] : [])].map((label, index) => (
                  <TableHead
                    key={label}
                    className={`text-xs font-semibold tracking-wider text-muted-foreground uppercase ${index === 4 ? "text-right" : ""}`}
                  >
                    {label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={canViewMoney ? 5 : 4} className="h-24 text-center text-sm text-muted-foreground">
                    Za ovog klijenta još nema projekata.
                  </TableCell>
                </TableRow>
              ) : (
                projects.map((project) => (
                  <TableRow
                    key={project.$id}
                    className="cursor-pointer hover:bg-muted/40"
                    onClick={() => router.push(`/hub/projects/${project.$id}`)}
                  >
                    <TableCell className="font-mono text-xs text-muted-foreground">{project.code}</TableCell>
                    <TableCell className="text-sm font-semibold">{project.name}</TableCell>
                    <TableCell>
                      <StatusBadge status={project.status} />
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{formatDate(project.planned_deadline)}</TableCell>
                    {canViewMoney && (
                      <TableCell className="text-right font-mono text-sm font-semibold tabular-nums">
                        {formatKm(project.budget)}
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <ClientFormDialog open={editOpen} onOpenChange={setEditOpen} client={client} onSaved={refresh} />
      <DeleteClientDialog
        client={client}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onDeleted={() => router.push("/hub/clients")}
      />
    </div>
  )
}
