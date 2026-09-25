import { afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
// This import has a side effect: it extends Vitest's `expect` with
// jest-dom's matchers (toBeInTheDocument, toHaveTextContent, etc.) — an
// extension, not something Vitest ships with by default.
import '@testing-library/jest-dom/vitest'

// Without this, every render() in a test file mounts INTO THE SAME jsdom
// document, and never gets removed — so test 2 in a file sees test 1's
// leftover DOM still sitting there, and things like getByRole start
// matching multiple elements that all look identical (confirmed: this is
// exactly the "Found multiple elements with role button" failure above).
// afterEach here runs automatically, for every test in every file, without
// each test file needing to remember to do it individually.
// The real country-state-city package ships ~250 countries — rendering
// that many real <SelectItem> options in jsdom is genuinely slow (one
// affected test measured at ~4.5s, right at the edge of Vitest's default
// 5s test timeout, and enough to time out outright on a slower machine).
// No test here is ABOUT the real dataset (that it has all 250 countries,
// or their exact real state lists) — every test just needs "pick a
// country with states, pick one without," so a small, fixed fixture is
// both faster and more deterministic than depending on a third-party
// package's exact, changeable data. Covers every real country name used
// across the address-bearing forms' test files (United States, with
// states including Illinois/California; Aland Islands, with none).
vi.mock('country-state-city', () => ({
  Country: {
    getAllCountries: () => [
      { isoCode: 'US', name: 'United States' },
      { isoCode: 'AX', name: 'Aland Islands' },
    ],
  },
  State: {
    getStatesOfCountry: (countryCode: string) =>
      countryCode === 'US'
        ? [
            { isoCode: 'CA', name: 'California', countryCode: 'US' },
            { isoCode: 'IL', name: 'Illinois', countryCode: 'US' },
          ]
        : [],
  },
}))

afterEach(() => {
  cleanup()
  // The theme is GLOBAL browser state that outlives a component: a test
  // that picks "Dark" leaves the `dark` class on <html> and 'dark' in
  // localStorage, which would silently change what the NEXT test starts
  // from. Resetting both after every test keeps tests independent of the
  // order they happen to run in.
  localStorage.clear()
  document.documentElement.className = ''
  document.documentElement.style.colorScheme = ''
})

// jsdom (the in-memory fake browser these tests run against) does not
// implement URL.createObjectURL or URL.revokeObjectURL at all — confirmed
// directly, not assumed: calling either throws "is not a function" in a
// fresh jsdom environment. Every real browser has both. Rather than
// leaving each test file that touches an object-URL-using component (like
// ClinicLogoUpload) to work around this individually, they're stubbed
// once here so every test gets a usable, fake implementation: a
// predictable string in, a no-op for the revoke.
URL.createObjectURL = vi.fn(() => 'blob:mock-object-url')
URL.revokeObjectURL = vi.fn()

// jsdom also doesn't implement a few pointer/scroll APIs that Radix UI's
// interactive primitives (Select now; any future Dropdown, Popover, or
// similar) call internally — confirmed directly: clicking a Radix Select
// trigger throws "target.hasPointerCapture is not a function" without
// this, before the click even finishes. Real browsers have all three;
// jsdom just never implemented the pointer-capture APIs, and its
// scrollIntoView is a no-op stub rather than missing outright, EXCEPT it
// still needs a body here because jsdom's default throws "not
// implemented" the same way createObjectURL did above.
Element.prototype.hasPointerCapture = vi.fn(() => false)
Element.prototype.setPointerCapture = vi.fn()
Element.prototype.releasePointerCapture = vi.fn()
Element.prototype.scrollIntoView = vi.fn()

// jsdom has no window.matchMedia at all (confirmed: it's undefined), but
// ThemeProvider calls it to read the OS light/dark setting — so every test
// rendering the app layout would crash without this. The default answer is
// "matches nothing", i.e. an OS in light mode that never changes.
// Theme tests that need a controllable OS setting replace it per test with
// vi.spyOn (see src/theme/fakeMatchMedia.ts); spyOn needs an existing
// property to wrap, which is one more reason this default lives here.
window.matchMedia = (query: string) =>
  ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }) as MediaQueryList