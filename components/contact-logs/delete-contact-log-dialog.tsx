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
import { deleteContactLog, type ContactLog } from "@/lib/appwrite/contact-logs"
import { RiLoader4Line, RiDeleteBinLine } from "@remixicon/react"

interface DeleteContactLogDialogProps {
  log: ContactLog | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function DeleteContactLogDialog({
  log,
  open,
  onOpenChange,
  onSuccess,
}: DeleteContactLogDialogProps) {
  const [isDeleting, setIsDeleting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const handleDelete = async () => {
    if (!log) return
    setIsDeleting(true)
    setError(null)

    const result = await deleteContactLog(log.$id)

    setIsDeleting(false)
    if (result.success) {
      onOpenChange(false)
      onSuccess?.()
    } else {
      setError(result.error || "Greška pri brisanju zapisa.")
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <RiDeleteBinLine className="size-5" />
            Brisanje zapisa kontakta
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <span>
              Da li ste sigurni da želite obrisati ovaj zapis komunikacije
              {log?.subject ? ` (${log.subject})` : ""}?
            </span>
            <span className="block text-xs text-muted-foreground">
              Ova radnja je trajna i uklanja zapis iz dnevnika kontakata.
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
              "Obriši zapis"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
