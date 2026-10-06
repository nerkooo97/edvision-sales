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
import { deleteMarketingContractAction, setMarketingMonthsAction } from "@/lib/hub/actions/marketing-contracts"
import { hasMonth, MONTH_SHORT_NAMES, toggleMonth } from "@/lib/hub/maintenance"
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

  // Month clicks change the grid at once; only the months are written, and nothing else is reloaded.
  // A reload of the lists (after any other change) drops these local values, since the lists are fresh then.
  const [monthsById, setMonthsById] = React.useState<Map<string, number>>(new Map())
  const [listsShown, setListsShown] = React.useState(marketing)
  if (listsShown !== marketing) {
    setListsShown(marketing)
    setMonthsById(new Map())
  }
  const setLocalMonths = (id: string, months: number) =>
    setMonthsById((current) => new Map(current).set(id, months))

  // Search by client name (and domain or service on the website list); the data is small, so it is filtered here.
  const nameOf = (clientId: string) => clientNames.get(clientId) ?? ""
  const marketingNow = React.useMemo(
    () => marketing.map((c) => (monthsById.has(c.$id) ? { ...c, months: monthsById.get(c.$id)! } : c)),
    [marketing, monthsById]
  )
  const shownMarketing = search.trim()
    ? marketingNow.filter((c) => matchesQuery(`${nameOf(c.client_id)} ${c.service}`, search))
    : marketingNow
  const shownMaintenance = search.trim()
    ? maintenance.filter((c) => matchesQuery(`${nameOf(c.client_id)} ${c.domain ?? ""} ${c.service}`, search))
    : maintenance

  // "This month" is outlined in the grid only for the current year, where it means something.
  const now = new Date()
  const currentMonth = year === now.getFullYear() ? now.getMonth() : null
  const [savingId, setSavingId] = React.useState<string | null>(null)

  const toggleContractMonth = async (contract: HubMarketingContract, month: number) => {
    if (savingId) return
    const before = monthsById.get(contract.$id) ?? contract.months
    const after = toggleMonth(before, month)
    setLocalMonths(contract.$id, after)
    setSavingId(contract.$id)
    const result = await setMarketingMonthsAction(contract.$id, after)
    setSavingId(null)

    if (!result.success) {
      setLocalMonths(contract.$id, before)
      return toast.error(result.error)
    }
    toast.success(`${hasMonth(after, month) ? "Dodan" : "Uklonjen"} mjesec: ${MONTH_SHORT_NAMES[month]}`)
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
              onToggleMonth={toggleContractMonth}
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
