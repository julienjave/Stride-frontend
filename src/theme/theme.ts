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

// Everything about the color theme that does NOT need React lives here, as
// plain functions. Two reasons for the split:
//   1. Pure functions are the easiest code there is to test — input in,
//      output out, no rendering, no providers.
//   2. ThemeProvider (the React side) stays a thin wiring layer: it only
//      decides WHEN to call these, never HOW theming works.
//
// Vocabulary used throughout:
//   - a PREFERENCE is what the user picked: 'light' | 'dark' | 'system'
//   - a RESOLVED theme is what actually gets painted: only 'light' | 'dark'
// 'system' is a preference, never a resolved theme — it means "ask the
// operating system", and the answer to that is always light or dark.

export const THEME_PREFERENCES = ['light', 'dark', 'system'] as const
export type ThemePreference = (typeof THEME_PREFERENCES)[number]
export type ResolvedTheme = 'light' | 'dark'

// The localStorage key. index.html's pre-paint script reads this same key
// by its literal value (it runs before any module loads, so it can't
// import this constant) — themeScript.test.ts reads index.html and fails
// if the two ever stop agreeing.
export const THEME_STORAGE_KEY = 'stride-theme'

// The standard CSS media query every modern OS/browser answers from the
// user's system-wide appearance setting.
export const DARK_MEDIA_QUERY = '(prefers-color-scheme: dark)'

// localStorage holds plain strings that anything (an old app version, a
// browser extension, a user poking at devtools) could have written. Rather
// than trusting it, anything that isn't one of the three known values
// falls back to 'system' — the same thing a first-time visitor gets.
export function parseThemePreference(raw: string | null): ThemePreference {
  return THEME_PREFERENCES.includes(raw as ThemePreference)
    ? (raw as ThemePreference)
    : 'system'
}

export function resolveTheme(
  preference: ThemePreference,
  systemPrefersDark: boolean,
): ResolvedTheme {
  if (preference === 'system') {
    return systemPrefersDark ? 'dark' : 'light'
  }
  return preference
}

// Tailwind's dark variant is configured in index.css as
// `@custom-variant dark (&:is(.dark *))` — i.e. "dark styles apply to
// anything inside an element with the `dark` class". Putting that class
// on <html> therefore switches the whole page, including Radix menus and
// dialogs that portal themselves out to the end of <body>.
//
// `colorScheme` is a separate, browser-level signal: it tells the browser
// to draw its OWN widgets (scrollbars, native date pickers, autofill
// backgrounds) in matching colors — things our CSS classes can't reach.
export function applyTheme(
  theme: ResolvedTheme,
  root: HTMLElement = document.documentElement,
): void {
  root.classList.toggle('dark', theme === 'dark')
  root.style.colorScheme = theme
}

// localStorage can THROW, not just return null: Safari's private mode
// historically threw on setItem, and some privacy settings block storage
// access entirely. A broken theme preference must never break the app, so
// both helpers swallow the error and fall back to "no stored choice".
export function readStoredPreference(): ThemePreference {
  try {
    return parseThemePreference(localStorage.getItem(THEME_STORAGE_KEY))
  } catch {
    return 'system'
  }
}

export function writeStoredPreference(preference: ThemePreference): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, preference)
  } catch {
    // Nothing useful to do: the choice still applies for this visit, it
    // just won't be remembered next time.
  }
}