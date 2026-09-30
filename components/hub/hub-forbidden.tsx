import { RiShieldKeyholeLine } from "@remixicon/react"
import { HubPageHeader } from "./hub-page-header"

/** Shown inside a page when the user has Hub access but not the permission that page needs. */
export function HubForbidden({ title, message }: { title: string; message: string }) {
  return (
    <>
      <HubPageHeader title={title} />
      <main className="flex flex-1 items-center justify-center p-6">
        <div className="max-w-sm space-y-2 text-center">
          <RiShieldKeyholeLine className="mx-auto size-10 text-muted-foreground/50" />
          <h2 className="text-lg font-semibold">Nemate dozvolu</h2>
          <p className="text-sm text-muted-foreground">{message}</p>
        </div>
      </main>
    </>
  )
}
