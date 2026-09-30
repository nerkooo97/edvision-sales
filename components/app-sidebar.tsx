import { AppSidebarView, type AppSidebarViewProps } from "@/components/app-sidebar-view"
import { getLoggedInUser } from "@/lib/appwrite/server"
import { getRoleFromLabels } from "@/lib/hub/roles"

/**
 * Sidebar shared by the sales and Project Hub pages. It looks up the Project Hub role itself, so no page
 * has to pass it in and users without a role never see the Hub menu. getLoggedInUser is cached per
 * request, so this costs no extra account lookup on pages that already call it.
 */
export async function AppSidebar(props: Omit<AppSidebarViewProps, "hubRole">) {
  const account = await getLoggedInUser()
  return <AppSidebarView {...props} hubRole={getRoleFromLabels(account?.labels)} />
}
