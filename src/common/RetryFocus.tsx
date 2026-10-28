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