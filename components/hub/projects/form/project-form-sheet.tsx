"use client"

import * as React from "react"
import { RiFolderAddLine, RiLoader4Line } from "@remixicon/react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { createProjectAction, getProjectDetailAction, updateProjectAction } from "@/lib/hub/actions/projects"
import { PROJECT_STATUSES, type ProjectStatus } from "@/lib/hub/constants"
import { canManageClients, canSetProjectStatus, type ProjectPermissions } from "@/lib/hub/permissions"
import { isRecurringType } from "@/lib/hub/retainer"
import { isParticipant } from "@/lib/hub/participation"
import type { HubClient, HubMember, HubTeam, HubUser } from "@/lib/hub/types"
import { ProjectFormFields } from "./project-form-fields"
import {
  emptyProjectValues,
  parseBudget,
  toCreatePayload,
  toUpdatePayload,
  valuesFromProject,
  type ProjectFormField,
  type ProjectFormValues,
} from "./project-form-state"

export type ProjectFormTarget = { mode: "create" } | { mode: "edit"; projectId: string }

interface ProjectFormSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  target: ProjectFormTarget
  members: HubMember[]
  teams: HubTeam[]
  clients: HubClient[]
  currentUser: HubUser
  userTeamIds: string[]
  onSaved: () => void
}

interface FormBodyProps extends Omit<ProjectFormSheetProps, "open" | "onOpenChange"> {
  onClose: () => void
}

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; initial: ProjectFormValues; permissions: ProjectPermissions | null }

function useProjectSource(target: ProjectFormTarget): LoadState {
  const [state, setState] = React.useState<LoadState>({ status: "loading" })

  React.useEffect(() => {
    if (target.mode !== "edit") return
    let cancelled = false
    getProjectDetailAction(target.projectId).then((result) => {
      if (cancelled) return
      setState(
        result.success
          ? { status: "ready", initial: valuesFromProject(result.data.project), permissions: result.data.permissions }
          : { status: "error", message: result.error }
      )
    })
    return () => {
      cancelled = true
    }
  }, [target])

  return state
}

/** Creating needs no data; editing first loads the full project (the list only has summary rows). */
function ProjectFormLoader(props: FormBodyProps) {
  const { target, currentUser } = props
  const source = useProjectSource(target)

  if (target.mode === "create") {
    const firstAllowed =
      PROJECT_STATUSES.find((status) => canSetProjectStatus(currentUser.role, status, true)) ?? "offer_sent"
    return (
      <ProjectFormEditor
        {...props}
        initial={emptyProjectValues({ leadId: currentUser.id, status: firstAllowed })}
        permissions={null}
      />
    )
  }

  if (source.status === "loading") {
    return (
      <div className="flex flex-1 items-center justify-center text-muted-foreground">
        <RiLoader4Line className="size-6 animate-spin" />
      </div>
    )
  }
  if (source.status === "error") return <div className="p-6 text-sm text-destructive">{source.message}</div>

  return <ProjectFormEditor {...props} initial={source.initial} permissions={source.permissions} />
}

interface EditorProps extends FormBodyProps {
  initial: ProjectFormValues
  permissions: ProjectPermissions | null
}

