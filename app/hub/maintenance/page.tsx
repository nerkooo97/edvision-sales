import type { Metadata } from "next"
import { HubPageHeader } from "@/components/hub/hub-page-header"
import { MaintenanceView } from "@/components/hub/maintenance/maintenance-view"
import { listClientOptionsAction } from "@/lib/hub/actions/clients"
import { listMaintenanceContractsAction } from "@/lib/hub/actions/maintenance-contracts"
import { listMarketingContractsAction } from "@/lib/hub/actions/marketing-contracts"
import { unwrapResult } from "@/lib/hub/actions/run-action"
import { canManageMaintenance } from "@/lib/hub/permissions"
import { requireHubPageUser } from "@/lib/hub/server/session"

export const metadata: Metadata = {
  title: "Ugovori o održavanju | Edvision Hub",
  description: "Trajanje ugovora za digitalni marketing i održavanje web stranica",
}

interface MaintenancePageProps {
  searchParams: Promise<{ year?: string }>
}

export default async function MaintenancePage({ searchParams }: MaintenancePageProps) {
  const user = await requireHubPageUser()

  const currentYear = new Date().getFullYear()
  const requested = Number((await searchParams).year)
  const year = Number.isInteger(requested) && requested >= 2000 && requested <= 2100 ? requested : currentYear
  // Two past years, the current one and the next; a chosen year outside this range stays selectable.
  const years = [...new Set([currentYear - 2, currentYear - 1, currentYear, currentYear + 1, year])].sort()

  const [marketing, maintenance, clients] = await Promise.all([
    listMarketingContractsAction(year).then(unwrapResult),
    listMaintenanceContractsAction().then(unwrapResult),
    listClientOptionsAction().then(unwrapResult),
  ])

  return (
    <>
      <HubPageHeader title="Ugovori o održavanju" />
      <main className="w-full min-w-0 max-w-full flex-1 space-y-6 p-4 lg:p-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Ugovori o održavanju</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Digitalni marketing: trajanje ugovora i mjeseci rada. Održavanje web stranica: ugovori na godinu dana.
          </p>
        </div>

        <MaintenanceView
          marketing={marketing}
          maintenance={maintenance}
          clients={clients}
          year={year}
          years={years}
          canManage={canManageMaintenance(user.role)}
        />
      </main>
    </>
  )
}
