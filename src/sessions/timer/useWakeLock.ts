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

import { useEffect } from 'react'

// Keeps the phone's screen on while `active` — the Screen Wake Lock API
// (`navigator.wakeLock.request('screen')`). A patient holding a plank can't
// tap the screen every 30 seconds to stop it locking.
//
// How the API works: `request('screen')` returns a promise of a SENTINEL — a
// handle that says "the lock is held"; `sentinel.release()` gives it back. Three
// things make it more than one line:
//   1. It's ASYNC, and `active` can turn false before the promise settles (the
//      patient pauses at once). The sentinel that arrives then is released
//      straight away — the `cancelled` flag below.
//   2. The BROWSER releases the lock itself whenever the page is hidden
//      (another app, the screen switched off by hand). It doesn't come back by
//      itself: when the page is visible again and the timer still wants it,
//      it's asked for again.
//   3. It can be REFUSED (battery saver on, a browser policy, an iframe) or
//      simply MISSING (Firefox before 126, older Safari). Then the screen
//      may lock — exactly what it did before this feature; nothing breaks, so
//      a refusal is ignored rather than shown.
//
// Nothing to undo after leaving the page: the clean-up releases the lock when
// `active` turns false or the component unmounts (the next exercise).
export function useWakeLock(active: boolean): void {
  useEffect(() => {
    if (!active) return
    // Not in every browser — and TypeScript's types say it always is.
    if (!('wakeLock' in navigator)) return
    const wakeLock = navigator.wakeLock

    let sentinel: WakeLockSentinel | null = null
    let pending = false
    let cancelled = false

    const request = () => {
      // One request at a time, and none while a lock is held.
      if (pending || (sentinel && !sentinel.released)) return
      pending = true
      wakeLock
        .request('screen')
        .then((granted) => {
          if (cancelled) {
            granted.release().catch(() => {})
          } else {
            sentinel = granted
          }
        })
        .catch(() => {})
        .finally(() => {
          pending = false
        })
    }

    request()
    const onVisibility = () => {
      if (document.visibilityState === 'visible') request()
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisibility)
      if (sentinel && !sentinel.released) sentinel.release().catch(() => {})
    }
  }, [active])
}