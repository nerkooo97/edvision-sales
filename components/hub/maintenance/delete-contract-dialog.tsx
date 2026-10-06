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
import type { ActionResult } from "@/lib/hub/actions/run-action"

interface DeleteContractDialogProps {
  /** Name shown in the question, e.g. the client; null keeps the dialog closed. */
  label: string | null
  onOpenChange: (open: boolean) => void
  /** Performs the deletion for the contract this dialog was opened for. */
  onConfirm: () => Promise<ActionResult<unknown>>
  onDeleted: () => void
}

export function DeleteContractDialog({ label, onOpenChange, onConfirm, onDeleted }: DeleteContractDialogProps) {
  const [isDeleting, setIsDeleting] = React.useState(false)

  const handleDelete = async () => {
    setIsDeleting(true)
    const result = await onConfirm()
    setIsDeleting(false)

    if (!result.success) return toast.error(result.error)
    toast.success("Ugovor je obrisan.")
    onOpenChange(false)
    onDeleted()
  }

  return (
    <AlertDialog open={label !== null} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <RiDeleteBinLine className="size-5" />
            Brisanje ugovora
          </AlertDialogTitle>
          <AlertDialogDescription>
            Obrisati ugovor klijenta <strong className="text-foreground">{label}</strong>? Ova radnja se ne može
            poništiti.
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
              "Obriši ugovor"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
