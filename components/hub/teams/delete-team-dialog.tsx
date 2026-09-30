"use client"

import * as React from "react"
import { RiDeleteBinLine, RiLoader4Line } from "@remixicon/react"
import { toast } from "sonner"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { deleteTeamAction } from "@/lib/hub/actions/teams"
import type { HubTeam } from "@/lib/hub/types"

interface DeleteTeamDialogProps {
  team: HubTeam | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onDeleted: () => void
}

export function DeleteTeamDialog({ team, open, onOpenChange, onDeleted }: DeleteTeamDialogProps) {
  const [isDeleting, setIsDeleting] = React.useState(false)

  const handleDelete = async () => {
    if (!team) return
    setIsDeleting(true)
    const result = await deleteTeamAction(team.$id)
    setIsDeleting(false)

    if (!result.success) return toast.error(result.error)
    toast.success("Tim je obrisan.")
    onOpenChange(false)
    onDeleted()
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <RiDeleteBinLine className="size-5" />
            Brisanje tima
          </AlertDialogTitle>
          <AlertDialogDescription>
            Obrisati tim <strong className="text-foreground">{team?.name}</strong>? Tim se uklanja sa svih projekata,
            a sami projekti ostaju.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Odustani</AlertDialogCancel>
          <AlertDialogAction
            onClick={(event) => {
              event.preventDefault()
              handleDelete()
            }}
            disabled={isDeleting}
            className="cursor-pointer bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? (
              <span className="flex items-center gap-1.5">
                <RiLoader4Line className="size-4 animate-spin" />
                Brisanje...
              </span>
            ) : (
              "Obriši tim"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
