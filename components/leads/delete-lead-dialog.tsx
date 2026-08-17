"use client"

import * as React from "react"
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
import { deleteLead, type Lead } from "@/lib/appwrite/leads"
import { RiLoader4Line, RiDeleteBinLine } from "@remixicon/react"

interface DeleteLeadDialogProps {
  lead: Lead | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function DeleteLeadDialog({
  lead,
  open,
  onOpenChange,
  onSuccess,
}: DeleteLeadDialogProps) {
  const [isDeleting, setIsDeleting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const handleDelete = async () => {
    if (!lead) return
    setIsDeleting(true)
    setError(null)

    const result = await deleteLead(lead.$id)

    setIsDeleting(false)
    if (result.success) {
      onOpenChange(false)
      onSuccess?.()
    } else {
      setError(result.error || "Greška pri brisanju leada.")
    }
  }

  const companyName = typeof lead?.company === 'object' && lead?.company
    ? lead.company.company_name
    : lead?.$id

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <RiDeleteBinLine className="size-5" />
            Brisanje leada
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <span>
              Da li ste sigurni da želite obrisati lead za{" "}
              <strong className="text-foreground">{companyName}</strong>?
            </span>
            <span className="block text-xs text-muted-foreground">
              Ova radnja je trajna i obrisat će sve povezane analize i zapise.
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>

        {error && (
          <div className="p-3 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg">
            {error}
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Odustani</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault()
              handleDelete()
            }}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 cursor-pointer"
          >
            {isDeleting ? (
              <span className="flex items-center gap-1.5">
                <RiLoader4Line className="size-4 animate-spin" />
                Brisanje...
              </span>
            ) : (
              "Obriši lead"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
