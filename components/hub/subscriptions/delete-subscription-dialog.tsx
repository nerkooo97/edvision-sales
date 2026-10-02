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
import { deleteSubscriptionAction } from "@/lib/hub/actions/subscriptions"
import type { HubSubscription } from "@/lib/hub/types"

interface DeleteSubscriptionDialogProps {
  subscription: HubSubscription | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onDeleted: () => void
}

export function DeleteSubscriptionDialog({ subscription, open, onOpenChange, onDeleted }: DeleteSubscriptionDialogProps) {
  const [isDeleting, setIsDeleting] = React.useState(false)

  const handleDelete = async () => {
    if (!subscription) return
    setIsDeleting(true)
    const result = await deleteSubscriptionAction(subscription.$id)
    setIsDeleting(false)

    if (!result.success) return toast.error(result.error)
    toast.success("Pretplata je obrisana.")
    onOpenChange(false)
    onDeleted()
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <RiDeleteBinLine className="size-5" />
            Brisanje pretplate
          </AlertDialogTitle>
          <AlertDialogDescription>
            Obrisati pretplatu <strong className="text-foreground">{subscription?.name}</strong>? Ova radnja se ne može
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
              "Obriši pretplatu"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
