"use client"

import * as React from "react"
import { RiLoader4Line } from "@remixicon/react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { createTeamAction, updateTeamAction } from "@/lib/hub/actions/teams"
import type { HubMember, HubTeam } from "@/lib/hub/types"
import { ChipPicker } from "../projects/form/chip-picker"
import { FormField } from "../projects/form/form-field"

interface TeamDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** null = create a new team */
  team: HubTeam | null
  members: HubMember[]
  onSaved: () => void
}

function TeamForm({ team, members, onSaved, onClose }: Omit<TeamDialogProps, "open" | "onOpenChange"> & { onClose: () => void }) {
  const [name, setName] = React.useState(team?.name ?? "")
  const [description, setDescription] = React.useState(team?.description ?? "")
  const [memberIds, setMemberIds] = React.useState<string[]>(team?.member_ids ?? [])
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!name.trim()) return setError("Naziv tima je obavezan.")

    setIsSubmitting(true)
    setError(null)
    const payload = { name, description, member_ids: memberIds }
    const result = team ? await updateTeamAction(team.$id, payload) : await createTeamAction(payload)
    setIsSubmitting(false)

    if (!result.success) return setError(result.error)
    toast.success(team ? "Tim je sačuvan." : "Tim je kreiran.")
    onSaved()
    onClose()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-2.5 text-xs text-destructive">
          {error}
        </div>
      )}

      <FormField label="Naziv tima" htmlFor="team-name" required>
        <Input id="team-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={100} autoFocus />
      </FormField>

      <FormField label="Opis" htmlFor="team-description">
        <Textarea
          id="team-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={2}
          maxLength={500}
        />
      </FormField>

      <FormField label="Članovi">
        <ChipPicker
          options={members.map((member) => ({ id: member.id, label: member.name }))}
          selected={memberIds}
          onChange={setMemberIds}
          emptyText="Nema korisnika s pristupom modulu."
        />
      </FormField>

      <DialogFooter>
        <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting} className="cursor-pointer">
          Odustani
        </Button>
        <Button type="submit" size="sm" disabled={isSubmitting} className="cursor-pointer gap-1.5">
          {isSubmitting && <RiLoader4Line className="size-4 animate-spin" />}
          {team ? "Sačuvaj" : "Kreiraj tim"}
        </Button>
      </DialogFooter>
    </form>
  )
}

export function TeamDialog({ open, onOpenChange, team, members, onSaved }: TeamDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{team ? "Uredi tim" : "Novi tim"}</DialogTitle>
          <DialogDescription>Odaberite korisnike koji čine tim.</DialogDescription>
        </DialogHeader>
        {/* Remounted per team so the fields always start from that team's values. */}
        {open && (
          <TeamForm
            key={team?.$id ?? "new"}
            team={team}
            members={members}
            onSaved={onSaved}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
