import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useWakeLock } from './useWakeLock'

// The Screen Wake Lock, against a FAKE `navigator.wakeLock` (jsdom has none):
// each request answers a promise the test settles when it wants — so "the
// lock arrives after the patient already paused" is a test, not luck.

interface FakeSentinel {
  released: boolean
  release: ReturnType<typeof vi.fn>
}

let requests: { resolve: (s: FakeSentinel) => void; reject: (e: Error) => void }[]
// The fake `request`, kept apart to assert on.
let request: ReturnType<typeof vi.fn>

function sentinel(): FakeSentinel {
  const s: FakeSentinel = {
    released: false,
    release: vi.fn(() => {
      s.released = true
      return Promise.resolve()
    }),
  }
  return s
}

// Settles request `i` and lets its `.then` run.
async function grant(i: number): Promise<FakeSentinel> {
  const s = sentinel()
  await act(async () => {
    requests[i].resolve(s)
    // Let the hook's `.then` run before act() checks the result.
    await Promise.resolve()
  })
  return s
}

function setVisibility(state: 'visible' | 'hidden') {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state })
  document.dispatchEvent(new Event('visibilitychange'))
}

beforeEach(() => {
  requests = []
  request = vi.fn(
    () =>
      new Promise<FakeSentinel>((resolve, reject) => {
        requests.push({ resolve, reject })
      }),
  )
  Object.defineProperty(navigator, 'wakeLock', { configurable: true, value: { request } })
})

afterEach(() => {
  // Back to jsdom's own: no wake lock, visible.
  Reflect.deleteProperty(navigator, 'wakeLock')
  Reflect.deleteProperty(document, 'visibilityState')
})

describe('useWakeLock', () => {
  it('asks for the screen lock only while active, and gives it back after', async () => {
    const { rerender } = renderHook(({ active }) => useWakeLock(active), {
      initialProps: { active: false },
    })
    expect(request).not.toHaveBeenCalled()

    rerender({ active: true })
    expect(request).toHaveBeenCalledExactlyOnceWith('screen')
    const lock = await grant(0)

    rerender({ active: false })
    expect(lock.release).toHaveBeenCalledTimes(1)
  })

  it('released when the component leaves the page', async () => {
    const { unmount } = renderHook(() => useWakeLock(true))
    const lock = await grant(0)
    unmount()
    expect(lock.release).toHaveBeenCalledTimes(1)
  })

  it('a lock that arrives after it stopped being wanted is released at once', async () => {
    const { rerender } = renderHook(({ active }) => useWakeLock(active), {
      initialProps: { active: true },
    })
    rerender({ active: false })
    const late = await grant(0)
    expect(late.release).toHaveBeenCalledTimes(1)
  })

  it('asked for again when the page comes back, after the browser released it', async () => {
    renderHook(() => useWakeLock(true))
    const first = await grant(0)

    // Hidden: the browser releases the lock itself.
    first.released = true
    setVisibility('hidden')
    expect(request).toHaveBeenCalledTimes(1)

    setVisibility('visible')
    expect(request).toHaveBeenCalledTimes(2)
  })

  it('not asked twice while a lock is held, or while a request is on its way', async () => {
    renderHook(() => useWakeLock(true))
    // On its way: coming back to the page asks nothing more.
    setVisibility('visible')
    expect(request).toHaveBeenCalledTimes(1)
    await grant(0)
    // Held.
    setVisibility('visible')
    expect(request).toHaveBeenCalledTimes(1)
  })

  it('a refusal (battery saver…) is ignored, and asked again on the next visit', async () => {
    renderHook(() => useWakeLock(true))
    await act(async () => {
      requests[0].reject(new Error('NotAllowedError'))
      await Promise.resolve()
    })
    setVisibility('visible')
    expect(request).toHaveBeenCalledTimes(2)
  })

  it('no Wake Lock API: nothing happens, nothing throws', () => {
    Reflect.deleteProperty(navigator, 'wakeLock')
    expect(() => renderHook(() => useWakeLock(true))).not.toThrow()
  })

  it('not listening to the page any more once inactive', async () => {
    const { rerender } = renderHook(({ active }) => useWakeLock(active), {
      initialProps: { active: true },
    })
    const lock = await grant(0)
    rerender({ active: false })
    lock.released = true
    setVisibility('visible')
    expect(request).toHaveBeenCalledTimes(1)
  })
})