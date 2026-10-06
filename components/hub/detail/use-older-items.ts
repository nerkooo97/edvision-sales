"use client"

import * as React from "react"
import { toast } from "sonner"
import type { ActionResult } from "@/lib/hub/actions/run-action"
import type { HubPage } from "@/lib/hub/types"

interface OlderItemsOptions<T> {
  /** The first page, as loaded with the screen (and reloaded on refresh). */
  firstPage: T[]
  firstPageHasMore: boolean
  /** Loads the page of rows older than `beforeId`. */
  loadOlder: (beforeId: string) => Promise<ActionResult<HubPage<T>>>
  /** Where older rows go: "end" for newest-first lists, "start" for oldest-first ones. */
  olderAt: "start" | "end"
}

/**
 * A list read in steps: the first page comes with the screen, older pages are fetched on request.
 * When the first page is reloaded (after adding or deleting a row) the older pages are dropped, so the
 * list never has a gap; the user can open them again.
 */
export function useOlderItems<T extends { $id: string }>({ firstPage, firstPageHasMore, loadOlder, olderAt }: OlderItemsOptions<T>) {
  const [older, setOlder] = React.useState<T[]>([])
  const [olderHasMore, setOlderHasMore] = React.useState<boolean | null>(null)
  const [isLoading, setIsLoading] = React.useState(false)
  const [shownFirstPage, setShownFirstPage] = React.useState(firstPage)

  if (shownFirstPage !== firstPage) {
    setShownFirstPage(firstPage)
    setOlder([])
    setOlderHasMore(null)
  }

  const items = React.useMemo(() => {
    const firstIds = new Set(firstPage.map((item) => item.$id))
    const rest = older.filter((item) => !firstIds.has(item.$id))
    return olderAt === "end" ? [...firstPage, ...rest] : [...rest, ...firstPage]
  }, [firstPage, older, olderAt])

  const hasMore = olderHasMore ?? firstPageHasMore
  const oldest = olderAt === "end" ? items.at(-1) : items[0]

  const showOlder = async () => {
    if (!oldest || isLoading) return
    setIsLoading(true)
    const result = await loadOlder(oldest.$id)
    setIsLoading(false)
    if (!result.success) return toast.error(result.error)
    setOlder((current) => (olderAt === "end" ? [...current, ...result.data.items] : [...result.data.items, ...current]))
    setOlderHasMore(result.data.hasMore)
  }

  return { items, hasMore, isLoading, showOlder }
}
