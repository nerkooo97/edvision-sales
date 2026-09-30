'use server';

import { hubErrors } from '../errors';
import { canComment, canDeleteComment } from '../permissions';
import { commentSchema, idSchema } from '../schemas';
import { loadProjectAccess } from '../server/access';
import { logActivity } from '../server/activities';
import { createComment, deleteComment, getComment } from '../server/comments';
import { requireHubUser } from '../server/session';
import { parseInput, runAction } from './run-action';

export async function addCommentAction(projectId: unknown, input: unknown) {
  return runAction(async () => {
    const user = await requireHubUser();
    if (!canComment(user.role)) throw hubErrors.forbidden('komentarisanje');

    const id = parseInput(idSchema, projectId);
    const { text } = parseInput(commentSchema, input);
    await loadProjectAccess(user, id);

    const comment = await createComment({ projectId: id, authorId: user.id, text });
    await logActivity({ projectId: id, userId: user.id, type: 'comment_added', details: '' });
    return comment;
  });
}

export async function deleteCommentAction(commentId: unknown) {
  return runAction(async () => {
    const user = await requireHubUser();
    const id = parseInput(idSchema, commentId);

    const comment = await getComment(id);
    if (!comment) throw hubErrors.notFound('Komentar');
    if (!canDeleteComment(user.role, comment.author_id === user.id)) throw hubErrors.forbidden('brisanje komentara');

    await deleteComment(id);
    return { id };
  });
}
