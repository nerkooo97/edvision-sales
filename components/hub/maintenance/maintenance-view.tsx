"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { RiAddLine, RiFileList3Line, RiSearchLine } from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { deleteMaintenanceContractAction } from "@/lib/hub/actions/maintenance-contracts"
import { deleteMarketingContractAction, updateMarketingContractAction } from "@/lib/hub/actions/marketing-contracts"
import { toDateInputValue } from "@/lib/hub/format"
import { MONTH_SHORT_NAMES, toggleMonth } from "@/lib/hub/maintenance"
import type { HubClientOption, HubMaintenanceContract, HubMarketingContract } from "@/lib/hub/types"
import { DeleteContractDialog } from "./delete-contract-dialog"
import { MaintenanceDialog } from "./maintenance-dialog"
import { MaintenanceTable } from "./maintenance-table"
import { matchesQuery } from "./option-list"
import { MarketingDialog } from "./marketing-dialog"
import { MarketingTable } from "./marketing-table"

interface MaintenanceViewProps {
  marketing: HubMarketingContract[]
  maintenance: HubMaintenanceContract[]
  clients: HubClientOption[]
  year: number
  years: number[]
  /** Admin, account manager and project lead may add, edit and delete; everyone else only looks. */
  canManage: boolean
}

function EmptyState({ text, canManage }: { text: string; canManage: boolean }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-14 text-center text-muted-foreground">
      <RiFileList3Line className="size-8 opacity-40" />
      <p className="text-sm font-medium text-foreground">{text}</p>
      {canManage && <p className="text-xs">Kliknite na &apos;Novi ugovor&apos; za unos prvog.</p>}
    </div>
  )
}

