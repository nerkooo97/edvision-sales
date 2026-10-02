import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { AppSidebar } from "@/components/app-sidebar"
import { HubNoAccess } from "@/components/hub/hub-no-access"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Toaster } from "@/components/ui/sonner"
import { resolveAccess } from "@/lib/access/resolve"
import { getSessionUser } from "@/lib/hub/server/session"

// Shared shell for every Project Hub page. This layout is only a convenience gate: it does not
// re-run on client-side navigation, so pages and server actions each check access themselves.
export default async function HubLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser()
  if (!user) redirect("/")

  const hasHubRole = resolveAccess(user.labels).roles.hub !== null

  const cookieStore = await cookies()
  const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false"

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
      <SidebarInset>{hasHubRole ? children : <HubNoAccess />}</SidebarInset>
      <Toaster richColors position="top-right" />
    </SidebarProvider>
  )
}
