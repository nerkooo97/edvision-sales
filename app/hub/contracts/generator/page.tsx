import type { Metadata } from "next"
import { GeneratorView } from "@/components/hub/contracts/generator-view"
import { HubPageHeader } from "@/components/hub/hub-page-header"
import { listClientOptionsAction } from "@/lib/hub/actions/clients"
import { unwrapResult } from "@/lib/hub/actions/run-action"
import { requireHubPageUser } from "@/lib/hub/server/session"

export const metadata: Metadata = {
  title: "Generator ugovora | Edvision Hub",
  description: "Priprema ugovora za digitalni marketing i održavanje web stranica",
}

export default async function ContractGeneratorPage() {
  await requireHubPageUser()
  const clients = await listClientOptionsAction().then(unwrapResult)

  return (
    <>
      <HubPageHeader title="Generator ugovora" />
      <main className="w-full min-w-0 max-w-full flex-1 space-y-6 p-4 lg:p-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Generator ugovora</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Odaberite vrstu ugovora i popunite podatke. Ništa se ne čuva u bazi.
          </p>
        </div>

        <GeneratorView clients={clients} />
      </main>
    </>
  )
}
