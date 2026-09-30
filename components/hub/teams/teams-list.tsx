"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { RiAddLine, RiDeleteBinLine, RiEditLine, RiTeamLine } from "@remixicon/react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { HubMember, HubTeam } from "@/lib/hub/types"
import { DeleteTeamDialog } from "./delete-team-dialog"
import { TeamDialog } from "./team-dialog"

interface TeamsListProps {
  teams: HubTeam[]
  members: HubMember[]
  canManage: boolean
}

export function TeamsList({ teams, members, canManage }: TeamsListProps) {
  const router = useRouter()
  const refresh = () => router.refresh()

  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editingTeam, setEditingTeam] = React.useState<HubTeam | null>(null)
  const [teamToDelete, setTeamToDelete] = React.useState<HubTeam | null>(null)

  const memberNames = React.useMemo(() => new Map(members.map((member) => [member.id, member.name])), [members])

  const openDialog = (team: HubTeam | null) => {
    setEditingTeam(team)
    setDialogOpen(true)
  }

  return (
    <div className="space-y-4">
      {canManage && (
        <div className="flex justify-end">
          <Button size="sm" onClick={() => openDialog(null)} className="cursor-pointer gap-1.5 shadow-xs">
            <RiAddLine className="size-4" />
            Novi tim
          </Button>
        </div>
      )}

      {teams.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-14 text-center text-muted-foreground">
          <RiTeamLine className="size-8 opacity-40" />
          <p className="text-sm font-medium text-foreground">Još nema timova</p>
          <p className="text-xs">
            {canManage ? "Kliknite na 'Novi tim' za kreiranje prvog tima." : "Timove kreira administrator."}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {teams.map((team) => (
            <div key={team.$id} className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-semibold">{team.name}</h3>
                  {team.description && <p className="mt-0.5 text-xs text-muted-foreground">{team.description}</p>}
                </div>
                {canManage && (
                  <div className="flex shrink-0 items-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 cursor-pointer text-muted-foreground hover:text-primary"
                      title="Uredi tim"
                      onClick={() => openDialog(team)}
                    >
                      <RiEditLine className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 cursor-pointer text-muted-foreground hover:text-destructive"
                      title="Obriši tim"
                      onClick={() => setTeamToDelete(team)}
                    >
                      <RiDeleteBinLine className="size-4" />
                    </Button>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-1.5">
                {team.member_ids.length === 0 ? (
                  <span className="text-xs text-muted-foreground">Nema članova.</span>
                ) : (
                  team.member_ids.map((id) => (
                    <Badge key={id} variant="secondary" className="font-normal">
                      {memberNames.get(id) ?? "Nepoznat korisnik"}
                    </Badge>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <TeamDialog open={dialogOpen} onOpenChange={setDialogOpen} team={editingTeam} members={members} onSaved={refresh} />
      <DeleteTeamDialog
        team={teamToDelete}
        open={teamToDelete !== null}
        onOpenChange={(open) => !open && setTeamToDelete(null)}
        onDeleted={refresh}
      />
    </div>
  )
}
