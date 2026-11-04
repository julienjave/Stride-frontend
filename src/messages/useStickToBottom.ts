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

import { useEffect, useLayoutEffect, useRef, type RefObject } from 'react'

// How close to the bottom (in px) still counts as "reading the newest".
const NEAR_BOTTOM = 48

// Keeps a scrolling thread where a chat should be:
//   - opened at the BOTTOM (the newest message);
//   - a new message scrolls it down — if the reader was already at the
//     bottom, or if the message is their own (they just sent it); someone
//     scrolled up reading old messages isn't yanked away by an incoming one;
//   - OLDER messages loaded above leave the view where it was: the content
//     grows at the top, so the scroll position is moved down by exactly what
//     was added (else the reader would jump to the top of the new page).
//
// useLayoutEffect, not useEffect: it runs after React has updated the DOM
// but BEFORE the browser paints, so the corrected position is the first one
// drawn — no flash of the wrong scroll. jsdom has no layout (every height is
// 0), so this is checked live in Chromium, not in unit tests.
export function useStickToBottom(
  ref: RefObject<HTMLElement | null>,
  { newestId, oldestId, newestIsMine }: { newestId: number | null; oldestId: number | null; newestIsMine: boolean },
) {
  const atBottom = useRef(true)
  const previous = useRef<{ oldestId: number | null; scrollHeight: number }>({ oldestId: null, scrollHeight: 0 })

  // Remember, as the reader scrolls, whether they're at the bottom.
  useEffect(() => {
    const element = ref.current
    if (!element) return
    function onScroll() {
      if (!element) return
      atBottom.current = element.scrollHeight - element.scrollTop - element.clientHeight < NEAR_BOTTOM
    }
    element.addEventListener('scroll', onScroll)
    return () => element.removeEventListener('scroll', onScroll)
  }, [ref])

  useLayoutEffect(() => {
    const element = ref.current
    if (!element) return
    const before = previous.current
    const olderLoaded = before.oldestId !== null && oldestId !== null && oldestId < before.oldestId
    if (olderLoaded) {
      element.scrollTop += element.scrollHeight - before.scrollHeight
    } else if (atBottom.current || newestIsMine) {
      element.scrollTop = element.scrollHeight
      atBottom.current = true
    }
    previous.current = { oldestId, scrollHeight: element.scrollHeight }
  }, [ref, newestId, oldestId, newestIsMine])
}