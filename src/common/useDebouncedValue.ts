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