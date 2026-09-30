import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { NotificationsBell } from "./notifications-bell"

export function HubPageHeader({ title, showNotifications = true }: { title: string; showNotifications?: boolean }) {
  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-2 px-4 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mx-2 data-[orientation=vertical]:h-4" />
        <h1 className="text-base font-semibold">{title}</h1>
        {/* Screens shown without Hub access must not call the (access-checked) notifications action. */}
        {showNotifications && (
          <div className="ml-auto">
            <NotificationsBell />
          </div>
        )}
      </div>
    </header>
  )
}
