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

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { MAX_TIMEOUT_MS, useBeforeDeadline } from './useBeforeDeadline'

// Fake timers: the test moves the clock itself, to the exact millisecond,
// instead of waiting for real minutes to pass. `Date.now()` follows the
// fake clock too.
const NOW = Date.UTC(2031, 5, 2, 9, 0)

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useBeforeDeadline', () => {
  it('is true up to the deadline itself, and false the millisecond after', () => {
    const { result } = renderHook(() => useBeforeDeadline(NOW + 60_000))
    expect(result.current).toBe(true)
    act(() => {
      vi.advanceTimersByTime(60_000)
    })
    // Exactly at the deadline: still allowed (the server's "at most").
    expect(result.current).toBe(true)
    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(result.current).toBe(false)
  })

  it('waits out a deadline beyond what one setTimeout can hold (a device clock far behind)', () => {
    const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000
    expect(THIRTY_DAYS).toBeGreaterThan(MAX_TIMEOUT_MS)
    const { result } = renderHook(() => useBeforeDeadline(NOW + THIRTY_DAYS))
    // A single setTimeout of 30 days would fire after 1 ms.
    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(result.current).toBe(true)
    // The first piece ends, the clock is checked, the rest is waited for.
    act(() => {
      vi.advanceTimersByTime(MAX_TIMEOUT_MS)
    })
    expect(result.current).toBe(true)
    expect(vi.getTimerCount()).toBe(1)
    act(() => {
      vi.advanceTimersByTime(THIRTY_DAYS - MAX_TIMEOUT_MS)
    })
    expect(result.current).toBe(false)
  })

  it('is false from the first render for a deadline already passed', () => {
    const { result } = renderHook(() => useBeforeDeadline(NOW - 1))
    expect(result.current).toBe(false)
  })

  it('is false for no deadline, and sets no timer', () => {
    const { result } = renderHook(() => useBeforeDeadline(null))
    expect(result.current).toBe(false)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('sets ONE timer, not a ticking clock — and clears it when unmounted', () => {
    const { unmount } = renderHook(() => useBeforeDeadline(NOW + 60_000))
    expect(vi.getTimerCount()).toBe(1)
    act(() => {
      vi.advanceTimersByTime(30_000)
    })
    expect(vi.getTimerCount()).toBe(1)
    unmount()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('clears the timer when the deadline goes away (the message was read)', () => {
    // Typed as the hook's parameter, so the rerender may pass null.
    const initialProps: { deadline: number | null } = { deadline: NOW + 60_000 }
    const { result, rerender } = renderHook(({ deadline }) => useBeforeDeadline(deadline), { initialProps })
    rerender({ deadline: null })
    expect(result.current).toBe(false)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('starts fresh for a new deadline, rather than keeping "passed" from the old one', () => {
    const { result, rerender } = renderHook(({ deadline }) => useBeforeDeadline(deadline), {
      initialProps: { deadline: NOW + 1_000 },
    })
    act(() => {
      vi.advanceTimersByTime(1_001)
    })
    expect(result.current).toBe(false)
    rerender({ deadline: NOW + 60_000 })
    expect(result.current).toBe(true)
  })
})