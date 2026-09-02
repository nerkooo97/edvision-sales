import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { getLoggedInUser } from "@/lib/appwrite/server"
import { getDashboardStats } from "@/lib/appwrite/stats"
import { DashboardKpiCards } from "@/components/dashboard/dashboard-kpi-cards"
import { DashboardPipelineChart } from "@/components/dashboard/dashboard-pipeline-chart"
import { DashboardFollowupTasks } from "@/components/dashboard/dashboard-followup-tasks"
import { DashboardMeetingReminders } from "@/components/dashboard/dashboard-meeting-reminders"
import { DashboardActivityFeed } from "@/components/dashboard/dashboard-activity-feed"
import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Kontrolna Tabla | Edvision Sales",
  description: "Pregled prodajnog toka, leadova, kontakata i zadataka",
}

export default async function Page() {
  const user = await getLoggedInUser()

  if (!user) {
    redirect('/')
  }

  const cookieStore = await cookies()
  const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false"

  const stats = await getDashboardStats()

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
        <div className="flex flex-1 flex-col pb-8">
          <div className="flex flex-col gap-6 py-4 md:py-6">
            {/* 1. Live KPI Summary Cards */}
            <DashboardKpiCards stats={stats} />

            {/* 2. Pipeline Funnel & Today's Follow-up Tasks */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 px-4 lg:px-6">
              <DashboardPipelineChart stats={stats} />
              <DashboardFollowupTasks tasks={stats.todayFollowUps} />
              <DashboardMeetingReminders reminders={stats.todayMeetingReminders} />
            </div>

            {/* 3. Live Recent Activity Stream & AI Scored Leads */}
            <DashboardActivityFeed
              recentActivities={stats.recentActivities}
              recentLeads={stats.recentLeads}
            />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
