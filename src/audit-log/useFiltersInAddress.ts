import { useState } from 'react'
import { useLocation, useSearchParams } from 'react-router'
import { readFilters, writeFilters, type AuditLogFilters } from './auditFilters'

// The audit log's filters, read from the page's address and written back to
// it (auditFilters.ts says why the address).
//
// Why not just `readFilters(searchParams)` and `setSearchParams(…)`? Found in
// the live check (2026-10-22): under the app's data router a navigation is
// ASYNCHRONOUS — when a click's handler returns, the address hasn't changed
// yet. React then puts every controlled input back to what its props say:
// a radio just clicked read "not checked" for ~20–60 ms (measured in
// Chromium), then "checked" when the navigation landed — a flicker a screen
// reader can announce, and a date being typed could lose a keystroke.
// (`flushSync: true` on the navigation didn't help: it changes how the
// landing is applied, not when.)
//
// So the choice is remembered at once, in React state — set inside the
// event, it renders before React restores the inputs — and forgotten at the
// NEXT navigation, whatever it is: the new filters landing, or Back /
// Forward. From then on the address is the truth again.
//
// "The next navigation" = the location's `key` changing: every history
// entry has its own. (Comparing ADDRESSES isn't enough — Back returns to the
// very address the click was made on, and a test caught the old choice
// coming back with it.) The reset happens DURING RENDER, comparing with the
// key seen last time — React's documented way to adjust state when
// something changes ("You might not need an effect"): an effect would run
// after the paint, and show the stale choice for a frame.
//
// Tested where it can be: Back after a change (AuditLogPage.test.tsx — the
// old choice must not return). The flicker itself can't be reproduced in
// jsdom — even a data router there navigates within the click (no loaders,
// nothing to wait for), so a test passed with and without the fix; it was
// measured in Chromium instead (the radio's `checked` sampled every 10 ms
// after a click: false at ~25 ms before, true throughout after).
export function useFiltersInAddress() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { key } = useLocation()
  const [pending, setPending] = useState<AuditLogFilters | null>(null)
  const [seenKey, setSeenKey] = useState(key)

  if (seenKey !== key) {
    setSeenKey(key)
    setPending(null)
  }

  const show = (next: AuditLogFilters) => {
    setPending(next)
    setSearchParams(writeFilters(next))
  }

  // (The render that queued the reset above is thrown away by React and run
  // again with `pending` already null — the old choice never reaches the
  // screen.)
  const filters = pending ?? readFilters(searchParams)
  return [filters, show] as const
}