import { RiLockLine } from "@remixicon/react"
import { HubPageHeader } from "./hub-page-header"

export function HubNoAccess() {
  return (
    <>
      <HubPageHeader title="Projekti" showNotifications={false} />
      <main className="flex flex-1 items-center justify-center p-6">
        <div className="max-w-sm space-y-2 text-center">
          <RiLockLine className="mx-auto size-10 text-muted-foreground/50" />
          <h2 className="text-lg font-semibold">Nemate pristup modulu za projekte</h2>
          <p className="text-sm text-muted-foreground">
            Za pristup je potrebna uloga koju dodjeljuje administrator. Obratite mu se za pristup.
          </p>
        </div>
      </main>
    </>
  )
}
