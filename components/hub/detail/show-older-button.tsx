"use client"

import { RiHistoryLine, RiLoader4Line } from "@remixicon/react"
import { Button } from "@/components/ui/button"

/** "Show older" for lists that are read in pages. */
export function ShowOlderButton({ label, isLoading, onClick }: { label: string; isLoading: boolean; onClick: () => void }) {
  return (
    <div className="flex justify-center">
      <Button variant="outline" size="sm" disabled={isLoading} onClick={onClick} className="cursor-pointer gap-1.5">
        {isLoading ? <RiLoader4Line className="size-4 animate-spin" /> : <RiHistoryLine className="size-4" />}
        {label}
      </Button>
    </div>
  )
}
