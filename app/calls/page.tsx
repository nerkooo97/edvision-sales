import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { getLoggedInUser } from "@/lib/appwrite/server"
import { getCallsData } from "@/lib/appwrite/calls"
import { CallsView } from "@/components/calls/calls-view"
import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Telefonski pozivi | Edvision Sales",
  description: "Lista hot leadova, zakazani pozivi i prodajni vodič za razgovore sa klijentima",
}

export default async function CallsPage() {
  const user = await getLoggedInUser()

  if (!user) {
    redirect("/")
  }

  const cookieStore = await cookies()
  const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false"

  const callsData = await getCallsData()

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
      <SidebarInset className="min-w-0">
        <SiteHeader />
        <main className="flex-1 p-4 lg:p-6 space-y-6 w-full min-w-0 max-w-full overflow-hidden">
          <CallsView initialData={callsData} />
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