function ProjectFormEditor({
  target,
  members,
  teams,
  clients,
  currentUser,
  userTeamIds,
  onSaved,
  onClose,
  initial,
  permissions,
}: EditorProps) {
  const isCreate = target.mode === "create"
  const [values, setValues] = React.useState<ProjectFormValues>(initial)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const editable = permissions?.editableFields
  const canEdit = (field: ProjectFormField) =>
    isCreate || editable === "all" || (Array.isArray(editable) && editable.includes(field))
  const isReadOnly = !isCreate && Array.isArray(editable) && editable.length === 0

  const onChange = <K extends ProjectFormField>(field: K, value: ProjectFormValues[K]) =>
    setValues((current) => ({ ...current, [field]: value }))

  const allowedStatuses: ProjectStatus[] = PROJECT_STATUSES.filter((status) =>
    canSetProjectStatus(currentUser.role, status, isParticipant(values, currentUser.id, userTeamIds))
  )

  const validate = (): string | null => {
    if (!values.name.trim()) return "Naziv projekta je obavezan."
    if (!values.client_name.trim()) return "Naziv klijenta je obavezan."
    if (!values.lead_id) return "Odaberite voditelja projekta."
    if (isRecurringType(values.type)) {
      const months = parseBudget(values.contract_months)
      const quota = parseBudget(values.weekly_quota)
      const fee = parseBudget(values.monthly_fee)
      if (!values.contract_start_date) return "Unesite datum početka ugovora."
      if (!Number.isInteger(months) || months < 1 || months > 36) return "Trajanje ugovora mora biti od 1 do 36 mjeseci."
      if (Number.isNaN(fee) || fee < 0) return "Unesite ispravnu mjesečnu naknadu."
      if (!Number.isInteger(quota) || quota < 1 || quota > 50) return "Unesite broj objava sedmično (1 do 50)."
    } else {
      const budget = parseBudget(values.budget)
      if (Number.isNaN(budget) || budget < 0) return "Unesite ispravnu vrijednost projekta."
    }
    if (isCreate && !allowedStatuses.includes(values.status)) return "Nemate dozvolu za odabrani početni status."
    return null
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    const problem = validate()
    if (problem) return setError(problem)

    setError(null)

    let payload: Record<string, unknown>
    if (isCreate) payload = toCreatePayload(values)
    else {
      payload = toUpdatePayload(initial, values, canEdit)
      if (Object.keys(payload).length === 0) return onClose()
    }

    setIsSubmitting(true)
    const result = isCreate
      ? await createProjectAction(payload)
      : await updateProjectAction((target as { projectId: string }).projectId, payload)
    setIsSubmitting(false)

    if (!result.success) return setError(result.error)

    toast.success(isCreate ? "Projekat je kreiran." : "Izmjene su sačuvane.")
    onSaved()
    onClose()
  }

  return (
    <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6">
        {error && (
          <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-3.5 text-sm text-destructive">
            {error}
          </div>
        )}
        {isReadOnly && (
          <div className="rounded-xl border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
            Imate samo pregled ovog projekta.
          </div>
        )}
        <ProjectFormFields
          values={values}
          onChange={onChange}
          canEdit={canEdit}
          mode={isCreate ? "create" : "edit"}
          allowedStatuses={allowedStatuses}
          members={members}
          teams={teams}
          clients={clients}
          canSaveClient={canManageClients(currentUser.role)}
        />
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-border bg-muted/20 px-6 py-4">
        <Button type="button" variant="outline" size="sm" disabled={isSubmitting} onClick={onClose} className="cursor-pointer">
          {isReadOnly ? "Zatvori" : "Odustani"}
        </Button>
        {!isReadOnly && (
          <Button type="submit" size="sm" disabled={isSubmitting} className="cursor-pointer gap-1.5">
            {isSubmitting ? (
              <>
                <RiLoader4Line className="size-4 animate-spin" />
                Čuvanje...
              </>
            ) : isCreate ? (
              "Kreiraj projekat"
            ) : (
              "Sačuvaj izmjene"
            )}
          </Button>
        )}
      </div>
    </form>
  )
}

export function ProjectFormSheet({ open, onOpenChange, ...bodyProps }: ProjectFormSheetProps) {
  const isCreate = bodyProps.target.mode === "create"

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex h-full w-full flex-col overflow-hidden border-l border-border bg-card p-0 sm:max-w-2xl"
      >
        <SheetHeader className="border-b border-border bg-muted/20 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary/10 p-2 text-primary">
              <RiFolderAddLine className="size-5" />
            </div>
            <div>
              <SheetTitle className="text-lg font-bold">{isCreate ? "Novi projekat" : "Podaci o projektu"}</SheetTitle>
              <SheetDescription className="mt-0.5 text-xs text-muted-foreground">
                {isCreate
                  ? "Unesite osnovne podatke, klijenta, vrijednost projekta i tim."
                  : "Izmijenite polja i sačuvajte promjene."}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        {/* Remounted per target so a previous project's values never leak into the next one. */}
        {open && (
          <ProjectFormLoader
            key={bodyProps.target.mode === "edit" ? bodyProps.target.projectId : "new"}
            {...bodyProps}
            onClose={() => onOpenChange(false)}
          />
        )}
      </SheetContent>
    </Sheet>
  )
}
