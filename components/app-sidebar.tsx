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
      title: "Leadovi",
      url: "/leads",
      icon: <RiUserSearchLine />,
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

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  user?: {
    name?: string
    email?: string
    avatar?: string
  } | null
}

export function AppSidebar({ user, ...props }: AppSidebarProps) {
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
                  Edvision Sales
                </span>
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
