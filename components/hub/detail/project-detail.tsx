"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getUserTeamIds, isParticipant } from "@/lib/hub/participation"
import { isRecurring } from "@/lib/hub/retainer"
import type { HubClient, HubMember, HubTeam, HubUser } from "@/lib/hub/types"
import { DeleteProjectDialog } from "../projects/delete-project-dialog"
import { ProjectFormSheet } from "../projects/form/project-form-sheet"
import { ActivityTab } from "./activity-tab"
import { AdBudgetTab } from "./ad-budget-tab"
import { CommentsTab } from "./comments-tab"
import { DeliveryTab } from "./delivery-tab"
import { DetailHeader } from "./detail-header"
import type { NameResolver, ProjectDetailData } from "./detail-types"
import { OverviewTab } from "./overview-tab"
import { PhasesTab } from "./phases-tab"
import { TasksTab } from "./tasks-tab"

interface ProjectDetailProps {
  data: ProjectDetailData
  members: HubMember[]
  teams: HubTeam[]
  clients: HubClient[]
  currentUser: HubUser
}

export function ProjectDetail({ data, members, teams, clients, currentUser }: ProjectDetailProps) {
  const router = useRouter()
  const { project, tasks, activities, comments, permissions } = data

  const [formOpen, setFormOpen] = React.useState(false)
  const [deleteOpen, setDeleteOpen] = React.useState(false)

  // All data comes from the server page, so every change ends with a refresh instead of local copies.
  const refresh = () => router.refresh()

  const nameOf: NameResolver = React.useCallback(
    (userId) => members.find((member) => member.id === userId)?.name ?? "Nepoznat korisnik",
    [members]
  )
  const userTeamIds = React.useMemo(() => getUserTeamIds(teams, currentUser.id), [teams, currentUser.id])
  const participant = isParticipant(project, currentUser.id, userTeamIds)

  const canEdit = permissions.editableFields === "all" || permissions.editableFields.length > 0

  return (
    <div className="space-y-6">
      <DetailHeader
        data={data}
        canEdit={canEdit}
        onEdit={() => setFormOpen(true)}
        onDelete={() => setDeleteOpen(true)}
        onStatusChanged={refresh}
      />

      <Tabs defaultValue="overview" className="gap-4">
        <TabsList variant="line" className="h-auto w-full justify-start overflow-x-auto">
          <TabsTrigger value="overview">Osnovno</TabsTrigger>
          <TabsTrigger value="phases">Faze i rokovi</TabsTrigger>
          {isRecurring(project) && <TabsTrigger value="delivery">Isporuka</TabsTrigger>}
          {data.showAdBudget && <TabsTrigger value="ad-budget">Oglasni budžet</TabsTrigger>}
          <TabsTrigger value="tasks">
            Zadaci
            <span className="ml-1.5 font-mono text-[10px] text-muted-foreground">
              {project.tasks_done}/{project.tasks_total}
            </span>
          </TabsTrigger>
          <TabsTrigger value="comments">
            Komentari
            <span className="ml-1.5 font-mono text-[10px] text-muted-foreground">{comments.length}</span>
          </TabsTrigger>
          <TabsTrigger value="activity">Historija</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab
            project={project}
            client={data.client}
            permissions={permissions}
            members={members}
            teams={teams}
            nameOf={nameOf}
            onSaved={refresh}
          />
        </TabsContent>
        <TabsContent value="phases">
          <PhasesTab project={project} />
        </TabsContent>
        {isRecurring(project) && (
          <TabsContent value="delivery">
            <DeliveryTab
              project={project}
              deliveries={data.deliveries}
              canLog={permissions.canLogDeliveries}
              onChanged={refresh}
            />
          </TabsContent>
        )}
        {data.showAdBudget && (
          <TabsContent value="ad-budget">
            <AdBudgetTab
              project={project}
              adBudgets={data.adBudgets}
              canManage={permissions.canManageAdBudget}
              onChanged={refresh}
            />
          </TabsContent>
        )}
        <TabsContent value="tasks">
          <TasksTab
            projectId={project.$id}
            tasks={tasks}
            members={members}
            currentUser={currentUser}
            isParticipant={participant}
            canCreateTask={permissions.canCreateTask}
            canDeleteTask={permissions.canDeleteTask}
            nameOf={nameOf}
            onChanged={refresh}
          />
        </TabsContent>
        <TabsContent value="comments">
          <CommentsTab
            projectId={project.$id}
            comments={comments}
            currentUser={currentUser}
            canComment={permissions.canComment}
            nameOf={nameOf}
            onChanged={refresh}
          />
        </TabsContent>
        <TabsContent value="activity">
          <ActivityTab activities={activities} nameOf={nameOf} />
        </TabsContent>
      </Tabs>

      <ProjectFormSheet
        open={formOpen}
        onOpenChange={setFormOpen}
        target={{ mode: "edit", projectId: project.$id }}
        members={members}
        teams={teams}
        clients={clients}
        currentUser={currentUser}
        userTeamIds={userTeamIds}
        onSaved={refresh}
      />

      <DeleteProjectDialog
        project={project}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onDeleted={() => router.push("/hub/projects")}
      />
    </div>
  )
}
