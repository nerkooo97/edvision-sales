import { getLoggedInUser } from "@/lib/appwrite/server"
import { redirect } from "next/navigation"
import { AppSidebar } from "@/components/app-sidebar"
import { HelpView } from "@/components/help/help-view"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Pomoć & Podrška | EdVision Sales",
  description: "Vodič kroz korištenje ED Vision Sales sistema, automatizovane tokove i FAQ",
}

export default async function HelpPage() {
  const user = await getLoggedInUser()

  if (!user) {
    redirect("/")
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
      <SidebarInset>
        {/* Header */}
        <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
          <div className="flex w-full items-center gap-2 px-4 lg:px-6">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mx-2 data-[orientation=vertical]:h-4" />
            <h1 className="text-base font-semibold">Pomoć & Podrška</h1>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-4 lg:p-6 w-full min-w-0 max-w-full overflow-y-auto">
          <HelpView />
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
