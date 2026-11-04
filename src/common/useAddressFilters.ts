/*
    Copyright 2026 Julien Javelaud

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

        http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
*/
// -----------------------------------------------------------------------------------------------------------

import { useState } from 'react'
import { useLocation, useSearchParams } from 'react-router'

// Filters kept in the page's ADDRESS — read from it and written back to it
// — so Back, a reload and a shared link all show the same view. Generic
// since Phase 6.5 (the Users page, 2026-10-29): the audit log's hook, given
// the page's own `read` / `write` (an address ↔ filters pair of pure
// functions, tested on their own).
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
//
// `replace` (the Users page's search, typed letter by letter): the new view
// REPLACES the current history entry instead of adding one, so Back doesn't
// step through "a", "an", "ana".
export interface ShowOptions {
  replace?: boolean
}

export function useAddressFilters<T>(
  read: (params: URLSearchParams) => T,
  write: (filters: T) => URLSearchParams,
) {
  const [searchParams, setSearchParams] = useSearchParams()
  const { key } = useLocation()
  const [pending, setPending] = useState<T | null>(null)
  const [seenKey, setSeenKey] = useState(key)

  if (seenKey !== key) {
    setSeenKey(key)
    setPending(null)
  }

  const show = (next: T, options: ShowOptions = {}) => {
    setPending(next)
    setSearchParams(write(next), { replace: options.replace === true })
  }

  // (The render that queued the reset above is thrown away by React and run
  // again with `pending` already null — the old choice never reaches the
  // screen.)
  const filters = pending ?? read(searchParams)
  return [filters, show] as const
}