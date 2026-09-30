import { HubPageHeader } from "@/components/hub/hub-page-header"
import { Skeleton } from "@/components/ui/skeleton"

export default function ProjectsLoading() {
  return (
    <>
      <HubPageHeader title="Projekti" showNotifications={false} />
      <main className="flex-1 space-y-6 p-4 lg:p-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96 max-w-full" />
        </div>
        <Skeleton className="h-9 w-full max-w-md" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </main>
    </>
  )
}
