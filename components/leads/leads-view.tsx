"use client"

import * as React from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import type { Lead } from "@/lib/appwrite/leads"
import type { Company } from "@/lib/appwrite/companies"
import { LeadsTable } from "./leads-table"
import { LeadsKanbanBoard } from "./leads-kanban-board"
import { LeadSheet } from "./lead-sheet"
import { DeleteLeadDialog } from "./delete-lead-dialog"
import { Button } from "@/components/ui/button"
import {
  RiTableLine,
  RiKanbanView,
  RiAddLine,
  RiSearchLine,
} from "@remixicon/react"
import { Input } from "@/components/ui/input"

interface LeadsViewProps {
  leads: Lead[]
  companies: Company[]
  total: number
  page: number
  limit: number
  totalPages: number
  status: string
  searchQuery?: string
}

export function LeadsView({
  leads,
  companies,
  total,
  page,
  limit,
  totalPages,
  status,
  searchQuery = "",
}: LeadsViewProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const currentView = searchParams.get("view") || "table"

  // Sheet & Dialog states
  const [sheetOpen, setSheetOpen] = React.useState(false)
  const [sheetMode, setSheetMode] = React.useState<"create" | "edit" | "view">("create")
  const [selectedLead, setSelectedLead] = React.useState<Lead | null>(null)
  const [initialLeadStatus, setInitialLeadStatus] = React.useState<string>("Novi")

  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
  const [leadToDelete, setLeadToDelete] = React.useState<Lead | null>(null)

  const [searchTerm, setSearchTerm] = React.useState(searchQuery)
  const debounceTimerRef = React.useRef<NodeJS.Timeout | null>(null)

  const setView = (view: "table" | "kanban") => {
    const params = new URLSearchParams(searchParams.toString())
    if (view === "table") {
      params.delete("view")
    } else {
      params.set("view", "kanban")
    }
    router.push(`${pathname}?${params.toString()}`)
  }

  // Keep state in sync if URL search param changes
  React.useEffect(() => {
    setSearchTerm(searchQuery)
  }, [searchQuery])

  const normalize = (str: string) =>
    (str || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/["'„”«»\-_.,()]/g, " ")
      .replace(/\s+/g, " ")
      .trim()

  const handleSearchChange = (val: string) => {
    setSearchTerm(val)

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    debounceTimerRef.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString())
      if (val.trim()) {
        params.set("search", val.trim())
      } else {
        params.delete("search")
      }
      params.set("page", "1")
      router.push(`${pathname}?${params.toString()}`)
    }, 400)
  }

  // Instant normalized client-side filtering
  const filteredLeads = React.useMemo(() => {
    if (!searchTerm.trim()) return leads

    const q = normalize(searchTerm)
    return leads.filter((lead) => {
      const companyObj =
        typeof lead.company === "object" && lead.company
          ? lead.company
          : companies.find((c) => c.$id === lead.company)

      const companyName = normalize(companyObj?.company_name || "")
      const companyCity = normalize(companyObj?.city || "")
      const statusText = normalize(lead.status || "")
      const analysisText = normalize((lead.analysis || []).join(" "))

      return (
        companyName.includes(q) ||
        companyCity.includes(q) ||
        statusText.includes(q) ||
        analysisText.includes(q)
      )
    })
  }, [leads, companies, searchTerm])

  const displayTotal = searchTerm.trim() ? filteredLeads.length : total
  const displayTotalPages = searchTerm.trim()
    ? Math.max(1, Math.ceil(filteredLeads.length / limit))
    : totalPages

  const openCreateSheet = (initialStatus = "Novi") => {
    setSelectedLead(null)
    setInitialLeadStatus(initialStatus)
    setSheetMode("create")
    setSheetOpen(true)
  }

  const openViewSheet = (lead: Lead) => {
    setSelectedLead(lead)
    setSheetMode("view")
    setSheetOpen(true)
  }

  const openEditSheet = (lead: Lead) => {
    setSelectedLead(lead)
    setSheetMode("edit")
    setSheetOpen(true)
  }

  const openDeleteDialog = (lead: Lead) => {
    setLeadToDelete(lead)
    setDeleteDialogOpen(true)
  }

  const handleActionSuccess = () => {
    router.refresh()
  }

  return (
    <div className="space-y-4 w-full min-w-0 max-w-full">
      {/* Top Bar: View Switcher & Actions */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-2">
        {/* View Switcher Tabs */}
        <div className="inline-flex p-1 rounded-xl bg-muted border border-border self-start">
          <button
            type="button"
            onClick={() => setView("table")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer ${
              currentView === "table"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <RiTableLine className="size-3.5" />
            <span>Tabela</span>
          </button>

          <button
            type="button"
            onClick={() => setView("kanban")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer ${
              currentView === "kanban"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <RiKanbanView className="size-3.5" />
            <span>Scrum Board</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative flex-1 max-w-sm ml-0 sm:ml-2">
          <RiSearchLine className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <Input
            type="search"
            placeholder="Pretraži po firmi, gradu, analizi..."
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-8 h-9 text-xs w-full bg-background"
          />
        </div>

        {/* Action Button */}
        <Button
          size="sm"
          onClick={() => openCreateSheet()}
          className="gap-1.5 cursor-pointer shadow-xs self-end sm:self-auto"
        >
          <RiAddLine className="size-4" />
          <span>Dodaj lead</span>
        </Button>
      </div>

      {/* Main View Content */}
      {currentView === "kanban" ? (
        <LeadsKanbanBoard
          leads={filteredLeads}
          companies={companies}
          onOpenView={openViewSheet}
          onOpenEdit={openEditSheet}
          onOpenDelete={openDeleteDialog}
          onOpenCreate={(status) => openCreateSheet(status)}
          onDataChange={handleActionSuccess}
        />
      ) : (
        <LeadsTable
          leads={filteredLeads}
          companies={companies}
          total={displayTotal}
          page={page}
          limit={limit}
          totalPages={displayTotalPages}
          status={status}
          onOpenView={openViewSheet}
          onOpenEdit={openEditSheet}
          onOpenDelete={openDeleteDialog}
          onOpenCreate={() => openCreateSheet()}
        />
      )}

      {/* Slide-over Sheet (Create, Edit, View) */}
      <LeadSheet
        lead={
          selectedLead ||
          (sheetMode === "create" && initialLeadStatus !== "Novi"
            ? ({ $id: "", $createdAt: "", $updatedAt: "", status: initialLeadStatus } as Lead)
            : null)
        }
        companies={companies}
        mode={sheetMode}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onSuccess={handleActionSuccess}
        onSwitchToEdit={() => setSheetMode("edit")}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteLeadDialog
        lead={leadToDelete}
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onSuccess={handleActionSuccess}
      />
    </div>
  )
}
