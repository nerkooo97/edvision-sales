import type { Metadata } from "next"
import { AccessMatrix } from "@/components/access/access-matrix"
import { HubForbidden } from "@/components/hub/hub-forbidden"
import { HubPageHeader } from "@/components/hub/hub-page-header"
import { listAccessUsersAction } from "@/lib/access/actions/access"
import { getCurrentAccess, isSalesEnforced } from "@/lib/access/server/access"
import { unwrapResult } from "@/lib/hub/actions/run-action"

export const metadata: Metadata = {
  title: "Korisnici i pristup | Edvision Hub",
  description: "Uloge korisnika po modulima",
}

export default async function AccessPage() {
  const access = await getCurrentAccess()

  if (!access?.isOrgAdmin) {
    return (
      <HubForbidden
        title="Korisnici i pristup"
        message="Pristup korisnika modulima može mijenjati samo glavni administrator."
      />
    )
  }

  const users = unwrapResult(await listAccessUsersAction())

  return (
    <>
      <HubPageHeader title="Korisnici i pristup" showNotifications={false} />
      <main className="w-full min-w-0 max-w-full flex-1 space-y-6 p-4 lg:p-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Korisnici i pristup</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Svaki korisnik ima ulogu u svakom modulu posebno. Bez uloge nema pristupa tom modulu.
          </p>
        </div>

        <AccessMatrix users={users} salesEnforced={isSalesEnforced()} />
      </main>
    </>
  )
}
