"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { RiAddLine, RiDeleteBinLine, RiEditLine, RiMailLine, RiPhoneLine, RiStarLine, RiUserLine } from "@remixicon/react"
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
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { deleteContactAction, updateContactAction } from "@/lib/hub/actions/client-contacts"
import type { HubClientContact } from "@/lib/hub/types"
import { ContactFormDialog } from "./contact-form-dialog"

interface ClientContactsProps {
  clientId: string
  /** Sorted by the server: primary first, then active, then by name. */
  contacts: HubClientContact[]
  canManage: boolean
}

const fullName = (contact: HubClientContact) => [contact.first_name, contact.last_name].filter(Boolean).join(" ")

function ContactCard({
  contact,
  canManage,
  onEdit,
  onDelete,
  onMakePrimary,
}: {
  contact: HubClientContact
  canManage: boolean
  onEdit: () => void
  onDelete: () => void
  onMakePrimary: () => void
}) {
  return (
    <div className={`space-y-2 rounded-xl border border-border bg-card p-4 ${contact.is_active ? "" : "opacity-60"}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-1.5 text-sm font-semibold">
            {fullName(contact)}
            {contact.is_primary && <Badge className="h-4 px-1.5 text-[10px]">Glavni</Badge>}
            {!contact.is_active && (
              <Badge variant="outline" className="h-4 px-1.5 text-[10px] font-normal">
                Neaktivan
              </Badge>
            )}
          </p>
          {contact.position && <p className="text-xs text-muted-foreground">{contact.position}</p>}
        </div>
        {canManage && (
          <div className="flex shrink-0 items-center">
            {!contact.is_primary && contact.is_active && (
              <Button
                variant="ghost"
                size="icon"
                className="size-7 cursor-pointer text-muted-foreground hover:text-primary"
                title="Postavi kao glavni kontakt"
                onClick={onMakePrimary}
              >
                <RiStarLine className="size-3.5" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="size-7 cursor-pointer text-muted-foreground hover:text-primary"
              title="Uredi kontakt"
              onClick={onEdit}
            >
              <RiEditLine className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 cursor-pointer text-muted-foreground hover:text-destructive"
              title="Obriši kontakt"
              onClick={onDelete}
            >
              <RiDeleteBinLine className="size-3.5" />
            </Button>
          </div>
        )}
      </div>
      <div className="flex flex-col gap-1 text-xs">
        {contact.email && (
          <a href={`mailto:${contact.email}`} className="inline-flex items-center gap-1 text-primary hover:underline">
            <RiMailLine className="size-3.5" />
            {contact.email}
          </a>
        )}
        {contact.phone && (
          <a href={`tel:${contact.phone}`} className="inline-flex items-center gap-1 text-primary hover:underline">
            <RiPhoneLine className="size-3.5" />
            {contact.phone}
          </a>
        )}
      </div>
    </div>
  )
}

export function ClientContacts({ clientId, contacts, canManage }: ClientContactsProps) {
  const router = useRouter()
  const refresh = () => router.refresh()

  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<HubClientContact | null>(null)
  const [toDelete, setToDelete] = React.useState<HubClientContact | null>(null)
  const [isDeleting, setIsDeleting] = React.useState(false)

  const openDialog = (contact: HubClientContact | null) => {
    setEditing(contact)
    setDialogOpen(true)
  }

  const makePrimary = async (contact: HubClientContact) => {
    const result = await updateContactAction(contact.$id, { is_primary: true })
    if (!result.success) return toast.error(result.error)
    toast.success(`${fullName(contact)} je sada glavni kontakt.`)
    refresh()
  }

  const confirmDelete = async () => {
    if (!toDelete) return
    setIsDeleting(true)
    const result = await deleteContactAction(toDelete.$id)
    setIsDeleting(false)
    if (!result.success) return toast.error(result.error)
    toast.success("Kontakt je obrisan.")
    setToDelete(null)
    refresh()
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold">Kontakt osobe</h3>
        {canManage && (
          <Button size="sm" variant="outline" onClick={() => openDialog(null)} className="cursor-pointer gap-1.5">
            <RiAddLine className="size-4" />
            Dodaj kontakt
          </Button>
        )}
      </div>

      {contacts.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border p-6 text-center text-muted-foreground">
          <RiUserLine className="size-6 opacity-40" />
          <p className="text-sm">Klijent još nema kontakt osobu.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {contacts.map((contact) => (
            <ContactCard
              key={contact.$id}
              contact={contact}
              canManage={canManage}
              onEdit={() => openDialog(contact)}
              onDelete={() => setToDelete(contact)}
              onMakePrimary={() => makePrimary(contact)}
            />
          ))}
        </div>
      )}

      <ContactFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        clientId={clientId}
        contact={editing}
        isFirst={contacts.length === 0}
        onSaved={refresh}
      />

      <AlertDialog open={toDelete !== null} onOpenChange={(open) => !open && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Brisanje kontakta</AlertDialogTitle>
            <AlertDialogDescription>
              Obrisati kontakt <strong className="text-foreground">{toDelete ? fullName(toDelete) : ""}</strong>? Ako osoba
              samo više ne radi kod klijenta, možete je umjesto toga označiti kao neaktivnu.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Odustani</AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeleting}
              onClick={(event) => {
                event.preventDefault()
                confirmDelete()
              }}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Obriši
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
