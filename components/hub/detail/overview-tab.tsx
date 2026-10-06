"use client"

import * as React from "react"
import {
  RiBuilding2Line,
  RiCheckLine,
  RiExternalLinkLine,
  RiFileTextLine,
  RiLoader4Line,
  RiMailLine,
  RiPhoneLine,
  RiTeamLine,
} from "@remixicon/react"
import Link from "next/link"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { updateProjectAction } from "@/lib/hub/actions/projects"
import type { ProjectPermissions } from "@/lib/hub/permissions"
import { formatKm, toDateInputValue, toSafeWebUrl } from "@/lib/hub/format"
import { formatClientAddress } from "@/lib/hub/countries"
import { getContractEnd, isRecurring } from "@/lib/hub/retainer"
import type { HubClient, HubClientContact, HubMember, HubProject, HubTeam } from "@/lib/hub/types"
import { formatDate } from "@/lib/utils"
import type { NameResolver } from "./detail-types"

interface OverviewTabProps {
  project: HubProject
  /** The linked saved client (live data), or null when the project has a one-off client. */
  client: HubClient | null
  /** The linked client's primary contact. */
  clientContact: HubClientContact | null
  permissions: ProjectPermissions
  members: HubMember[]
  teams: HubTeam[]
  nameOf: NameResolver
  onSaved: () => void
}

function InfoCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-3 rounded-xl border border-border bg-card p-4">
      <h3 className="flex items-center gap-1.5 text-sm font-semibold">
        <span className="text-primary">{icon}</span>
        {title}
      </h3>
      {children}
    </div>
  )
}

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <span className="block text-[11px] text-muted-foreground">{label}</span>
      <div className="text-sm font-medium">{children}</div>
    </div>
  )
}

function ExternalLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
    >
      {label}
      <RiExternalLinkLine className="size-3.5" />
    </a>
  )
}

function ProjectNotes({
  project,
  canEdit,
  onSaved,
}: {
  project: HubProject
  canEdit: boolean
  onSaved: () => void
}) {
  const [notes, setNotes] = React.useState(project.notes ?? "")
  const [isSaving, setIsSaving] = React.useState(false)
  const isChanged = notes !== (project.notes ?? "")

  const save = async () => {
    setIsSaving(true)
    const result = await updateProjectAction(project.$id, { notes })
    setIsSaving(false)
    if (!result.success) return toast.error(result.error)
    toast.success("Napomene su sačuvane.")
    onSaved()
  }

  return (
    <InfoCard title="Interne napomene" icon={<RiFileTextLine className="size-4" />}>
      <Textarea
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
        disabled={!canEdit}
        rows={4}
        maxLength={5000}
        placeholder="Interne napomene tima, specifičnosti klijenta..."
      />
      {canEdit && (
        <div className="flex justify-end">
          <Button size="sm" onClick={save} disabled={!isChanged || isSaving} className="cursor-pointer gap-1.5">
            {isSaving ? <RiLoader4Line className="size-4 animate-spin" /> : <RiCheckLine className="size-4" />}
            Sačuvaj napomene
          </Button>
        </div>
      )}
    </InfoCard>
  )
}

interface ClientDetailsProps {
  project: HubProject
  client: HubClient | null
  contact: HubClientContact | null
}

function ClientDetails({ project, client, contact: primary }: ClientDetailsProps) {
  // A linked project shows the saved client's current data; otherwise the details typed on the project.
  const name = client?.name ?? project.client_name
  const contactName = primary ? [primary.first_name, primary.last_name].filter(Boolean).join(" ") : null
  const contact = client ? contactName : project.client_contact
  const email = client ? (primary?.email ?? client.email) : project.client_email
  const phone = client ? (primary?.phone ?? client.phone) : project.client_phone
  const website = toSafeWebUrl(client?.website)
  const place = client ? formatClientAddress(client) : ""

  return (
    <div className="space-y-2.5">
      <Labeled label="Naziv">
        {client ? (
          <Link href={`/hub/clients/${client.$id}`} className="text-primary hover:underline">
            {name}
          </Link>
        ) : (
          name
        )}
      </Labeled>
      {contact && <Labeled label="Kontakt osoba">{contact}</Labeled>}
      {place && <Labeled label="Adresa">{place}</Labeled>}
      {client?.tax_id && <Labeled label="ID broj">{client.tax_id}</Labeled>}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
        {email && (
          <a href={`mailto:${email}`} className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
            <RiMailLine className="size-3.5" />
            {email}
          </a>
        )}
        {phone && (
          <a href={`tel:${phone}`} className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
            <RiPhoneLine className="size-3.5" />
            {phone}
          </a>
        )}
        {website && <ExternalLink href={website} label={client?.website ?? website} />}
        {!email && !phone && !website && <span className="text-xs text-muted-foreground">Nema kontakt podataka.</span>}
      </div>
      {!client && <p className="text-[11px] text-muted-foreground">Jednokratni klijent, nije u bazi klijenata.</p>}
    </div>
  )
}

