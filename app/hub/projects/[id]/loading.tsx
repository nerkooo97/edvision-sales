import { HubPageHeader } from "@/components/hub/hub-page-header"
import { Skeleton } from "@/components/ui/skeleton"

export default function ProjectDetailLoading() {
  return (
    <>
      <HubPageHeader title="Projekti" showNotifications={false} />
      <main className="flex-1 space-y-4 p-4 lg:p-6">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-9 w-96 max-w-full" />
        <Skeleton className="h-80 w-full rounded-xl" />
      </main>
    </>
  )
}
