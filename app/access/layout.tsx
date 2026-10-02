import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Toaster } from "@/components/ui/sonner"
import { getCurrentAccess } from "@/lib/access/server/access"

// Shell for the access screen. The page itself checks that the user is the main administrator.
export default async function AccessLayout({ children }: { children: React.ReactNode }) {
  const access = await getCurrentAccess()
  if (!access) redirect("/")

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
      <AppSidebar variant="inset" user={{ name: access.name, email: access.email }} />
      <SidebarInset>{children}</SidebarInset>
      <Toaster richColors position="top-right" />
    </SidebarProvider>
  )
}
