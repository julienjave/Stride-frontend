import { useEffect, useRef } from 'react'

// While `active`, calls `onTick(now)` about four times a second, and once more
// the moment the page becomes visible again — `now` from `performance.now()`,
// the browser's MONOTONIC clock (milliseconds since the page loaded; it never
// jumps when the phone corrects its time — see timerRules.ts).
//
// A tick only says "look at the clock again": the timers calculate the time
// left from when they started, so a tick that comes late (a background tab,
// where browsers slow timers down to once a second or less) costs nothing but
// a late redraw. The visibility tick makes the screen right at once when the
// patient comes back to the tab.
//
// 250 ms, not 1,000: the clock shows whole seconds, and a tick up to a second
// late would make it skip a number now and then (0:12, 0:10). A quarter-second
// is often enough to look smooth and cheap for a phone.
export const TICK_MS = 250

export function useTicker(active: boolean, onTick: (now: number) => void): void {
  // The LATEST callback, kept in a ref: the interval below is set up once per
  // `active` change and always calls the newest one — otherwise it would keep
  // calling the function of the render it was created in (a "stale closure"),
  // or have to be torn down and set up again on every render.
  const latest = useRef(onTick)
  useEffect(() => {
    latest.current = onTick
  })

  useEffect(() => {
    if (!active) return
    const tick = () => latest.current(performance.now())
    const interval = window.setInterval(tick, TICK_MS)
    const onVisibility = () => {
      if (document.visibilityState === 'visible') tick()
    }
    document.addEventListener('visibilitychange', onVisibility)
    // The clean-up: when `active` turns false or the component leaves the
    // page (Next exercise), nothing keeps ticking.
    return () => {
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [active])
}