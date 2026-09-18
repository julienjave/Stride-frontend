import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCurrentDateTime } from './useCurrentDateTime'

describe('useCurrentDateTime', () => {
  beforeEach(() => {
    // Fake timers let us control time deterministically — advancing 60
    // real seconds in a test would make the suite unbearably slow, and
    // waiting on a real setInterval would make the test flaky (racing
    // against however fast the test runner happens to execute).
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-15T10:00:00'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns the current time on first render', () => {
    const { result } = renderHook(() => useCurrentDateTime())
    expect(result.current.toISOString()).toBe(
      new Date('2026-01-15T10:00:00').toISOString(),
    )
  })

  it('updates after a minute passes, not before', () => {
    const { result } = renderHook(() => useCurrentDateTime())

    // act() wraps the state update so React actually flushes it before
    // we assert — without it, the interval callback would fire but the
    // component wouldn't be told to re-render within the test.
    act(() => {
      vi.advanceTimersByTime(30_000)
    })
    // Not yet a full minute — should still read the original time.
    expect(result.current.toISOString()).toBe(
      new Date('2026-01-15T10:00:00').toISOString(),
    )

    act(() => {
      vi.advanceTimersByTime(30_000)
    })
    // Now a full 60 seconds have passed — the interval should have fired.
    expect(result.current.toISOString()).toBe(
      new Date('2026-01-15T10:01:00').toISOString(),
    )
  })
})