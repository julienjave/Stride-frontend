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

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useDebouncedValue } from './useDebouncedValue'

describe('useDebouncedValue', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns the initial value immediately, before any delay has passed', () => {
    const { result } = renderHook(() => useDebouncedValue('a', 300))
    expect(result.current).toBe('a')
  })

  it('does not update until the delay has fully elapsed', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, 300),
      { initialProps: { value: 'a' } },
    )

    rerender({ value: 'ab' })
    act(() => {
      vi.advanceTimersByTime(200)
    })
    // Only 200 of 300ms have passed — should still read the OLD value.
    expect(result.current).toBe('a')

    act(() => {
      vi.advanceTimersByTime(100)
    })
    // Now a full 300ms since the change — should have updated.
    expect(result.current).toBe('ab')
  })

  it('resets the timer on each new change, so only the LAST value in a fast sequence ever wins', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, 300),
      { initialProps: { value: 'a' } },
    )

    // Simulates typing "a" -> "ab" -> "abc" in quick succession, each
    // keystroke arriving before the previous one's timer could complete.
    rerender({ value: 'ab' })
    act(() => {
      vi.advanceTimersByTime(200)
    })
    rerender({ value: 'abc' })
    act(() => {
      vi.advanceTimersByTime(200)
    })
    // 400ms of real time has passed, but neither intermediate timer ever
    // got a full uninterrupted 300ms — so nothing should have updated yet.
    expect(result.current).toBe('a')

    act(() => {
      vi.advanceTimersByTime(100)
    })
    // Only the FINAL value's timer ever completed uninterrupted.
    expect(result.current).toBe('abc')
  })
})