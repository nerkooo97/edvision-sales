"use client"

import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  PROJECT_PRIORITIES,
  PROJECT_STATUSES,
  PROJECT_TYPES,
  type ProjectPriority,
  type ProjectStatus,
  type ProjectType,
} from "@/lib/hub/constants"
import { PRIORITY_LABELS, STATUS_LABELS, TYPE_LABELS } from "@/lib/hub/labels"
import { isRecurringType } from "@/lib/hub/retainer"
import type { HubClient, HubMember, HubTeam } from "@/lib/hub/types"
import { ChipPicker } from "./chip-picker"
import { ClientPicker } from "./client-picker"
import { ContractFields } from "./contract-fields"
import { FormField, FormSection } from "./form-field"
import type { ProjectFormField, ProjectFormValues } from "./project-form-state"

interface ProjectFormFieldsProps {
  values: ProjectFormValues
  onChange: <K extends ProjectFormField>(field: K, value: ProjectFormValues[K]) => void
  canEdit: (field: ProjectFormField) => boolean
  /** Creating a project also sets its first status; editing changes status elsewhere. */
  mode: "create" | "edit"
  allowedStatuses: readonly ProjectStatus[]
  members: HubMember[]
  teams: HubTeam[]
  clients: HubClient[]
  canSaveClient: boolean
}

export function ProjectFormFields({
  values,
  onChange,
  canEdit,
  mode,
  allowedStatuses,
  members,
  teams,
  clients,
  canSaveClient,
}: ProjectFormFieldsProps) {
  const text = (field: ProjectFormField, type = "text") => ({
    id: `project-${field}`,
    type,
    value: values[field] as string,
    disabled: !canEdit(field),
    onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      onChange(field, event.target.value as never),
  })

  const recurring = isRecurringType(values.type)
  const memberOptions = members.map((member) => ({ id: member.id, label: member.name }))
  const teamOptions = teams.map((team) => ({ id: team.$id, label: team.name }))

  return (
    <div className="space-y-6">
      <FormSection title="Osnovno">
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField label="Naziv projekta" htmlFor="project-name" required className="sm:col-span-2">
            <Input {...text("name")} placeholder="npr. Web stranica DZ Lukavac" maxLength={200} />
          </FormField>

          <FormField label="Tip projekta">
            <Select
              value={values.type}
              disabled={!canEdit("type")}
              onValueChange={(value) => onChange("type", value as ProjectType)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROJECT_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {TYPE_LABELS[type]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          <FormField label="Prioritet">
            <Select
              value={values.priority}
              disabled={!canEdit("priority")}
              onValueChange={(value) => onChange("priority", value as ProjectPriority)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROJECT_PRIORITIES.map((priority) => (
                  <SelectItem key={priority} value={priority}>
                    {PRIORITY_LABELS[priority]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          {mode === "create" && (
            <FormField label="Početni status">
              <Select value={values.status} onValueChange={(value) => onChange("status", value as ProjectStatus)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROJECT_STATUSES.map((status) => (
                    <SelectItem key={status} value={status} disabled={!allowedStatuses.includes(status)}>
                      {STATUS_LABELS[status]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          )}
        </div>
      </FormSection>

      <FormSection title="Klijent">
        <ClientPicker
          values={values}
          onChange={onChange}
          canEdit={canEdit("client_id")}
          clients={clients}
          canSaveClient={canSaveClient}
        />
      </FormSection>

      {recurring && (
        <FormSection title="Ugovor (stalna usluga)">
          <ContractFields values={values} onChange={onChange} canEdit={canEdit} />
        </FormSection>
      )}

      <FormSection title="Vrijednost i rokovi">
        <div className="grid gap-3 sm:grid-cols-2">
          {/* A recurring service gets its value and end date from the contract terms below. */}
          {!recurring && (
            <>
              <FormField label="Vrijednost projekta (KM)" htmlFor="project-budget" required>
                <Input {...text("budget", "number")} min={0} step="0.01" inputMode="decimal" placeholder="0" />
              </FormField>
              <FormField label="Planirani rok" htmlFor="project-planned_deadline">
                <Input {...text("planned_deadline", "date")} />
              </FormField>
            </>
          )}
          <FormField label="Datum ponude" htmlFor="project-offer_date">
            <Input {...text("offer_date", "date")} />
          </FormField>
          {mode === "edit" && (
            <>
              <FormField label="Datum dogovora" htmlFor="project-agreement_date">
                <Input {...text("agreement_date", "date")} />
              </FormField>
              <FormField label="Početak rada" htmlFor="project-start_date">
                <Input {...text("start_date", "date")} />
              </FormField>
              <FormField label="Stvarni završetak" htmlFor="project-completion_date">
                <Input {...text("completion_date", "date")} />
              </FormField>
              <FormField label="Datum fakture" htmlFor="project-invoice_date">
                <Input {...text("invoice_date", "date")} />
              </FormField>
            </>
          )}
        </div>
      </FormSection>

      <FormSection title="Tim">
        <div className="space-y-3">
          <FormField label="Voditelj projekta" required>
            <Select
              value={values.lead_id}
              disabled={!canEdit("lead_id")}
              onValueChange={(value) => onChange("lead_id", value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Odaberite voditelja" />
              </SelectTrigger>
              <SelectContent>
                {members.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          <FormField label="Članovi projekta">
            <ChipPicker
              options={memberOptions}
              selected={values.member_ids}
              onChange={(selected) => onChange("member_ids", selected)}
              disabled={!canEdit("member_ids")}
              emptyText="Nema korisnika s pristupom modulu."
            />
          </FormField>

          <FormField label="Timovi">
            <ChipPicker
              options={teamOptions}
              selected={values.team_ids}
              onChange={(selected) => onChange("team_ids", selected)}
              disabled={!canEdit("team_ids")}
              emptyText="Još nema kreiranih timova."
            />
          </FormField>
        </div>
      </FormSection>

      <FormSection title="Dokumenti i fakturisanje">
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField label="Broj ugovora" htmlFor="project-contract_number">
            <Input {...text("contract_number")} maxLength={100} />
          </FormField>
          <FormField label="Broj fakture" htmlFor="project-invoice_number">
            <Input {...text("invoice_number")} maxLength={100} />
          </FormField>
          <FormField label="Link na ugovor" htmlFor="project-contract_url">
            <Input {...text("contract_url", "url")} placeholder="https://..." maxLength={2000} />
          </FormField>
          <FormField label="Link na ponudu" htmlFor="project-proposal_url">
            <Input {...text("proposal_url", "url")} placeholder="https://..." maxLength={2000} />
          </FormField>
        </div>
      </FormSection>

      <FormSection title="Opis i napomene">
        <div className="space-y-3">
          <FormField label="Opis projekta" htmlFor="project-description">
            <Textarea {...text("description")} rows={3} maxLength={5000} placeholder="Šta klijent traži..." />
          </FormField>
          <FormField label="Interne napomene" htmlFor="project-notes">
            <Textarea {...text("notes")} rows={3} maxLength={5000} placeholder="Napomene za tim..." />
          </FormField>
        </div>
      </FormSection>
    </div>
  )
}
