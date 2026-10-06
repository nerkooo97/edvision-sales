import type { Metadata } from "next"
import { HubPageHeader } from "@/components/hub/hub-page-header"
import { SubscriptionsList } from "@/components/hub/subscriptions/subscriptions-list"
import { unwrapResult } from "@/lib/hub/actions/run-action"
import { listSubscriptionHoldersAction, listSubscriptionsAction } from "@/lib/hub/actions/subscriptions"
import { canManageSubscriptions } from "@/lib/hub/permissions"
import { requireHubPageUser } from "@/lib/hub/server/session"

export const metadata: Metadata = {
  title: "Aktivne pretplate | Edvision Hub",
  description: "Pregled aktivnih pretplata firme",
}

export default async function SubscriptionsPage() {
  const user = await requireHubPageUser()

  const [subscriptions, holders] = await Promise.all([
    listSubscriptionsAction().then(unwrapResult),
    listSubscriptionHoldersAction().then(unwrapResult),
  ])

  return (
    <>
      <HubPageHeader title="Aktivne pretplate" />
      <main className="w-full min-w-0 max-w-full flex-1 space-y-6 p-4 lg:p-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Aktivne pretplate</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Pretplate koje firma trenutno plaća. Ukupne vrijednosti su preračunate u KM po fiksnom kursu.
          </p>
        </div>

        <SubscriptionsList
          subscriptions={subscriptions}
          holders={holders.map(({ id, name }) => ({ id, name }))}
          canManage={canManageSubscriptions(user.role)}
        />
      </main>
    </>
  )
}
