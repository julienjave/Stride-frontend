import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  THEME_STORAGE_KEY,
  applyTheme,
  parseThemePreference,
  readStoredPreference,
  resolveTheme,
  writeStoredPreference,
} from './theme'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('parseThemePreference', () => {
  it.each(['light', 'dark', 'system'])('accepts %s', (value) => {
    expect(parseThemePreference(value)).toBe(value)
  })

  // Anything else — never set, empty, junk, or a near-miss in casing —
  // must fall back to 'system' rather than being trusted.
  it.each([null, '', 'blue', 'Dark', ' dark'])(
    'falls back to system for %j',
    (value) => {
      expect(parseThemePreference(value)).toBe('system')
    },
  )
})

describe('resolveTheme', () => {
  // The full truth table: 3 preferences × 2 OS settings. Listing every
  // row makes the one interesting rule visible at a glance — only
  // 'system' looks at the OS at all.
  it.each([
    ['light', false, 'light'],
    ['light', true, 'light'],
    ['dark', false, 'dark'],
    ['dark', true, 'dark'],
    ['system', false, 'light'],
    ['system', true, 'dark'],
  ] as const)('%s with OS dark=%s resolves to %s', (preference, osDark, expected) => {
    expect(resolveTheme(preference, osDark)).toBe(expected)
  })
})

describe('applyTheme', () => {
  it('adds the dark class and dark color-scheme for dark', () => {
    const root = document.createElement('html')
    applyTheme('dark', root)
    expect(root.classList.contains('dark')).toBe(true)
    expect(root.style.colorScheme).toBe('dark')
  })

  it('removes the dark class again for light, leaving other classes alone', () => {
    const root = document.createElement('html')
    root.className = 'dark something-else'
    applyTheme('light', root)
    expect(root.className).toBe('something-else')
    expect(root.style.colorScheme).toBe('light')
  })

  it('targets <html> by default', () => {
    applyTheme('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })
})

describe('stored preference', () => {
  it('round-trips through localStorage under the shared key', () => {
    writeStoredPreference('dark')
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')
    expect(readStoredPreference()).toBe('dark')
  })

  it('reads as system when nothing was ever stored', () => {
    expect(readStoredPreference()).toBe('system')
  })

  it('reads as system when stored junk is found', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'purple')
    expect(readStoredPreference()).toBe('system')
  })

  // Storage.prototype is where jsdom's localStorage methods live, so
  // spying there makes the real localStorage throw — simulating a browser
  // with storage blocked.
  it('reads as system instead of throwing when storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError')
    })
    expect(readStoredPreference()).toBe('system')
  })

  it('does not throw when saving is blocked', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })
    expect(() => writeStoredPreference('dark')).not.toThrow()
  })
})