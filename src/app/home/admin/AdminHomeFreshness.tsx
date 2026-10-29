import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { updatedAtText } from './adminHomeText'
import { useAdminMetrics, useRecentChanges } from './useAdminHome'

// "Updated 14:05 · refreshes every minute" and a Refresh button, above the
// admin home's Metrics and Recent activity (Phase 6.5, decided with the
// person 2026-10-29: both the one-minute refresh AND a button).
//
// The time is the OLDER of the two answers' (`dataUpdatedAt`: when that
// query last got data), so it never claims more freshness than the page
// has. A refresh that FAILED while data was on screen keeps that data (the
// sections show it rather than an error) — and this line says so, with the
// time of what is shown, instead of "Updated" looking current.
export function AdminHomeFreshness() {
  const metrics = useAdminMetrics()
  const changes = useRecentChanges()
  // A press of Refresh in progress. Not `isFetching`: the one-minute
  // refresh would make the button flicker "Refreshing…" every minute.
  const [refreshing, setRefreshing] = useState(false)
  // Said once, after a press — never by the one-minute refresh (a status
  // that changed every minute would interrupt a screen reader for nothing).
  const [announcement, setAnnouncement] = useState('')

  const shown = [metrics, changes].filter((query) => query.data !== undefined)
  // Nothing loaded yet: the sections show their own loading or error state.
  if (shown.length === 0) return null

  const since = updatedAtText(Math.min(...shown.map((query) => query.dataUpdatedAt)))
  const stale = shown.some((query) => query.isError)

  async function refresh() {
    if (refreshing) return
    setRefreshing(true)
    setAnnouncement('')
    const results = await Promise.all([metrics.refetch(), changes.refetch()])
    setRefreshing(false)
    setAnnouncement(
      results.some((result) => result.isError)
        ? "Couldn't refresh. Try again in a moment."
        : `Refreshed at ${updatedAtText(Date.now())}.`,
    )
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="text-sm text-muted-foreground">
        {stale
          ? `Couldn't refresh. Showing the numbers from ${since}.`
          : `Updated ${since} · refreshes every minute`}
      </p>
      {/* aria-disabled, not disabled: a disabled button loses keyboard focus
          in Chromium, and the person who pressed it would be thrown to the
          top of the page (the load-error pass's lesson, decisions §15). */}
      <Button
        type="button"
        variant="outline"
        size="sm"
        aria-disabled={refreshing}
        onClick={() => void refresh()}
      >
        {refreshing ? 'Refreshing…' : 'Refresh'}
      </Button>
      {/* Always in the page, empty until a press: a status region is
          announced when its text CHANGES. */}
      <p role="status" className="sr-only">
        {announcement}
      </p>
    </div>
  )
}