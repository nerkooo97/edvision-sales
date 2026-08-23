import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { getLoggedInUser } from "@/lib/appwrite/server"
import { getReportsData } from "@/lib/appwrite/reports"
import { ReportsView } from "@/components/reports/reports-view"
import { redirect } from "next/navigation"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Izvještaji i Analitika | Edvision Sales",
  description: "Detaljna analitika performansi prodaje, lijevka konverzije i efikasnosti kanala",
}

export default async function ReportsPage() {
  const user = await getLoggedInUser()

  if (!user) {
    redirect("/")
  }

  const reportsData = await getReportsData()

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
        <main className="flex-1 p-4 lg:p-6 space-y-6 w-full min-w-0 max-w-full overflow-hidden">
          <ReportsView initialData={reportsData} />
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
