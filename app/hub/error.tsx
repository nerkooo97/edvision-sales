"use client"

import { Button } from "@/components/ui/button"
import { HubPageHeader } from "@/components/hub/hub-page-header"

export default function HubError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <>
      <HubPageHeader title="Projekti" showNotifications={false} />
      <main className="flex-1 p-4 lg:p-6">
        <div className="max-w-md space-y-3 rounded-xl border border-destructive/20 bg-destructive/10 p-5">
          <p className="text-sm font-semibold text-destructive">Podaci se trenutno ne mogu učitati.</p>
          <p className="text-xs text-muted-foreground">{error.message}</p>
          <Button size="sm" variant="outline" onClick={reset} className="cursor-pointer">
            Pokušaj ponovo
          </Button>
        </div>
      </main>
    </>
  )
}
