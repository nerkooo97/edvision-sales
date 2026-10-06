import type { Metadata } from "next"
import { CounterSettings } from "@/components/hub/contracts/counter-settings"
import { GeneratorView } from "@/components/hub/contracts/generator-view"
import { HubPageHeader } from "@/components/hub/hub-page-header"
import { listClientOptionsAction } from "@/lib/hub/actions/clients"
import { unwrapResult } from "@/lib/hub/actions/run-action"
import { canDeleteClient, canManageMaintenance } from "@/lib/hub/permissions"
import { requireHubPageUser } from "@/lib/hub/server/session"

export const metadata: Metadata = {
  title: "Generator ugovora | Edvision Hub",
  description: "Priprema ugovora za digitalni marketing i održavanje web stranica",
}

export default async function ContractGeneratorPage() {
  const user = await requireHubPageUser()
  const clients = await listClientOptionsAction().then(unwrapResult)

  return (
    <>
      <HubPageHeader title="Generator ugovora" />
      <main className="w-full min-w-0 max-w-full flex-1 space-y-6 p-4 lg:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Generator ugovora</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Odaberite vrstu ugovora i popunite podatke. Ugovor se čuva uz klijenta i dobija sljedeći broj; PDF se samo
              preuzima.
            </p>
          </div>
          {/* Admin only, like the other settings that change numbering. */}
          {canDeleteClient(user.role) && <CounterSettings />}
        </div>

        <GeneratorView clients={clients} canSave={canManageMaintenance(user.role)} />
      </main>
    </>
  )
}
