import { getLoggedInUser } from "@/lib/appwrite/server"
import { getMeetings } from "@/lib/appwrite/meetings"
import { getCompaniesForMeetingForm } from "@/lib/appwrite/meetings"
import { redirect } from "next/navigation"
import { AppSidebar } from "@/components/app-sidebar"
import { MeetingsView } from "@/components/meetings/meetings-view"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { cookies } from "next/headers"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Sastanci | EdVision Sales",
  description: "Zakazivanje i praćenje poslovnih sastanaka sa klijentima",
}

interface MeetingsPageProps {
  searchParams: Promise<{
    page?: string
    search?: string
    status?: string
    view?: string
  }>
}

export default async function MeetingsPage({ searchParams }: MeetingsPageProps) {
  const user = await getLoggedInUser()

  if (!user) {
    redirect("/")
  }

  const cookieStore = await cookies()
  const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false"

  const resolvedSearchParams = await searchParams
  const page = Math.max(1, parseInt(resolvedSearchParams.page || "1", 10) || 1)
  const search = (resolvedSearchParams.search || "").trim()
  const status = (resolvedSearchParams.status || "all").trim()
  const view = (resolvedSearchParams.view === "calendar" ? "calendar" : "list") as "list" | "calendar"
  const limit = 15

  const [{ meetings, total, totalPages }, companies, pendingRes] = await Promise.all([
    getMeetings({
      page,
      limit,
      search,
      status: status === "all" ? "" : status,
    }),
    getCompaniesForMeetingForm(),
    getMeetings({ limit: 200, status: "Na čekanju" })
  ])

  const pendingMeetings = pendingRes.meetings.sort((a, b) => {
    const aDate = new Date(a.reminder_at || a.scheduled_at).getTime()
    const bDate = new Date(b.reminder_at || b.scheduled_at).getTime()
    return aDate - bDate
  })

  return (
    <SidebarProvider
      defaultOpen={defaultOpen}
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" user={{ name: user.name, email: user.email }} />
      <SidebarInset>
        {/* Header */}
        <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
          <div className="flex w-full items-center gap-2 px-4 lg:px-6">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mx-2 data-[orientation=vertical]:h-4" />
            <h1 className="text-base font-semibold">Sastanci</h1>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-4 lg:p-6 space-y-6 w-full min-w-0 max-w-full overflow-hidden">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Raspored sastanaka</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Zakazuj, prati i upravljaj svim poslovnim sastancima sa klijentima.
            </p>
          </div>

          <MeetingsView
            initialMeetings={meetings}
            initialTotal={total}
            initialPage={page}
            initialTotalPages={totalPages}
            companies={companies}
            pendingMeetings={pendingMeetings}
            initialSearch={search}
            initialStatus={status}
            initialView={view}
          />
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
