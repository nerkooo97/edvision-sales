"use client"

import { RiDeleteBinLine, RiEditLine } from "@remixicon/react"
import { Button } from "@/components/ui/button"

export function RowActions({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="flex justify-end">
      <Button
        variant="ghost"
        size="icon"
        className="size-8 cursor-pointer text-muted-foreground hover:text-primary"
        title="Uredi ugovor"
        onClick={onEdit}
      >
        <RiEditLine className="size-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="size-8 cursor-pointer text-muted-foreground hover:text-destructive"
        title="Obriši ugovor"
        onClick={onDelete}
      >
        <RiDeleteBinLine className="size-4" />
      </Button>
    </div>
  )
}
