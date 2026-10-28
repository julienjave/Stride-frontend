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