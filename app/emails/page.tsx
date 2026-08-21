import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { getLoggedInUser } from "@/lib/appwrite/server"
import { getEmailLogs } from "@/lib/appwrite/emails"
import { EmailLogsView } from "@/components/emails/email-logs-view"
import { redirect } from "next/navigation"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Email log | Edvision Sales",
  description: "Pregled svih poslanih cold emailova i njihovih statusa",
}

export default async function EmailsPage() {
  const user = await getLoggedInUser()

  if (!user) {
    redirect("/")
  }

  const emailLogs = await getEmailLogs()

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
          <EmailLogsView initialLogs={emailLogs} />
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
