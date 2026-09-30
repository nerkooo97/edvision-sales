"use client"

import * as React from "react"

import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import Image from "next/image"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import {
  RiDashboardLine,
  RiBuilding2Line,
  RiUserSearchLine,
  RiMailLine,
  RiPhoneLine,
  RiHistoryLine,
  RiBarChartBoxLine,
  RiSettingsLine,
  RiQuestionLine,
  RiRobot2Line,
  RiCalendarEventLine,
  RiFolderChartLine,
  RiContactsBookLine,
  RiLayoutColumnLine,
  RiPieChartLine,
  RiRouteLine,
  RiTeamLine,
  RiUserSettingsLine,
} from "@remixicon/react"
import { canManageUsers } from "@/lib/hub/permissions"
import type { HubRole } from "@/lib/hub/roles"

const navData = {
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: <RiDashboardLine />,
    },
    {
      title: "Firme",
      url: "/companies",
      icon: <RiBuilding2Line />,
    },
    {
      title: "Leadovi",
      url: "/leads",
      icon: <RiUserSearchLine />,
    },
    {
      title: "Sastanci",
      url: "/meetings",
      icon: <RiCalendarEventLine />,
    },
    {
      title: "Email log",
      url: "/emails",
      icon: <RiMailLine />,
    },
    {
      title: "Telefonski pozivi",
      url: "/calls",
      icon: <RiPhoneLine />,
    },
    {
      title: "Dnevnik kontakata",
      url: "/contact-logs",
      icon: <RiHistoryLine />,
    },
    {
      title: "Automatizacije",
      url: "/automations",
      icon: <RiRobot2Line />,
    },
    {
      title: "Izvještaji",
      url: "/reports",
      icon: <RiBarChartBoxLine />,
    },
  ],
  navProjects: [
    {
      title: "Registar projekata",
      url: "/hub/projects",
      icon: <RiFolderChartLine />,
    },
    {
      title: "Kanban",
      url: "/hub/kanban",
      icon: <RiLayoutColumnLine />,
    },
    {
      title: "Vremenski tok",
      url: "/hub/timeline",
      icon: <RiRouteLine />,
    },
    {
      title: "Izvještaji projekata",
      url: "/hub/reports",
      icon: <RiPieChartLine />,
    },
    {
      title: "Klijenti",
      url: "/hub/clients",
      icon: <RiContactsBookLine />,
    },
    {
      title: "Timovi",
      url: "/hub/teams",
      icon: <RiTeamLine />,
    },
    {
      title: "Korisnici i uloge",
      url: "/hub/users",
      icon: <RiUserSettingsLine />,
      adminOnly: true,
    },
  ],
  navSecondary: [
    {
      title: "Podešavanja",
      url: "/settings",
      icon: <RiSettingsLine />,
    },
    {
      title: "Pomoć i podrška",
      url: "/help",
      icon: <RiQuestionLine />,
    },
  ],
}

export interface AppSidebarViewProps extends React.ComponentProps<typeof Sidebar> {
  user?: {
    name?: string
    email?: string
    avatar?: string
  } | null
  /** Project Hub role of the signed-in user; null hides the whole "Projekti" section. */
  hubRole: HubRole | null
}

export function AppSidebarView({ user, hubRole, ...props }: AppSidebarViewProps) {
  // Only a display choice: every Hub page and action checks access on the server as well.
  const projectItems = navData.navProjects.filter((item) => !item.adminOnly || (hubRole && canManageUsers(hubRole)))

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="h-10 hover:bg-transparent active:bg-transparent"
            >
              <a href="/dashboard" className="flex items-center gap-3">
                <div className="flex size-7 items-center justify-center shrink-0">
                  <Image
                    src="/logo-part.png"
                    alt="Edvision Logo"
                    width={28}
                    height={28}
                    className="w-auto h-6 object-contain"
                    priority
                  />
                </div>
                <span className="text-base font-semibold tracking-tight text-foreground group-data-[collapsible=icon]:hidden">
                  Edvision Hub
                </span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {/* The "Sales" heading only makes sense next to the "Projekti" section, so it is hidden with it. */}
        <NavMain items={navData.navMain} label={hubRole ? "Sales" : undefined} />
        {hubRole && <NavMain items={projectItems} label="Projekti" />}
        <NavSecondary items={navData.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  )
}
