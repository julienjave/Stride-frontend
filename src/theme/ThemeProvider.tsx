import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react'
import { ThemeContext, type ThemeContextValue } from './ThemeContext'
import {
  DARK_MEDIA_QUERY,
  applyTheme,
  readStoredPreference,
  resolveTheme,
  writeStoredPreference,
  type ThemePreference,
} from './theme'
import {
  applyReadableFont,
  readStoredReadableFont,
  writeStoredReadableFont,
} from './font'

// The OS dark-mode setting is state that lives OUTSIDE React — the browser
// owns it and can change it at any moment (many phones switch to dark at
// sunset). useSyncExternalStore is React's purpose-built hook for exactly
// that: you give it a way to SUBSCRIBE to changes and a way to READ the
// current value, and React re-renders whenever the subscription fires.
//
// Both functions sit at module level (not inside the component) so they
// keep the same identity across renders; a new `subscribe` function on
// every render would make React unsubscribe and resubscribe each time.
function subscribeToSystemTheme(onChange: () => void) {
  const mediaQuery = window.matchMedia(DARK_MEDIA_QUERY)
  mediaQuery.addEventListener('change', onChange)
  return () => mediaQuery.removeEventListener('change', onChange)
}

function getSystemPrefersDark() {
  return window.matchMedia(DARK_MEDIA_QUERY).matches
}

// Wraps the whole app (see main.tsx) — deliberately ABOVE the router, not
// inside the authenticated layout, so the login page is themed too, and
// so "System" keeps following the OS even on pages without a Settings
// menu. It also holds the "Easier-to-read font" setting (font.ts), for the
// same reasons: a per-device look, applied on every page, sign-in included.
export function ThemeProvider({ children }: { children: ReactNode }) {
  // Lazy initializer (a function, not a value): localStorage is read once,
  // on the first render, rather than on every render.
  const [preference, setPreferenceState] =
    useState<ThemePreference>(readStoredPreference)
  const systemPrefersDark = useSyncExternalStore(
    subscribeToSystemTheme,
    getSystemPrefersDark,
  )
  const resolvedTheme = resolveTheme(preference, systemPrefersDark)
  // The font setting: read from this device once, like the theme. No OS
  // setting to follow here, so a plain state is the whole story.
  const [readableFont, setReadableFontState] = useState(readStoredReadableFont)

  // useLAYOUTEffect, not useEffect: layout effects run after React updates
  // the DOM but BEFORE the browser paints it, so a theme change never
  // shows one frame of the old colors. (On first load, index.html's inline
  // script has already applied the right class even earlier — this just
  // re-applies the same value, which is harmless.)
  useLayoutEffect(() => {
    applyTheme(resolvedTheme)
  }, [resolvedTheme])

  // The same before-paint timing for the font: switching it never shows a
  // frame of the old letters. (On load, index.html's script has already
  // put the class there.)
  useLayoutEffect(() => {
    applyReadableFont(readableFont)
  }, [readableFont])

  // Persist first, then update state — both happen synchronously in the
  // same click handler, so the order is only about readability: "remember
  // the choice, then use it."
  const setPreference = useCallback((next: ThemePreference) => {
    writeStoredPreference(next)
    setPreferenceState(next)
  }, [])

  // Memoized so consumers only re-render when a value actually changes,
  // not every time ThemeProvider itself happens to re-render.
  const setReadableFont = useCallback((next: boolean) => {
    writeStoredReadableFont(next)
    setReadableFontState(next)
  }, [])

  const value = useMemo<ThemeContextValue>(
    () => ({ preference, resolvedTheme, setPreference, readableFont, setReadableFont }),
    [preference, resolvedTheme, setPreference, readableFont, setReadableFont],
  )

  // React 19 lets a context object be rendered directly as its provider
  // (<ThemeContext value=…>) — the older <ThemeContext.Provider> spelling
  // still works but is on its way out.
  return <ThemeContext value={value}>{children}</ThemeContext>
}