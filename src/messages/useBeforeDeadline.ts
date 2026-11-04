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

import { useEffect, useState } from 'react'

// The longest wait setTimeout can hold: browsers (and Node) store the delay
// in a signed 32-bit integer, and a longer one — about 24.8 days — is NOT
// clamped to the maximum but treated as 1 ms: the timer fires at once.
// Fifteen minutes is far below it; a device whose clock runs weeks behind
// the server's would not be (its deadline looks weeks away). So a long wait
// is done in pieces of at most this, each checking the clock.
export const MAX_TIMEOUT_MS = 2 ** 31 - 1

// Whether it is still at or before `deadline` (epoch ms) — true until that
// moment, false from just after it; always false for null (no deadline:
// nothing to offer). The Delete button of a message asks this.
//
// ONE timer, set for the exact moment, not a clock ticking every second:
// the component re-renders once, when the answer changes, and never in
// between. The timer is cleared when the component goes away (a message
// scrolled out of a thread that unmounts, a conversation left) or when the
// deadline changes (a message read meanwhile: null — no timer at all).
//
// Why the state stores WHICH deadline passed, not a plain "passed" flag:
// the answer then belongs to that deadline. If the component were given
// another one later, it would start fresh instead of inheriting "passed"
// from the old one.
//
// "Now" is read in two places, never during a render (a render must give
// the same result every time it runs — oxlint's react/purity):
//   - once, when the component mounts (useState's initializer runs only
//     then): a message loaded already past its window never shows the
//     button, not even for one frame;
//   - in the effect, to know how long to wait.
export function useBeforeDeadline(deadline: number | null): boolean {
  const [mountedAt] = useState(() => Date.now())
  const [passed, setPassed] = useState<number | null>(null)

  useEffect(() => {
    if (deadline === null) return
    // A const: TypeScript's "not null" (from the line above) doesn't reach
    // into the functions below, a const's type does.
    const end = deadline
    let timer: ReturnType<typeof setTimeout>
    // When the timer fires, the CLOCK decides, not the timer: if it isn't
    // past the deadline yet (a wait cut to MAX_TIMEOUT_MS, below), wait
    // again for the rest.
    function check() {
      if (Date.now() > end) setPassed(end)
      else wait()
    }
    // +1: the deadline itself still counts as "before" (the server allows
    // exactly 15 minutes), so the answer changes the millisecond after. (The
    // exactness comes from check()'s clock test; the +1 only saves a wake-up
    // AT the deadline that would find it not passed yet and wait 1 ms more —
    // a mutation removing it survives, equivalent.) A deadline already
    // behind us gives 0: the timer fires at once. State is
    // set only from the timer's callback, never in the effect's body — a
    // setState there would render twice for nothing (react-hooks'
    // set-state-in-effect).
    function wait() {
      timer = setTimeout(check, Math.min(MAX_TIMEOUT_MS, Math.max(0, end - Date.now() + 1)))
    }
    wait()
    return () => clearTimeout(timer)
  }, [deadline])

  return deadline !== null && deadline >= mountedAt && passed !== deadline
}