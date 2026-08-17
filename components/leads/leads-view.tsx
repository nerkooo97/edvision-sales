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
} from "@remixicon/react"

interface LeadsViewProps {
  leads: Lead[]
  companies: Company[]
  total: number
  page: number
  limit: number
  totalPages: number
  status: string
}

export function LeadsView({
  leads,
  companies,
  total,
  page,
  limit,
  totalPages,
  status,
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

  const setView = (view: "table" | "kanban") => {
    const params = new URLSearchParams(searchParams.toString())
    if (view === "table") {
      params.delete("view")
    } else {
      params.set("view", "kanban")
    }
    router.push(`${pathname}?${params.toString()}`)
  }

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
          leads={leads}
          companies={companies}
          onOpenView={openViewSheet}
          onOpenEdit={openEditSheet}
          onOpenDelete={openDeleteDialog}
          onOpenCreate={(status) => openCreateSheet(status)}
          onDataChange={handleActionSuccess}
        />
      ) : (
        <LeadsTable
          leads={leads}
          companies={companies}
          total={total}
          page={page}
          limit={limit}
          totalPages={totalPages}
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