export function MaintenanceView({ marketing, maintenance, clients, year, years, canManage }: MaintenanceViewProps) {
  const router = useRouter()
  const refresh = () => router.refresh()

  const [tab, setTab] = React.useState("marketing")
  const [search, setSearch] = React.useState("")
  const [marketingDialogOpen, setMarketingDialogOpen] = React.useState(false)
  const [editingMarketing, setEditingMarketing] = React.useState<HubMarketingContract | null>(null)
  const [deletingMarketing, setDeletingMarketing] = React.useState<HubMarketingContract | null>(null)
  const [maintenanceDialogOpen, setMaintenanceDialogOpen] = React.useState(false)
  const [editingMaintenance, setEditingMaintenance] = React.useState<HubMaintenanceContract | null>(null)
  const [deletingMaintenance, setDeletingMaintenance] = React.useState<HubMaintenanceContract | null>(null)

  const clientNames = React.useMemo(() => new Map(clients.map((client) => [client.$id, client.name])), [clients])

  // Search by client name (and domain or service on the website list); the data is small, so it is filtered here.
  const nameOf = (clientId: string) => clientNames.get(clientId) ?? ""
  const shownMarketing = search.trim()
    ? marketing.filter((c) => matchesQuery(`${nameOf(c.client_id)} ${c.service}`, search))
    : marketing
  const shownMaintenance = search.trim()
    ? maintenance.filter((c) => matchesQuery(`${nameOf(c.client_id)} ${c.domain ?? ""} ${c.service}`, search))
    : maintenance

  // The quick add only exists for the current year, where "this month" is meaningful.
  const now = new Date()
  const currentMonth = year === now.getFullYear() ? now.getMonth() : null
  const [savingId, setSavingId] = React.useState<string | null>(null)

  const addCurrentMonth = async (contract: HubMarketingContract) => {
    if (currentMonth === null) return
    setSavingId(contract.$id)
    const result = await updateMarketingContractAction(contract.$id, {
      client_id: contract.client_id,
      category: contract.category,
      service: contract.service,
      contract_status: contract.contract_status,
      contract_start: toDateInputValue(contract.contract_start),
      contract_end: toDateInputValue(contract.contract_end),
      year: contract.year,
      months: toggleMonth(contract.months, currentMonth),
    })
    setSavingId(null)

    if (!result.success) return toast.error(result.error)
    toast.success(`Dodan mjesec: ${MONTH_SHORT_NAMES[currentMonth]}`)
    refresh()
  }

  const openMarketing = (contract: HubMarketingContract | null) => {
    setEditingMarketing(contract)
    setMarketingDialogOpen(true)
  }
  const openMaintenance = (contract: HubMaintenanceContract | null) => {
    setEditingMaintenance(contract)
    setMaintenanceDialogOpen(true)
  }

  return (
    <>
      <Tabs value={tab} onValueChange={setTab} className="gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TabsList>
            <TabsTrigger value="marketing" className="cursor-pointer">
              Digitalni marketing
            </TabsTrigger>
            <TabsTrigger value="web" className="cursor-pointer">
              Održavanje web stranica
            </TabsTrigger>
          </TabsList>

          <div className="relative w-full sm:ml-auto sm:max-w-xs">
            <RiSearchLine className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={tab === "marketing" ? "Pretraži po klijentu, usluzi..." : "Pretraži po klijentu, domeni..."}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="h-9 bg-background pl-9"
            />
          </div>

          <div className="flex items-center gap-2">
            {tab === "marketing" && (
              <Select value={String(year)} onValueChange={(value) => router.push(`?year=${value}`)}>
                <SelectTrigger className="w-28" aria-label="Godina">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((item) => (
                    <SelectItem key={item} value={String(item)}>
                      {item}.
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {canManage && (
              <Button
                size="sm"
                onClick={() => (tab === "marketing" ? openMarketing(null) : openMaintenance(null))}
                className="cursor-pointer gap-1.5 shadow-xs"
              >
                <RiAddLine className="size-4" />
                Novi ugovor
              </Button>
            )}
          </div>
        </div>

        <TabsContent value="marketing">
          {marketing.length === 0 ? (
            <EmptyState text={`Nema ugovora za ${year}. godinu`} canManage={canManage} />
          ) : shownMarketing.length === 0 ? (
            <EmptyState text="Nema rezultata pretrage" canManage={false} />
          ) : (
            <MarketingTable
              contracts={shownMarketing}
              clientNames={clientNames}
              canManage={canManage}
              onEdit={openMarketing}
              onDelete={setDeletingMarketing}
              currentMonth={currentMonth}
              savingId={savingId}
              onAddCurrentMonth={addCurrentMonth}
            />
          )}
        </TabsContent>

        <TabsContent value="web">
          {maintenance.length === 0 ? (
            <EmptyState text="Još nema ugovora o održavanju" canManage={canManage} />
          ) : shownMaintenance.length === 0 ? (
            <EmptyState text="Nema rezultata pretrage" canManage={false} />
          ) : (
            <MaintenanceTable
              contracts={shownMaintenance}
              clientNames={clientNames}
              canManage={canManage}
              onEdit={openMaintenance}
              onDelete={setDeletingMaintenance}
            />
          )}
        </TabsContent>
      </Tabs>

      <MarketingDialog
        open={marketingDialogOpen}
        onOpenChange={setMarketingDialogOpen}
        contract={editingMarketing}
        clients={clients}
        year={year}
        onSaved={refresh}
      />
      <MaintenanceDialog
        open={maintenanceDialogOpen}
        onOpenChange={setMaintenanceDialogOpen}
        contract={editingMaintenance}
        clients={clients}
        onSaved={refresh}
      />
      <DeleteContractDialog
        label={deletingMarketing ? (clientNames.get(deletingMarketing.client_id) ?? "") : null}
        onOpenChange={(open) => !open && setDeletingMarketing(null)}
        onConfirm={() => deleteMarketingContractAction(deletingMarketing?.$id)}
        onDeleted={refresh}
      />
      <DeleteContractDialog
        label={deletingMaintenance ? (clientNames.get(deletingMaintenance.client_id) ?? "") : null}
        onOpenChange={(open) => !open && setDeletingMaintenance(null)}
        onConfirm={() => deleteMaintenanceContractAction(deletingMaintenance?.$id)}
        onDeleted={refresh}
      />
    </>
  )
}
