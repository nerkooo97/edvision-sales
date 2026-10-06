"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { RiArrowRightSLine } from "@remixicon/react"
import { Collapsible } from "radix-ui"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"

export interface NavItem {
  title: string
  url: string
  icon?: React.ReactNode
  /** An item with children is a group: it expands instead of navigating. */
  children?: { title: string; url: string }[]
}

const isUrlActive = (pathname: string, url: string) =>
  url !== "#" && (pathname === url || (url !== "/dashboard" && pathname.startsWith(url + "/")))

function NavGroupItem({ item, pathname }: { item: NavItem & { children: NonNullable<NavItem["children"]> }; pathname: string }) {
  const hasActiveChild = item.children.some((child) => isUrlActive(pathname, child.url))
  const [open, setOpen] = React.useState(hasActiveChild)

  // Reaching a page of the group from elsewhere (link, back button) expands it as well.
  const [wasActive, setWasActive] = React.useState(hasActiveChild)
  if (wasActive !== hasActiveChild) {
    setWasActive(hasActiveChild)
    if (hasActiveChild) setOpen(true)
  }

  return (
    <Collapsible.Root asChild open={open} onOpenChange={setOpen}>
      <SidebarMenuItem>
        <Collapsible.Trigger asChild>
          <SidebarMenuButton isActive={hasActiveChild && !open} tooltip={item.title} className="cursor-pointer">
            {item.icon}
            <span>{item.title}</span>
            <RiArrowRightSLine className="ml-auto transition-transform group-data-[collapsible=icon]:hidden data-[state=open]:rotate-90" data-state={open ? "open" : "closed"} />
          </SidebarMenuButton>
        </Collapsible.Trigger>
        <Collapsible.Content>
          <SidebarMenuSub>
            {item.children.map((child) => (
              <SidebarMenuSubItem key={child.url}>
                <SidebarMenuSubButton asChild isActive={isUrlActive(pathname, child.url)}>
                  <Link href={child.url}>
                    <span>{child.title}</span>
                  </Link>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            ))}
          </SidebarMenuSub>
        </Collapsible.Content>
      </SidebarMenuItem>
    </Collapsible.Root>
  )
}

export function NavMain({ items, label }: { items: NavItem[]; label?: string }) {
  const pathname = usePathname()

  return (
    <SidebarGroup>
      {label && <SidebarGroupLabel>{label}</SidebarGroupLabel>}
      <SidebarGroupContent className="flex flex-col gap-2">
        <SidebarMenu>
          {items.map((item) => {
            if (item.children) {
              return <NavGroupItem key={item.title} item={{ ...item, children: item.children }} pathname={pathname} />
            }
            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton asChild isActive={isUrlActive(pathname, item.url)} tooltip={item.title}>
                  <Link href={item.url}>
                    {item.icon}
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
