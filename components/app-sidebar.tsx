"use client"

import * as React from "react"

import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
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
  RiHistoryLine,
  RiSparklingLine,
  RiSettingsLine,
  RiQuestionLine,
  RiPhoneLine,
} from "@remixicon/react"

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
      "title": "Leadovi",
      "url": "/leads",
      "icon": <RiUserSearchLine />,
    },
    {
      "title": "Za nazvati (Pozivi)",
      "url": "/calls",
      "icon": <RiPhoneLine />,
    },
    {
      title: "Dnevnik kontakata",
      url: "/contact-logs",
      icon: <RiHistoryLine />,
    },
  ],
  navSecondary: [
    {
      title: "Podešavanja",
      url: "/settings",
      icon: <RiSettingsLine />,
    },
    {
      title: "Pomoć & Podrška",
      url: "/help",
      icon: <RiQuestionLine />,
    },
  ],
}

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  user?: {
    name?: string
    email?: string
    avatar?: string
  } | null
}

export function AppSidebar({ user, ...props }: AppSidebarProps) {
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:p-1.5!"
            >
              <a href="/dashboard" className="flex items-center gap-2">
                <div className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold shadow-xs">
                  <RiSparklingLine className="size-4" />
                </div>
                <span className="text-base font-semibold tracking-tight">EdVision Sales</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navData.navMain} />
        <NavSecondary items={navData.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  )
}
