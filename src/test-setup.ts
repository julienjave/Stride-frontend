import { afterEach, vi } from 'vitest'
import { cleanup, configure } from '@testing-library/react'
// This import has a side effect: it extends Vitest's `expect` with
// jest-dom's matchers (toBeInTheDocument, toHaveTextContent, etc.) — an
// extension, not something Vitest ships with by default.
import '@testing-library/jest-dom/vitest'
import { clearSnackbars } from '@/snackbars/snackbarStore'

// How long every `findBy…` / `waitFor` keeps retrying before failing:
// 3 seconds instead of Testing Library's 1 (2026-10-19). A page often
// renders after a CHAIN of requests — SessionPage asks for the session,
// then for its program — and in a full run on a busy machine (178 files in
// parallel, 43% of the time spent creating jsdom environments) that chain
// once took longer than 1 s: "Knee Rehab" never appeared in time, though
// the code was right (the same test passed 6 times in a row under full CPU
// load alone). Raising the wait only lets a slow-but-correct render pass;
// a wrong one still fails — 2 s later. Vitest's own limit per test stays
// 10 s (vite.config.ts), so a test can still wait this long several times.
configure({ asyncUtilTimeout: 3_000 })

// Without this, every render() in a test file mounts INTO THE SAME jsdom
// document, and never gets removed — so test 2 in a file sees test 1's
// leftover DOM still sitting there, and things like getByRole start
// matching multiple elements that all look identical (confirmed: this is
// exactly the "Found multiple elements with role button" failure above).
// afterEach here runs automatically, for every test in every file, without
// each test file needing to remember to do it individually.
// The real address data (src/common/address/addressData.ts, generated from
// Unicode CLDR) has 250 countries — rendering that many
// real <SelectItem> options in jsdom is genuinely slow (one affected test
// measured at ~4.5s, right at the edge of Vitest's default 5s test
// timeout, and enough to time out outright on a slower machine). No test
// here is ABOUT the real dataset — every form test just needs "pick a
// country with states, pick one without," so a small, fixed fixture is
// both faster and more deterministic. Covers every country name used
// across the address-bearing forms' test files (United States, with states
// including Illinois/California; Aland Islands, with none). The real data
// has its own test, addressData.test.ts, which reads the real module with
// vi.importActual. (The fixture keeps the spelling of the data it was
// written from, 'Aland Islands'; CLDR's is 'Åland Islands'. No test
// compares the two, so either works here.)
//
// findCountry (the address display shows a stored 'US' as "United States")
// looks up the SAME fixture list, so the two can never disagree about which
// countries exist.
//
// Until 2026-10-15 this mocked the library the data came from
// (country-state-city, since replaced by CLDR); the app now reads the
// generated data through addressData.ts, so that's the module replaced.
//
// vi.hoisted(): Vitest moves every vi.mock() call to the very top of the
// file, above ordinary `const` declarations. A plain const used inside the
// mock factory would therefore not exist yet if the factory ever ran that
// early. vi.hoisted() lifts this value along with the mock, so it is
// always defined first.
const MOCK_COUNTRIES = vi.hoisted(() => [
  { isoCode: 'US', name: 'United States' },
  { isoCode: 'AX', name: 'Aland Islands' },
])

vi.mock('@/common/address/addressData', () => ({
  ALL_COUNTRIES: MOCK_COUNTRIES,
  findCountry: (isoCode: string) =>
    MOCK_COUNTRIES.find((country) => country.isoCode === isoCode),
  statesOfCountry: (isoCode: string) =>
    isoCode === 'US'
      ? [
          { isoCode: 'CA', name: 'California' },
          { isoCode: 'IL', name: 'Illinois' },
        ]
      : [],
}))

// The live messaging connection (Phase 5). AuthenticatedLayout opens one for
// every practitioner and patient, so ANY test rendering the layout would
// otherwise try a real WebSocket to localhost:3000 — slow, noisy, and
// dependent on whether a server happens to be running. Replaced here by a
// socket that never connects (the screens then say "Connecting…", which no
// unrelated test looks at). Messaging tests hand the provider their own
// FakeSocket (src/messages/testSocket.ts) through `createSocket`; the
// adapter's own test asks for the real module with vi.importActual.
vi.mock('@/messages/messagingSocket', () => ({
  SEND_TIMEOUT_MS: 10_000,
  createMessagingSocket: () => ({
    onServerEvent: () => {},
    onConnectionChange: () => {},
    send: () => Promise.reject(new Error('Not connected')),
    close: () => {},
  }),
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
  // The snackbars' store lives at module level (snackbarStore.ts), like the
  // theme above: a snackbar raised by one test would still be in the list
  // when the next starts.
  clearSnackbars()
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

// The loading states' 200 ms delay (common/useDelayedShow.ts — Phase 6, the
// loading / error pass, pass 2): OFF in every test but its own. With it, a
// page test whose answer comes back in a few milliseconds would never see
// "Loading…" — and its "nothing is said while it loads" and "no loading
// state when the data is cached" assertions would pass for nothing (an
// absence is always true before 200 ms). Shown at once, the loading state
// is there to be found or missed, as before the delay existed. The delay
// itself is tested once, for real, in common/Loading.test.tsx, which
// unmocks this module.
vi.mock('@/common/useDelayedShow', () => ({
  LOADING_DELAY_MS: 200,
  useDelayedShow: () => true,
}))