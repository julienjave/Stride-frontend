import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { TICK_MS, useTicker } from './useTicker'

// The ticks that make a running timer look at the clock again — with fake
// timers (`performance` included: each tick passes the monotonic time).

function setVisibility(state: 'visible' | 'hidden') {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state })
  document.dispatchEvent(new Event('visibilitychange'))
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'performance'] })
})

afterEach(() => {
  vi.useRealTimers()
  Reflect.deleteProperty(document, 'visibilityState')
})

describe('useTicker', () => {
  it('ticks every 250 ms while active, passing the monotonic time', () => {
    const onTick = vi.fn()
    const start = performance.now()
    renderHook(() => useTicker(true, onTick))
    expect(onTick).not.toHaveBeenCalled()

    vi.advanceTimersByTime(TICK_MS * 4)
    expect(onTick).toHaveBeenCalledTimes(4)
    expect(onTick).toHaveBeenLastCalledWith(start + 1_000)
  })

  it('never while inactive, and stops when it turns inactive or leaves the page', () => {
    const onTick = vi.fn()
    const { rerender, unmount } = renderHook(({ active }) => useTicker(active, onTick), {
      initialProps: { active: false },
    })
    vi.advanceTimersByTime(1_000)
    expect(onTick).not.toHaveBeenCalled()

    rerender({ active: true })
    vi.advanceTimersByTime(TICK_MS)
    expect(onTick).toHaveBeenCalledTimes(1)
    rerender({ active: false })
    vi.advanceTimersByTime(1_000)
    expect(onTick).toHaveBeenCalledTimes(1)

    rerender({ active: true })
    unmount()
    vi.advanceTimersByTime(1_000)
    expect(onTick).toHaveBeenCalledTimes(1)
  })

  it('ticks at once when the page becomes visible again — not when it is hidden', () => {
    const onTick = vi.fn()
    renderHook(() => useTicker(true, onTick))
    setVisibility('hidden')
    expect(onTick).not.toHaveBeenCalled()
    setVisibility('visible')
    expect(onTick).toHaveBeenCalledTimes(1)
  })

  it('no visibility ticks once inactive', () => {
    const onTick = vi.fn()
    const { rerender } = renderHook(({ active }) => useTicker(active, onTick), {
      initialProps: { active: true },
    })
    rerender({ active: false })
    setVisibility('visible')
    expect(onTick).not.toHaveBeenCalled()
  })

  it('always calls the NEWEST callback, without restarting the interval', () => {
    const first = vi.fn()
    const second = vi.fn()
    const { rerender } = renderHook(({ onTick }) => useTicker(true, onTick), {
      initialProps: { onTick: first },
    })
    vi.advanceTimersByTime(TICK_MS - 50)
    rerender({ onTick: second })
    // 50 ms later: the ORIGINAL interval's first tick (a restarted one would
    // need a full 250 ms more) — and it calls the new callback.
    vi.advanceTimersByTime(50)
    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledTimes(1)
  })
})