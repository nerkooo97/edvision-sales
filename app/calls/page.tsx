import { getLoggedInUser } from "@/lib/appwrite/server"
import { getLeads } from "@/lib/appwrite/leads"
import { getCompanies } from "@/lib/appwrite/companies"
import { getCallsData } from "@/lib/appwrite/calls"
import { redirect } from "next/navigation"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { CallCenterView } from "@/components/calls/call-center-view"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Za nazvati | EdVision Sales",
  description: "Lista leadova koji su odgovorili na email i čekaju poziv",
}

interface CallsPageProps {
  searchParams: Promise<{
    page?: string
    view?: string
  }>
}

export default async function CallsPage({ searchParams }: CallsPageProps) {
  const user = await getLoggedInUser()

  if (!user) {
    redirect('/')
  }

  const resolvedSearchParams = await searchParams
  const isKanban = resolvedSearchParams.view === "kanban"
  const page = Math.max(1, parseInt(resolvedSearchParams.page || "1", 10) || 1)
  const status = "U pregovorima" // Fiksiran status za ljude koji su odgovorili i koje treba nazvati
  const limit = isKanban ? 100 : 15

  const [{ leads, total, totalPages }, { companies }, callsData] = await Promise.all([
    getLeads({ page, limit, status }),
    getCompanies({ limit: 100 }),
    getCallsData()
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
      <SidebarInset className="min-w-0">
        <SiteHeader />
        
        {/* Content */}
        <main className="flex-1 p-4 lg:p-6 space-y-6 w-full min-w-0 max-w-full overflow-hidden">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Klijenti za pozvati</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Ovo su svi leadovi koji su dobili email i odgovorili (Status: U pregovorima).
            </p>
          </div>

          <CallCenterView
            leads={leads}
            companies={companies}
          />
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
