import { vi } from 'vitest'
import { DARK_MEDIA_QUERY } from './theme'

// Test helper: a stand-in for the browser's OS dark-mode setting that a
// test can FLIP mid-test, the way a phone switches to dark at sunset.
//
// A real MediaQueryList notifies listeners when its answer changes; this
// fake does the same when setSystemDark() is called, which is what lets
// tests prove ThemeProvider reacts LIVE to an OS change, not only on load.
//
// vi.spyOn (rather than assigning window.matchMedia directly) means
// vi.restoreAllMocks() puts test-setup.ts's default back afterwards.
export function installFakeMatchMedia(initiallyDark: boolean) {
  let systemDark = initiallyDark
  const listeners = new Set<() => void>()

  vi.spyOn(window, 'matchMedia').mockImplementation(
    (query: string) =>
      ({
        // Only the exact dark-mode query "matches": if the app (or the
        // index.html script) ever asked a slightly different query, it
        // would get `false` and the tests would catch the mismatch.
        matches: query === DARK_MEDIA_QUERY && systemDark,
        media: query,
        onchange: null,
        addEventListener: (_type: string, listener: () => void) => {
          listeners.add(listener)
        },
        removeEventListener: (_type: string, listener: () => void) => {
          listeners.delete(listener)
        },
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      }) as unknown as MediaQueryList,
  )

  return {
    setSystemDark(next: boolean) {
      systemDark = next
      listeners.forEach((listener) => listener())
    },
    listenerCount: () => listeners.size,
  }
}