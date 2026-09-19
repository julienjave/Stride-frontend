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