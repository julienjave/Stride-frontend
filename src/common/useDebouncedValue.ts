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

// Delays reacting to a fast-changing value (like every keystroke in a
// search box) until it's been STABLE for `delayMs` — the standard fix for
// "don't fire a network request on every single keystroke." The input
// itself stays instantly responsive (it's bound to the raw, undebounced
// state in whatever component uses this); only the value THIS hook
// returns lags behind on purpose, and that's the value wired into the
// actual search query.
//
// No new dependency needed for this — it's the same
// useState+useEffect+cleanup shape as useCurrentDateTime's interval,
// just resetting a timer instead of running one repeatedly.
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timeoutId = setTimeout(() => setDebounced(value), delayMs)
    // If `value` changes again before delayMs elapses (another
    // keystroke), this cleanup cancels the STALE timeout before it can
    // fire — only the most recent keystroke's timer ever actually
    // completes and updates `debounced`. Without this, every keystroke
    // would eventually fire its own update, defeating the whole point.
    return () => clearTimeout(timeoutId)
  }, [value, delayMs])

  return debounced
}