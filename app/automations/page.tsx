import { AutomationsView } from "@/components/automations/automations-view"
import { Metadata } from "next"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { getLoggedInUser } from "@/lib/appwrite/server"
import { redirect } from "next/navigation"

export const metadata: Metadata = {
  title: "Automatizacije | ED Vision Sales",
  description: "Upravljanje n8n automatizacijama.",
}

export default async function AutomationsPage() {
  const user = await getLoggedInUser()
  
  if (!user) {
    redirect('/')
  }

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
        <div className="flex flex-1 flex-col pb-8">
          <AutomationsView />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
