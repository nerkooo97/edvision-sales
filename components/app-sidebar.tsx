import { AppSidebarView, type AppSidebarViewProps } from "@/components/app-sidebar-view"
import { getSidebarAccess } from "@/lib/access/server/access"

/**
 * Sidebar shared by the sales and Project Hub pages. It looks up the user's access itself, so no page has
 * to pass it in: people without a Project Hub role never see the Hub menu, the Sales menu follows the Sales
 * role once roles are enforced, and only the main administrator sees the access screen. getLoggedInUser is
 * cached per request, so this costs no extra account lookup on pages that already call it.
 */
export async function AppSidebar(props: Omit<AppSidebarViewProps, "hubRole" | "salesAreas" | "isOrgAdmin">) {
  return <AppSidebarView {...props} {...(await getSidebarAccess())} />
}
