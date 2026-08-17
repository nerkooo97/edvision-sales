import { getLoggedInUser } from "@/lib/appwrite/server"
import { getContactLogs } from "@/lib/appwrite/contact-logs"
import { getCompanies } from "@/lib/appwrite/companies"
import { getLeads } from "@/lib/appwrite/leads"
import { redirect } from "next/navigation"
import { AppSidebar } from "@/components/app-sidebar"
import { ContactLogsTable } from "@/components/contact-logs/contact-logs-table"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Dnevnik Kontakata | EdVision Sales",
  description: "Evidencija i historija komunikacija, poziva i emailova",
}

interface ContactLogsPageProps {
  searchParams: Promise<{
    page?: string
    channel?: string
    status?: string
  }>
}

export default async function ContactLogsPage({ searchParams }: ContactLogsPageProps) {
  const user = await getLoggedInUser()

  if (!user) {
    redirect('/')
  }

  const resolvedSearchParams = await searchParams
  const page = Math.max(1, parseInt(resolvedSearchParams.page || "1", 10) || 1)
  const channel = (resolvedSearchParams.channel || "").trim()
  const status = (resolvedSearchParams.status || "").trim()
  const limit = 15

  const [{ contactLogs, total, totalPages }, { companies }, { leads }] = await Promise.all([
    getContactLogs({ page, limit, channel, status }),
    getCompanies({ limit: 100 }),
    getLeads({ limit: 100 }),
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
            <h1 className="text-base font-semibold">Dnevnik Kontakata</h1>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-4 lg:p-6 space-y-6 w-full min-w-0 max-w-full overflow-hidden">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Dnevnik Kontakata</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Evidencija svih obavljenih poziva, poslanih emailova, sastanaka i dogovora.
            </p>
          </div>

          <ContactLogsTable
            contactLogs={contactLogs}
            companies={companies}
            leads={leads}
            total={total}
            page={page}
            limit={limit}
            totalPages={totalPages}
            channel={channel}
            status={status}
          />
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
