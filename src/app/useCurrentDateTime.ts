import { useEffect, useState } from 'react'

// A live clock for the "Today" column. Updates once a MINUTE, not every
// second — the display only ever shows minute-level precision (see
// PractitionerHomePage), so re-rendering every second would just burn
// CPU for a value the person would never actually see change between
// renders. If a future design ever needs seconds displayed, this
// interval is the one place to change.
export function useCurrentDateTime() {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const intervalId = setInterval(() => setNow(new Date()), 60_000)
    // Cleanup function: React calls this when the component using this
    // hook unmounts (navigates away from the dashboard, say). Without
    // it, the interval would keep firing forever in the background,
    // updating state on a component that no longer exists — a classic
    // memory leak / "setState on unmounted component" warning source.
    return () => clearInterval(intervalId)
  }, [])

  return now
}