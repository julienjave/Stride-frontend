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

import { type RefObject, useEffect, useRef } from 'react'
import { takeWorkedRetry } from './retryMemory'

// Keyboard focus after a "Try again" that WORKED (Phase 6, the load-error
// pass, 2026-10-28 — `deferred-improvements.md`, "After a Try again that
// WORKS, keyboard focus is at the top of the page").
//
// The problem: the pressed button belongs to the error block, which is
// gone once the content arrives — and focus goes with it, back to the
// document. A keyboard user would start again from the top of the page; a
// screen-reader user hears nothing about what appeared. Moving focus to the
// new content's HEADING fixes both: the reader announces it ("My patients,
// heading level 1"), and the next Tab goes to what follows it.
//
// Used on the heading of whatever replaces a LoadError — a page's <h1>, a
// section's <h2>:
//
//   const heading = useRetryFocus<HTMLHeadingElement>('your patients', patients.isSuccess)
//   <h1 ref={heading} tabIndex={-1} className="… outline-none">My patients</h1>
//
// - `what`: the SAME words the LoadError was given — that's how the press is
//   matched to its content (retryMemory.ts).
// - `shown`: whether the content (and so the heading) is on screen NOW —
//   usually the query's `isSuccess`. Required, because the hook is called by
//   a component that is ALREADY on screen while the page loads (a page's view
//   shows "Loading…", then the error, then "Loading…" again during the retry,
//   then the content — all one mounted component): an effect that ran only
//   at mount would fire during "Loading…", before the heading exists. The
//   effect runs again each time `shown` changes, so it fires on the render
//   where the content appears.
// - `tabIndex={-1}` on the element: a heading isn't focusable by itself; -1
//   makes it focusable by code but keeps it out of the Tab order. And
//   `outline-none`: a focus ring around a heading would look like a control
//   to press.
//
// Nothing happens when the content arrives without a press (the ordinary
// first load): focus stays where the browser put it, as on any page.
export function useRetryFocus<T extends HTMLElement>(what: string, shown: boolean) {
  const target = useRef<T>(null)
  useFocusAfterRetry(target, what, shown)
  return target
}

// The same, for a heading that isn't this component's own: several parts
// that can each fail and recover separately, under ONE heading (the patient
// home's Today section: one row per program, and a row that comes back may
// have nothing to show today — it vanishes — so focus goes to the
// section's heading). Each part says when ITS content is shown; whichever
// was retried takes the memory. `RetryFocus` (RetryFocus.tsx) wraps this
// as a component, to place one per part in a list.
export function useFocusAfterRetry(target: RefObject<HTMLElement | null>, what: string, shown: boolean) {
  useEffect(() => {
    if (shown && takeWorkedRetry(what)) target.current?.focus()
  }, [target, what, shown])
}