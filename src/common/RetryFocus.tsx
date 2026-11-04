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

import type { RefObject } from 'react'
import { useFocusAfterRetry } from './useRetryFocus'

// `useFocusAfterRetry` as a component that draws nothing — so a list can
// place one per item (hooks can't be called in a loop), each watching its
// own item's request and all pointing at the same heading. Used by the
// patient home's Today section.
export function RetryFocus({
  target,
  what,
  shown,
}: {
  target: RefObject<HTMLElement | null>
  what: string
  shown: boolean
}) {
  useFocusAfterRetry(target, what, shown)
  return null
}