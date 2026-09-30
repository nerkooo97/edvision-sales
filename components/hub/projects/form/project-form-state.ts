import type { ProjectPriority, ProjectStatus, ProjectType } from "@/lib/hub/constants"
import { toDateInputValue } from "@/lib/hub/format"
import { isRecurringType } from "@/lib/hub/retainer"
import type { HubProject } from "@/lib/hub/types"

/** Everything the project form edits, as plain strings/arrays so inputs stay controlled. */
export interface ProjectFormValues {
  name: string
  client_name: string
  client_contact: string
  client_email: string
  client_phone: string
  type: ProjectType
  budget: string
  priority: ProjectPriority
  status: ProjectStatus
  lead_id: string
  /** Id of the saved client the project is linked to; '' = none (a one-off client typed into the form). */
  client_id: string
  /** Ask the server to save the typed client into the client base and link it. */
  save_client: boolean
  member_ids: string[]
  team_ids: string[]
  offer_date: string
  agreement_date: string
  start_date: string
  planned_deadline: string
  completion_date: string
  invoice_date: string
  contract_number: string
  contract_url: string
  proposal_url: string
  invoice_number: string
  description: string
  notes: string
  // Recurring service (social media): only used while the project type is recurring.
  contract_start_date: string
  contract_months: string
  monthly_fee: string
  weekly_quota: string
  extra_post_price: string
}

export type ProjectFormField = keyof ProjectFormValues

export function emptyProjectValues(defaults: { leadId: string; status: ProjectStatus }): ProjectFormValues {
  return {
    name: "",
    client_name: "",
    client_contact: "",
    client_email: "",
    client_phone: "",
    type: "website",
    budget: "",
    priority: "medium",
    status: defaults.status,
    lead_id: defaults.leadId,
    client_id: "",
    save_client: true,
    member_ids: [],
    team_ids: [],
    offer_date: new Date().toISOString().slice(0, 10),
    agreement_date: "",
    start_date: "",
    planned_deadline: "",
    completion_date: "",
    invoice_date: "",
    contract_number: "",
    contract_url: "",
    proposal_url: "",
    invoice_number: "",
    description: "",
    notes: "",
    contract_start_date: "",
    contract_months: "6",
    monthly_fee: "",
    weekly_quota: "",
    extra_post_price: "",
  }
}

export function valuesFromProject(project: HubProject): ProjectFormValues {
  return {
    name: project.name,
    client_name: project.client_name,
    client_contact: project.client_contact ?? "",
    client_email: project.client_email ?? "",
    client_phone: project.client_phone ?? "",
    type: project.type,
    budget: String(project.budget),
    priority: project.priority,
    status: project.status,
    lead_id: project.lead_id,
    client_id: project.client_id ?? "",
    save_client: false,
    member_ids: project.member_ids,
    team_ids: project.team_ids,
    offer_date: toDateInputValue(project.offer_date),
    agreement_date: toDateInputValue(project.agreement_date),
    start_date: toDateInputValue(project.start_date),
    planned_deadline: toDateInputValue(project.planned_deadline),
    completion_date: toDateInputValue(project.completion_date),
    invoice_date: toDateInputValue(project.invoice_date),
    contract_number: project.contract_number ?? "",
    contract_url: project.contract_url ?? "",
    proposal_url: project.proposal_url ?? "",
    invoice_number: project.invoice_number ?? "",
    description: project.description ?? "",
    notes: project.notes ?? "",
    contract_start_date: toDateInputValue(project.contract_start_date),
    contract_months: project.contract_months === null ? "" : String(project.contract_months),
    monthly_fee: project.monthly_fee === null ? "" : String(project.monthly_fee),
    weekly_quota: project.weekly_quota === null ? "" : String(project.weekly_quota),
    extra_post_price: project.extra_post_price === null ? "" : String(project.extra_post_price),
  }
}

/** The budget input is type="number", so the text is always dot-decimal; an empty field is NaN (invalid). */
export function parseBudget(text: string): number {
  const trimmed = text.trim()
  return trimmed ? Number(trimmed) : NaN
}

const CONTRACT_NUMBER_FIELDS: ProjectFormField[] = ["contract_months", "monthly_fee", "weekly_quota", "extra_post_price"]

function numberOrNull(text: string): number | null {
  const parsed = parseBudget(text)
  return Number.isNaN(parsed) ? null : parsed
}

/** Total contract value for a recurring service: monthly fee times months (the server recomputes it). */
export function contractTotal(values: Pick<ProjectFormValues, "monthly_fee" | "contract_months">): number {
  const fee = numberOrNull(values.monthly_fee) ?? 0
  const months = numberOrNull(values.contract_months) ?? 0
  return Math.round(fee * months * 100) / 100
}

function toPayloadValue(field: ProjectFormField, values: ProjectFormValues): unknown {
  const recurring = isRecurringType(values.type)
  // An ordinary project has no contract, so its contract fields are cleared (e.g. after changing the type).
  if (field === "contract_start_date") return recurring ? values.contract_start_date : ""
  if (CONTRACT_NUMBER_FIELDS.includes(field)) return recurring ? numberOrNull(values[field] as string) : null
  if (field === "budget") return recurring ? contractTotal(values) : parseBudget(values.budget)
  if (field === "client_id") return values.client_id || null
  // Saving only makes sense while no saved client is chosen.
  if (field === "save_client") return values.save_client && !values.client_id
  return values[field]
}

/** Payload for creating a project: every field, with the server applying its own validation. */
export function toCreatePayload(values: ProjectFormValues): Record<string, unknown> {
  const payload: Record<string, unknown> = {}
  for (const field of Object.keys(values) as ProjectFormField[]) payload[field] = toPayloadValue(field, values)
  return payload
}

/**
 * Payload for editing: only fields that changed and that the user may edit. Status is never sent
 * (it has its own action), and unchanged fields are left out so the activity log stays meaningful.
 */
export function toUpdatePayload(
  initial: ProjectFormValues,
  current: ProjectFormValues,
  canEdit: (field: ProjectFormField) => boolean
): Record<string, unknown> {
  const payload: Record<string, unknown> = {}
  for (const field of Object.keys(current) as ProjectFormField[]) {
    if (field === "status" || !canEdit(field)) continue
    // Compare what would be sent, not the raw inputs: switching the type clears hidden contract fields.
    const next = toPayloadValue(field, current)
    if (JSON.stringify(toPayloadValue(field, initial)) === JSON.stringify(next)) continue
    payload[field] = next
  }
  return payload
}
