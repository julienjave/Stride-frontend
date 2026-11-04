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

// The loading states' delay (Phase 6, the loading / error pass, pass 2 —
// `Loading.tsx` says why 200 ms). A file of its own: a hook and a constant
// beside components would break Fast Refresh's rule for component files.

export const LOADING_DELAY_MS = 200

// `false` until `delayMs` has passed since the component appeared, then
// `true`. A component that leaves before then never shows anything. Each
// new appearance starts again (a "Try again" that shows the loading state
// a second time waits again — it may well be fast this time).
export function useDelayedShow(delayMs: number = LOADING_DELAY_MS): boolean {
  const [shown, setShown] = useState(false)
  useEffect(() => {
    const timer = setTimeout(() => setShown(true), delayMs)
    // Cleared if the component leaves first (the data came back): no
    // state update on an unmounted component, no stray timer.
    return () => clearTimeout(timer)
  }, [delayMs])
  return shown
}