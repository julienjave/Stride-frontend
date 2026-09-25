import { createContext, useContext } from 'react'
import type { ResolvedTheme, ThemePreference } from './theme'

// What any component can read about the theme. Both values are exposed:
// the Settings menu needs `preference` (to tick "System"), while something
// like a chart choosing its colors would need `resolvedTheme` (it only
// cares whether it's actually dark right now).
export interface ThemeContextValue {
  preference: ThemePreference
  resolvedTheme: ResolvedTheme
  setPreference: (preference: ThemePreference) => void
}

// Default is `null`, not a fake value: a component rendered outside
// ThemeProvider is a wiring bug, and useTheme below turns that into a loud
// error instead of a toggle that silently does nothing.
//
// This lives in its own .ts file, separate from ThemeProvider.tsx, because
// of the react-refresh lint rule: a file that exports a component should
// export ONLY components, or hot-reloading can't swap it safely. The
// context object and the hook aren't components, so they live here.
export const ThemeContext = createContext<ThemeContextValue | null>(null)

export function useTheme(): ThemeContextValue {
  const value = useContext(ThemeContext)
  if (!value) {
    throw new Error('useTheme must be used inside <ThemeProvider>')
  }
  return value
}