function ContractDetails({ project, showMoney }: { project: HubProject; showMoney: boolean }) {
  if (!isRecurring(project) || !project.contract_start_date || !project.contract_months) return null

  const start = toDateInputValue(project.contract_start_date)
  const end = getContractEnd(start, project.contract_months)

  return (
    <InfoCard title="Ugovor (stalna usluga)" icon={<RiFileTextLine className="size-4" />}>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Labeled label="Trajanje">
          <span className="font-mono text-xs">
            {formatDate(start)} – {formatDate(end)}
          </span>
          <span className="block text-[11px] font-normal text-muted-foreground">{project.contract_months} mjeseci</span>
        </Labeled>
        {showMoney && (
          <Labeled label="Mjesečna naknada">{project.monthly_fee === null ? "—" : formatKm(project.monthly_fee)}</Labeled>
        )}
        <Labeled label="Dogovoreno objava sedmično">{project.weekly_quota}</Labeled>
        {showMoney && (
          <Labeled label="Cijena dodatne objave">
            {project.extra_post_price === null ? "—" : formatKm(project.extra_post_price)}
          </Labeled>
        )}
      </div>
    </InfoCard>
  )
}

export function OverviewTab({
  project,
  client,
  clientContact,
  permissions,
  members,
  teams,
  nameOf,
  onSaved,
}: OverviewTabProps) {
  const editable = permissions.editableFields
  const canEditNotes = editable === "all" || editable.includes("notes")

  const assignedTeams = teams.filter((team) => project.team_ids.includes(team.$id))
  const memberNames = project.member_ids
    .map((id) => members.find((member) => member.id === id)?.name)
    .filter((name): name is string => Boolean(name))

  return (
    <div className="space-y-4">
      {project.description && (
        <div className="space-y-1.5 rounded-xl border border-border bg-card p-4">
          <h3 className="text-sm font-semibold">Opis projekta</h3>
          <p className="text-sm leading-relaxed whitespace-pre-line text-muted-foreground">{project.description}</p>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <InfoCard title="Klijent" icon={<RiBuilding2Line className="size-4" />}>
          <ClientDetails project={project} client={client} contact={clientContact} />
        </InfoCard>

        <InfoCard title="Tim" icon={<RiTeamLine className="size-4" />}>
          <div className="space-y-2.5">
            <Labeled label="Voditelj projekta">{nameOf(project.lead_id)}</Labeled>
            <Labeled label="Članovi">
              {memberNames.length > 0 ? memberNames.join(", ") : <span className="text-muted-foreground">—</span>}
            </Labeled>
            <Labeled label="Timovi">
              {assignedTeams.length > 0 ? (
                assignedTeams.map((team) => team.name).join(", ")
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </Labeled>
          </div>
        </InfoCard>
      </div>

      <ContractDetails project={project} showMoney={permissions.canViewMoney} />

      <InfoCard title="Dokumenti i fakturisanje" icon={<RiFileTextLine className="size-4" />}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Labeled label="Broj ugovora">{project.contract_number ?? "—"}</Labeled>
          <Labeled label="Broj fakture">{project.invoice_number ?? "—"}</Labeled>
          <Labeled label="Ugovor">
            {project.contract_url ? <ExternalLink href={project.contract_url} label="Otvori" /> : "—"}
          </Labeled>
          <Labeled label="Ponuda">
            {project.proposal_url ? <ExternalLink href={project.proposal_url} label="Otvori" /> : "—"}
          </Labeled>
        </div>
      </InfoCard>

      <ProjectNotes key={project.$updatedAt} project={project} canEdit={canEditNotes} onSaved={onSaved} />

      <p className="px-1 text-[11px] text-muted-foreground">
        Kreirano {formatDate(project.$createdAt)} · Posljednja izmjena {formatDate(project.$updatedAt)}
      </p>
    </div>
  )
}
