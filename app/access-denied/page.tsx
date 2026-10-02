import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { RiLockLine } from "@remixicon/react"
import { getCurrentAccess } from "@/lib/access/server/access"

export const metadata: Metadata = {
  title: "Nema pristupa | Edvision Hub",
}

// Where someone lands when they are signed in but have no role in any module they tried to open.
export default async function AccessDeniedPage() {
  const access = await getCurrentAccess()
  if (!access) redirect("/")

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="max-w-sm space-y-3 text-center">
        <RiLockLine className="mx-auto size-10 text-muted-foreground/50" />
        <h1 className="text-lg font-semibold">Nemate pristup ovom dijelu</h1>
        <p className="text-sm text-muted-foreground">
          Za pristup je potrebna uloga koju dodjeljuje glavni administrator. Obratite mu se za pristup.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4 pt-1 text-sm">
          {access.roles.hub && (
            <Link href="/hub" className="text-primary hover:underline">
              Otvori projekte
            </Link>
          )}
          <Link href="/" className="text-muted-foreground hover:underline">
            Nazad na prijavu
          </Link>
        </div>
      </div>
    </main>
  )
}
