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
  RiBankCardLine,
  RiUserSettingsLine,
} from "@remixicon/react"
import type { SalesArea } from "@/lib/access/sales-permissions"
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

/** Which Sales area each menu entry belongs to, so the menu can follow the user's Sales role. */
const AREA_BY_URL: Record<string, SalesArea> = {
  "/dashboard": "dashboard",
  "/companies": "companies",
  "/leads": "leads",
  "/meetings": "meetings",
  "/emails": "emails",
  "/calls": "calls",
  "/contact-logs": "contact-logs",
  "/automations": "automations",
  "/reports": "reports",
  "/settings": "settings",
  "/help": "help",
}

const SUBSCRIPTIONS_ITEM = {
  title: "Aktivne pretplate",
  url: "/hub/subscriptions",
  icon: <RiBankCardLine />,
}

const ACCESS_ITEM = {
  title: "Korisnici i pristup",
  url: "/access",
  icon: <RiUserSettingsLine />,
}

export interface AppSidebarViewProps extends React.ComponentProps<typeof Sidebar> {
  user?: {
    name?: string
    email?: string
    avatar?: string
  } | null
  /** Project Hub role of the signed-in user; null hides the whole "Projekti" section. */
  hubRole: HubRole | null
  /** Sales areas the user may open; null shows them all (Sales roles are not enforced yet). */
  salesAreas: SalesArea[] | null
  /** Only the main administrator sees the access screen. */
  isOrgAdmin: boolean
}

export function AppSidebarView({ user, hubRole, salesAreas, isOrgAdmin, ...props }: AppSidebarViewProps) {
  // Only a display choice: every page and server action checks access on the server as well.
  const allowed = (item: { url: string }) => !salesAreas || salesAreas.includes(AREA_BY_URL[item.url])
  const salesItems = navData.navMain.filter(allowed)
  // Company-wide management: each entry shows only for the people allowed to use it, and the section
  // disappears when no entry is left.
  const adminItems = [
    ...(hubRole !== null ? [SUBSCRIPTIONS_ITEM] : []),
    ...(isOrgAdmin ? [ACCESS_ITEM] : []),
  ]
  const secondaryItems = navData.navSecondary.filter(allowed)

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
        {salesItems.length > 0 && <NavMain items={salesItems} label={hubRole ? "Sales" : undefined} />}
        {hubRole && <NavMain items={navData.navProjects} label="Projekti" />}
        {adminItems.length > 0 && <NavMain items={adminItems} label="Administracija" />}
        <NavSecondary items={secondaryItems} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  )
}
