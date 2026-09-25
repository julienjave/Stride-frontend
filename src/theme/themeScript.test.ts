import { describe, it, expect, vi, afterEach } from 'vitest'
// `?raw` is a Vite import suffix: instead of processing the file, it hands
// back its contents as a plain string. That lets this test read the REAL
// index.html — not a copy of the script pasted into the test, which could
// drift from the real one without anyone noticing.
import indexHtml from '../../index.html?raw'
import {
  THEME_STORAGE_KEY,
  parseThemePreference,
  readStoredPreference,
  resolveTheme,
} from './theme'
import { installFakeMatchMedia } from './fakeMatchMedia'

afterEach(() => {
  vi.restoreAllMocks()
})

// The inline pre-paint script is the only bare `<script>` tag (the app's
// entry script has attributes: `<script type="module" …>`).
//
// HTML comments are removed first, the way a browser ignores them: the
// explanatory comment above the script in index.html itself mentions
// "<script>", and without this step the regex would match that prose
// instead of the real code (it did, the first time this test ran).
function extractPrePaintScript(): string {
  const withoutComments = indexHtml.replace(/<!--[\s\S]*?-->/g, '')
  const match = /<script>([\s\S]*?)<\/script>/.exec(withoutComments)
  if (!match) {
    throw new Error('index.html has no inline pre-paint <script>')
  }
  return match[1]
}

function runPrePaintScript() {
  // new Function(code) compiles a string of JavaScript into a function —
  // the closest a test can get to "the browser executes this <script>".
  // Normally a red flag (it's eval by another name), but here the code is
  // our own index.html, which is exactly what's under test.
  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  const script = new Function(extractPrePaintScript()) as () => void
  script()
}

const isDark = () => document.documentElement.classList.contains('dark')

// Why this file exists: the script in index.html is a hand-written copy of
// theme.ts's logic (it runs before any module loads, so it can't import
// it). These tests make the two copies PROVE they agree, case by case —
// if one changes (a renamed storage key, a new rule) without the other,
// the page would load in one theme and then visibly flip to another once
// React starts. That's the exact flash the script exists to prevent.
describe('index.html pre-paint theme script', () => {
  const storedValues = ['light', 'dark', 'system', null, 'garbage']
  const osSettings = [false, true]

  for (const stored of storedValues) {
    for (const osDark of osSettings) {
      it(`agrees with theme.ts for stored=${String(stored)}, OS dark=${osDark}`, () => {
        installFakeMatchMedia(osDark)
        if (stored !== null) {
          localStorage.setItem(THEME_STORAGE_KEY, stored)
        }

        runPrePaintScript()

        const expected = resolveTheme(parseThemePreference(stored), osDark)
        expect(isDark()).toBe(expected === 'dark')
        expect(document.documentElement.style.colorScheme).toBe(expected)
      })
    }
  }

  it('agrees with theme.ts when storage is blocked (follows the OS)', () => {
    installFakeMatchMedia(true)
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError')
    })

    expect(() => runPrePaintScript()).not.toThrow()

    const expected = resolveTheme(readStoredPreference(), true)
    expect(isDark()).toBe(expected === 'dark')
  })
})