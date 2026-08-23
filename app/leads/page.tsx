import { getLoggedInUser } from "@/lib/appwrite/server"
import { getLeads } from "@/lib/appwrite/leads"
import { getCompanies } from "@/lib/appwrite/companies"
import { redirect } from "next/navigation"
import { AppSidebar } from "@/components/app-sidebar"
import { LeadsView } from "@/components/leads/leads-view"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Leadovi | Edvision Sales",
  description: "Pregled i kvalifikacija leadova i prodajnog toka",
}

interface LeadsPageProps {
  searchParams: Promise<{
    page?: string
    status?: string
    search?: string
    view?: string
  }>
}

export default async function LeadsPage({ searchParams }: LeadsPageProps) {
  const user = await getLoggedInUser()

  if (!user) {
    redirect('/')
  }

  const resolvedSearchParams = await searchParams
  const isKanban = resolvedSearchParams.view === "kanban"
  const page = Math.max(1, parseInt(resolvedSearchParams.page || "1", 10) || 1)
  const status = (resolvedSearchParams.status || "").trim()
  const search = (resolvedSearchParams.search || "").trim()
  const limit = isKanban ? 100 : 15

  const [{ leads, total, totalPages }, { companies }] = await Promise.all([
    getLeads({ page, limit, status, search }),
    getCompanies({ limit: 100 }),
  ])

  return (
    <SidebarProvider
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
            <h1 className="text-base font-semibold">Leadovi</h1>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-4 lg:p-6 space-y-6 w-full min-w-0 max-w-full overflow-hidden">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Pregled Leadova</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Praćenje statusa, analize i prodajnog toka (Scrum Board i tabela).
            </p>
          </div>

          <LeadsView
            leads={leads}
            companies={companies}
            total={total}
            page={page}
            limit={limit}
            totalPages={totalPages}
            status={status}
            searchQuery={search}
          />
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
