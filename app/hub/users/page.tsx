import type { Metadata } from "next"
import { HubForbidden } from "@/components/hub/hub-forbidden"
import { HubPageHeader } from "@/components/hub/hub-page-header"
import { UsersTable } from "@/components/hub/users/users-table"
import { unwrapResult } from "@/lib/hub/actions/run-action"
import { listUsersWithRolesAction } from "@/lib/hub/actions/users"
import { canManageUsers } from "@/lib/hub/permissions"
import { requireHubUser } from "@/lib/hub/server/session"

export const metadata: Metadata = {
  title: "Korisnici | Edvision Hub",
  description: "Dodjela uloga za pristup modulu za projekte",
}

export default async function UsersPage() {
  const user = await requireHubUser()

  if (!canManageUsers(user.role)) {
    return (
      <HubForbidden title="Korisnici" message="Uloge korisnika može mijenjati samo administrator modula za projekte." />
    )
  }

  const users = unwrapResult(await listUsersWithRolesAction())

  return (
    <>
      <HubPageHeader title="Korisnici" />
      <main className="w-full min-w-0 max-w-full flex-1 space-y-6 p-4 lg:p-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Korisnici i uloge</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Uloga određuje šta korisnik smije u modulu za projekte. Bez uloge nema pristupa.
          </p>
        </div>

        <UsersTable users={users} currentUserId={user.id} />
      </main>
    </>
  )
}
