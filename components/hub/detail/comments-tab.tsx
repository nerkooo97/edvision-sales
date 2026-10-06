"use client"

import * as React from "react"
import { RiChat3Line, RiDeleteBinLine, RiLoader4Line, RiSendPlaneLine } from "@remixicon/react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { addCommentAction, deleteCommentAction, listOlderCommentsAction } from "@/lib/hub/actions/comments"
import { canDeleteComment } from "@/lib/hub/permissions"
import type { HubComment, HubUser } from "@/lib/hub/types"
import { formatDateTime } from "@/lib/utils"
import type { NameResolver } from "./detail-types"
import { ShowOlderButton } from "./show-older-button"
import { useOlderItems } from "./use-older-items"

interface CommentsTabProps {
  projectId: string
  /** The newest page of comments, oldest first. */
  comments: HubComment[]
  hasMore: boolean
  currentUser: HubUser
  canComment: boolean
  nameOf: NameResolver
  onChanged: () => void
}

export function CommentsTab({
  projectId,
  comments: firstPage,
  hasMore: firstPageHasMore,
  currentUser,
  canComment,
  nameOf,
  onChanged,
}: CommentsTabProps) {
  const { items: comments, hasMore, isLoading, showOlder } = useOlderItems({
    firstPage,
    firstPageHasMore,
    loadOlder: (beforeId) => listOlderCommentsAction(projectId, beforeId),
    olderAt: "start",
  })
  const [text, setText] = React.useState("")
  const [isSending, setIsSending] = React.useState(false)
  const [deletingId, setDeletingId] = React.useState<string | null>(null)

  const send = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!text.trim()) return

    setIsSending(true)
    const result = await addCommentAction(projectId, { text })
    setIsSending(false)

    if (!result.success) return toast.error(result.error)
    setText("")
    onChanged()
  }

  const remove = async (commentId: string) => {
    setDeletingId(commentId)
    const result = await deleteCommentAction(commentId)
    setDeletingId(null)
    if (!result.success) return toast.error(result.error)
    onChanged()
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold">Komentari tima</h3>
        <p className="text-xs text-muted-foreground">Interna koordinacija vezana za ovaj projekat.</p>
      </div>

      {hasMore && <ShowOlderButton label="Prikaži starije komentare" isLoading={isLoading} onClick={showOlder} />}

      {comments.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-10 text-center text-muted-foreground">
          <RiChat3Line className="size-8 opacity-40" />
          <p className="text-sm">Još nema komentara.</p>
        </div>
      ) : (
        <ul className="space-y-2.5">
          {comments.map((comment) => (
            <li key={comment.$id} className="space-y-1 rounded-xl border border-border bg-card p-3.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-semibold">{nameOf(comment.author_id)}</span>
                  <span className="font-mono text-[11px] text-muted-foreground">{formatDateTime(comment.$createdAt)}</span>
                </div>
                {canDeleteComment(currentUser.role, comment.author_id === currentUser.id) && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 cursor-pointer text-muted-foreground hover:text-destructive"
                    title="Obriši komentar"
                    disabled={deletingId === comment.$id}
                    onClick={() => remove(comment.$id)}
                  >
                    {deletingId === comment.$id ? (
                      <RiLoader4Line className="size-3.5 animate-spin" />
                    ) : (
                      <RiDeleteBinLine className="size-3.5" />
                    )}
                  </Button>
                )}
              </div>
              <p className="text-sm leading-relaxed whitespace-pre-line text-muted-foreground">{comment.text}</p>
            </li>
          ))}
        </ul>
      )}

      {canComment ? (
        <form onSubmit={send} className="space-y-2">
          <Textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) send(event)
            }}
            rows={3}
            maxLength={3000}
            placeholder={`Komentariši kao ${currentUser.name}... (Ctrl+Enter za slanje)`}
          />
          <div className="flex justify-end">
            <Button type="submit" size="sm" disabled={isSending || !text.trim()} className="cursor-pointer gap-1.5">
              {isSending ? <RiLoader4Line className="size-4 animate-spin" /> : <RiSendPlaneLine className="size-4" />}
              Pošalji
            </Button>
          </div>
        </form>
      ) : (
        <p className="text-xs text-muted-foreground">Vaša uloga ne dozvoljava komentarisanje.</p>
      )}
    </div>
  )
}
