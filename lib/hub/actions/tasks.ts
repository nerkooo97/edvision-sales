'use server';

import { hubErrors } from '../errors';
import {
  TEAM_MEMBER_TASK_FIELDS,
  canCreateTask,
  canDeleteTask,
  canUpdateTask,
} from '../permissions';
import { createTaskSchema, idSchema, updateTaskSchema } from '../schemas';
import { loadProjectAccess } from '../server/access';
import { logActivity } from '../server/activities';
import { createTask, deleteTask, getTask, listOpenTasksForAssignee, updateTask } from '../server/tasks';
import { requireHubUser } from '../server/session';
import { getMember } from '../server/users';
import { parseInput, runAction } from './run-action';

async function assertAssigneeIsHubMember(assigneeId: string) {
  const assignee = await getMember(assigneeId);
  if (!assignee?.role) throw hubErrors.validation('Odabrana osoba nema pristup modulu za projekte.');
}

/** Unfinished tasks assigned to the current user. */
export async function listMyTasksAction() {
  return runAction(async () => {
    const user = await requireHubUser();
    return listOpenTasksForAssignee(user.id);
  });
}

export async function createTaskAction(projectId: unknown, input: unknown) {
  return runAction(async () => {
    const user = await requireHubUser();
    const id = parseInput(idSchema, projectId);
    const data = parseInput(createTaskSchema, input);
    const { isParticipant } = await loadProjectAccess(user, id);

    if (!canCreateTask(user.role, isParticipant)) throw hubErrors.forbidden('dodavanje zadataka');
    await assertAssigneeIsHubMember(data.assignee_id);

    const task = await createTask(id, data, user.id);
    await logActivity({ projectId: id, userId: user.id, type: 'task_created', details: task.title });
    return task;
  });
}

export async function updateTaskAction(taskId: unknown, input: unknown) {
  return runAction(async () => {
    const user = await requireHubUser();
    const id = parseInput(idSchema, taskId);
    const patch = parseInput(updateTaskSchema, input);

    const task = await getTask(id);
    if (!task) throw hubErrors.notFound('Zadatak');
    const { isParticipant } = await loadProjectAccess(user, task.project_id);

    if (!canUpdateTask(user.role, isParticipant, task.assignee_id === user.id)) {
      throw hubErrors.forbidden('izmjenu ovog zadatka');
    }

    const changedFields = Object.keys(patch).filter((key) => patch[key as keyof typeof patch] !== undefined);
    if (changedFields.length === 0) return task;

    if (
      user.role === 'team_member' &&
      !changedFields.every((field) => (TEAM_MEMBER_TASK_FIELDS as readonly string[]).includes(field))
    ) {
      throw hubErrors.forbidden('izmjenu ovih podataka zadatka');
    }
    if (patch.assignee_id && patch.assignee_id !== task.assignee_id) {
      await assertAssigneeIsHubMember(patch.assignee_id);
    }

    const updated = await updateTask(task, patch);
    await logActivity({ projectId: task.project_id, userId: user.id, type: 'task_updated', details: task.title });
    return updated;
  });
}

export async function deleteTaskAction(taskId: unknown) {
  return runAction(async () => {
    const user = await requireHubUser();
    const id = parseInput(idSchema, taskId);

    const task = await getTask(id);
    if (!task) throw hubErrors.notFound('Zadatak');
    const { isParticipant } = await loadProjectAccess(user, task.project_id);

    if (!canDeleteTask(user.role, isParticipant)) throw hubErrors.forbidden('brisanje zadataka');

    await deleteTask(task);
    await logActivity({ projectId: task.project_id, userId: user.id, type: 'task_deleted', details: task.title });
    return { id: task.$id };
  });
}
