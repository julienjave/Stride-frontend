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