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
import { deleteCompany, type Company } from "@/lib/appwrite/companies"
import { RiLoader4Line, RiDeleteBinLine } from "@remixicon/react"

interface DeleteCompanyDialogProps {
  company: Company | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function DeleteCompanyDialog({
  company,
  open,
  onOpenChange,
  onSuccess,
}: DeleteCompanyDialogProps) {
  const [isDeleting, setIsDeleting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const handleDelete = async () => {
    if (!company) return
    setIsDeleting(true)
    setError(null)

    const result = await deleteCompany(company.$id)

    setIsDeleting(false)
    if (result.success) {
      onOpenChange(false)
      onSuccess?.()
    } else {
      setError(result.error || "Greška pri brisanju kompanije.")
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <RiDeleteBinLine className="size-5" />
            Brisanje kompanije
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <span>
              Da li ste sigurni da želite obrisati kompaniju{" "}
              <strong className="text-foreground">{company?.company_name}</strong>?
            </span>
            <span className="block text-xs text-muted-foreground">
              Ova radnja je trajna i obrisat će sve povezane podatke.
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
              "Obriši firmu"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
