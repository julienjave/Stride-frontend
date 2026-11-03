# Testing the frontend

What the test suites are, how to run them, what each one proves, the
techniques they rely on, and what they don't cover. The *why* behind several
techniques is told in the [journal](journal/README.md) and the
[decisions log](stride-design-decisions.md); this page is the working guide.

| Suite | Where | What it runs against | Size (2026-11-03) |
|---|---|---|---|
| **Vitest** (unit and component) | `src/**/*.test.ts(x)`, beside the code | jsdom (a simulated browser in memory), `fetch` replaced by a fake | 277 files, 3,621 tests |
| **Browser** (Playwright) | `e2e/*.e2e.ts` | the production build in Chromium, the real backend on port 3100, its own database (`stride_e2e`), Mailpit | 15 tests (4 sign-ins + 11) |

The backend has its own suites — unit, and API end-to-end against a real
Postgres — described in its `TESTING.md` (TODO-LINK). The browser suite
lives here but starts the backend from its folder, with two scripts of the
backend's own.

---

## Running them

### Vitest

```sh
npm test                           # every file once (vitest run), ~5 minutes
npx vitest run src/sessions        # one folder (or a file path)
npx vitest                         # watch mode: re-runs what a saved change touches
```

No backend, no network and no `.env` needed: every request is answered by
the test itself.

Expected noise in the output: `Not implemented: navigation to another
Document`, printed by jsdom when a test clicks a link that would leave the
page, such as a download (jsdom has no second document to go to). It isn't
a failure.

**In another time zone.** Calendar-date code has tests that only a wrong
version fails when the machine's zone isn't UTC (§Techniques, "Clocks").
Run them in a zone on each side of the Atlantic from time to time, and
always after touching dates:

```sh
TZ=America/Montreal npm test       # a POSIX shell (Git Bash, WSL, macOS, Linux)
TZ=Europe/Paris npx vitest run src/common
```

### The other checks

```sh
npx tsc -b                  # type-check all three projects (app, Vite config, e2e/)
npm run lint                # oxlint, then ESLint with type-checked rules
npm run build               # tsc -b, then the production build into dist/
npm run check:cache-names   # two builds, one page changed: did only its file get a new name?
```

`check:cache-names` tests the build, not the code (decisions §45): run it
after upgrading Vite or touching `vite.config.ts`'s build options. It fails
if a one-page change renames other files, if the framework file or the
import map is missing, or if `socket.io-client` has crept into the first
download. It also prints the first download's size.

### The browser suite

What must be in place once:

- **The backend's folder**, with its `npm ci` done and its `.env` written
  (its own `.env.example` says how). The suite looks for it, in order: the
  `STRIDE_BACKEND_DIR` variable, `backendDir` in `e2e/local.json` (a file of
  your own, git-ignored: `{ "backendDir": "C:/code/Stride-backend" }`), then
  `../backend`. It checks the folder holds a `package.json` with the two
  scripts below before starting anything
  ([`e2e/support/backendDir.ts`](../e2e/support/backendDir.ts)).
- **Chromium for Playwright**: `npx playwright install chromium`.

What must be running: the backend's Postgres, storage and Mailpit (`docker
compose up -d` in the backend's folder). Ports 3100 and 4174 must be free.

```sh
npm run test:e2e                         # the whole suite, ~1 minute plus the servers' start
npx playwright test e2e/timer.e2e.ts     # one file (the sign-ins run first anyway)
npx playwright show-report               # the last run's HTML report
npx playwright show-trace test-results/<test>/trace.zip   # replay a failed test
```

`npm run test:e2e` starts **both servers itself** and stops them at the end
([`playwright.config.ts`](../playwright.config.ts)):

1. **the backend**, in its folder: `npm run db:prepare:e2e` (create
   `stride_e2e` if missing, migrate it, create its app role, seed it from
   scratch with `seed:dev --reset`), then `npm run build && npm run
   start:e2e` (the built API on port 3100, rate limits off, error reporting
   off);
2. **this app's production build**, into `dist-e2e/` with `VITE_API_URL`
   pointing at port 3100 and reporting off, served by `vite preview` on port
   4174.

Neither server is reused from an earlier run (`reuseExistingServer: false`):
every run starts from the same freshly seeded data, and your development
database (`stride`) and servers (3000, 5173) are never touched. The tests
sign in as the seeded accounts (the backend's `dev-test-accounts.md`,
TODO-LINK).

---

## What each layer proves

A rule is tested where it lives, and the seam between the two repositories
is tested in a real browser:

| Layer | How it is tested | Example |
|---|---|---|
| Pure rules (`…Rules.ts`, `common/` helpers) | unit tests with plain values; "today" passed in, pinned in 2031 | what the patient's home offers today, from a summary |
| Words (`…Text.ts`) | the sentence for each outcome, in full | "Stopped (pain)", "Made up late on Tue, Oct 6" |
| Hooks and the cache | the hook rendered with a real `QueryClient`; the cache read back after the request | a role switch leaves only the current user cached; a failed tick puts back only its own fields |
| Pages and components | rendered inside a router, driven like a person (`userEvent`, queries by role and name); `fetch` answers like the backend | the request sent, the backend's refusal shown, focus after a retry |
| Live messaging | the provider given a `FakeSocket`; server events pushed into it | a `newMessage` reorders the list and bumps the badge |
| Conventions | a test reading the whole source tree | no component writes its own loading text |
| The seam: CORS, the cookie, the socket's handshake, the production build's lazy files, real layout and timing | the browser suite | two windows talk live; a patient does today's session at 375 px |

---

## Techniques

**Fake the network, not the code.** Page tests replace the browser's `fetch`
(`vi.stubGlobal('fetch', fetchMock)`, in about a hundred files) and answer
by method and path with `Response` objects shaped like the backend's. The
app's own client, its error parsing, the query keys and the hooks all run
for real; a request nobody expected is rejected with its URL named. No test
mocks an `api.ts` module.

**A fresh world per test.** Each render gets a new `QueryClient` (retries
off), the current user written into its cache when the page needs one, and a
`MemoryRouter` or `createMemoryRouter` with the page's real route and
stand-ins for where it links to. Areas with many such tests share a render
helper (`renderMessages.tsx`, `renderMedicalFile.tsx`, …).

**Clocks.** Fixtures live in 2031 (`TODAY = '2031-06-12'`), far from the real
date, so code that reads the real clock instead of the one passed in fails
rather than passes by luck. Timers use Vitest's fake timers. Calendar-date
helpers have cases on daylight-saving days of both continents: a version
computing in local time passes under UTC and fails under
`TZ=Europe/Paris` or `TZ=America/Montreal`, which is why those runs exist.

**Fakes for what jsdom lacks**, each in the area that needs it:
`messages/testSocket.ts` (`FakeSocket`, the socket adapter's four methods),
`users/FakeCropper.tsx` (the crop library, which needs layout),
`theme/fakeMatchMedia.ts` (an operating system that switches to dark).

**Shared assertions**, so the same state is checked the same way everywhere:

| File | Gives |
|---|---|
| `common/loadingAssertions.ts` | `expectLoading`, `expectSkeleton`, `holdRequests` (keep chosen requests unanswered) |
| `common/loadFailureAssertions.ts` | `errorResponse`, `expectLoadError`, `expectRecordNotFound`, `retryThenExpectFocusOn` |
| `snackbars/snackbarAssertions.ts` | `expectSnackbar`, `findSnackbar`, and the drawn region |
| `sessions/notAvailableAssertions.ts`, `assigned-programs/programNotAvailableAssertions.ts` | the "not available" page of each |
| `<area>/testData.ts` | builders for the backend's answers (`session({...})`, `summary({...})`) |

**Set once for every file** ([`src/test-setup.ts`](../src/test-setup.ts)):

- jest-dom's matchers; after each test, the DOM, `localStorage`, the theme
  classes and the snackbars' store emptied, so no test depends on the order
  they run in;
- `findBy…` and `waitFor` wait up to 3 seconds (Testing Library's default is
  1): a page that renders after a chain of requests once missed 1 second on
  a busy machine, though the code was right. A wrong render still fails;
- the address data replaced by two countries (the real ~250 made one form
  test take 4.5 seconds); `addressData.test.ts` checks the real data;
- the messaging socket replaced by one that never connects, so no test
  rendering the layout opens a real WebSocket;
- the loading states' 200 ms delay switched off, so a test can see the
  loading state, or its absence, at once: with the delay, "nothing is said
  while it loads" would pass for nothing, since an absence is always true
  before 200 ms. `Loading.test.tsx` tests the delay itself, for real;
- what jsdom doesn't implement and the app or Radix calls: object URLs,
  pointer capture, `scrollIntoView`, `matchMedia`.

**Convention tests**, which read the source tree as text (Vite's
`import.meta.glob` with `?raw`) rather than run one unit:

| Test | Fails when |
|---|---|
| `src/api/failureTextConvention.test.ts` | a component reads an error's messages itself instead of calling `failureText()` |
| `src/common/loadErrorConvention.test.ts` | a component writes its own "Couldn't load…" or "Try refreshing" |
| `src/common/loadingConvention.test.ts` | a component writes its own "Loading…" text in JSX |
| `src/app/routes.test.ts` | a page is imported statically instead of loaded on demand (and the guards and layouts sit where they should) |
| `src/app/layout/sections.test.ts` | a role has more than five tabs, Home isn't first, or a section isn't a real route of that role |
| `src/fileNameCase.test.ts` | two files' import paths differ only by letter case (they collide on Windows and macOS) |
| `src/theme/themeScript.test.ts` | `index.html`'s pre-paint script disagrees with `theme.ts` / `font.ts` |
| `src/theme/paletteContrast.test.ts` | a colour pair in `index.css` falls below WCAG AA, in either theme |
| `src/theme/fontCss.test.ts` | the font setting's chain in `index.css` (class → variable → utilities) is broken |
| `src/common/address/addressData.test.ts` | the generated address data no longer matches the library (run `npm run generate:address-data`) |

A convention test that matched no file would pass while checking nothing,
so each one that scans the tree also asserts that it sees known files and
that its pattern finds what it looks for.

### In the browser suite

- **Prepared through the API, checked on screen.** A test that needs a
  session due today asks the API for one in a single request
  (`e2e/support/api.ts`, `apiAs('alex')`), instead of clicking through the
  schedule form, which has its own test. What is checked is always what the
  person sees.
- **Signed in once.** The `setup` project (`e2e/auth.setup.ts`) signs four
  accounts in through the API and saves each cookie in `e2e/.auth/`
  (git-ignored: a cookie is a credential); tests start signed in with
  `test.use({ storageState: stateFile('pat') })`. The sign-in screens have
  their own test.
- **Independent of the calendar.** The seed is relative to the day it runs,
  and Pat's program is Monday, Wednesday, Friday; the patient test schedules
  today's weekday first, so it can't pass or fail by the day of the week. The
  browser is pinned to `en-GB` and Europe/Paris, and `e2e/support/dates.ts`
  computes "today" in that zone, whatever the machine's own.
- **Emails read from Mailpit's API** (`e2e/support/mailpit.ts`): the
  invitation's link exists only in the email.
- **Two browser contexts** for two people (messaging); **375 px** for the
  patient's tests, 1280 px otherwise.
- **Playwright's fake clock** for the session timer: exact values with no
  real waiting, and the tones Chromium's own Web Audio plays counted.
- **One worker, in order, no retries**: the tests share one database, and a
  flaky test must show. A failure keeps a trace and a screenshot.

---

## Mutation testing

Every pass of the frontend's development was mutation-checked by hand:
deliberate bugs put into the new code one at a time, and the tests run
against each. Typical mutations remove a condition, move a boundary, drop a
cache update or an `await`, swap two arguments, invert a sort, or make a
date computed in local time instead of UTC (those run under a `TZ` where
they matter). A browser test is proven the same way: each was shown to fail
with the bug it guards against put back.

A mutant that survives means one of two things, and which one is proven
before acting:

- **a missing test**: the test is written, and the mutant must fail it;
- **code that can't matter**: it is removed, or, when it's an equivalent
  written for clarity, a comment says so.

The runner scripts are throwaway tools in the working sandbox, not part of
this repository. Before mutating, the filtered test command is run on the
unchanged code: a command that fails anyway would report every mutant as
"killed".

---

## Rules learned the hard way

- **jsdom has no layout and no real timing.** A freeze of the role switch
  (a Radix provider remounted inside an open menu) and a radio button
  flickering under the data router's asynchronous navigation were both
  invisible to every jsdom test and found only in Chromium. Anything about
  what's painted, or when, belongs in the browser suite or a measured check.
- **An absence proves nothing unless it could have been present.** "No
  loading state when the data is cached" passes trivially if the loading
  state is delayed; the delay is off in tests for that reason.
- **A retry can unmount the thing that triggered it.** TanStack Query puts a
  never-loaded query back to "pending" while it retries, so a block drawn
  only on error disappears with its button, and focus with it. The load-error
  tests press Try again and check where focus lands.
- **Names that differ only by case** (`PatientPage.tsx` and
  `patientPage.ts`) work on Linux and break on Windows, where `.ts` is tried
  first and matches the wrong file.
- **The browser keeps navigation state across a reload.** A notice handed to
  the next page in navigation state came back on every refresh; such notices
  are snackbars now.
- **Wait for effects, not for time.** A test that checks what an effect did
  (a log line, a focus move) waits for it with `findBy…` / `waitFor`; one
  that asserted straight after the render failed on a busy machine.

---

## What the suites don't cover

- **Browsers other than Chromium**, and an **automated accessibility scan**
  (axe): both deferred. Accessibility is tested by role-and-name queries,
  focus checks and the contrast test; keyboard paths (drag and drop
  included) were checked by hand in Chromium.
- **Real phones**: the screen wake lock (refused by Chromium's headless
  shell; the hook's own tests cover it), touch gestures, a phone photo's
  orientation through the avatar crop. To be checked by hand once deployed.
- **Visual regressions.** No screenshot comparison: layouts were checked by
  hand at 375 and 1280 px, light and dark, at every pass.
- **Slow and lost networks** beyond the unit tests' refusals: checked by
  hand in Chromium with 1.5 seconds of latency on every request, and with a
  page's file deleted.
- **The deployed host** (Cloudflare Pages: its fallback to `index.html`,
  its caching) and **error reports reaching GlitchTip** (reporting is off in
  every suite; the scrub and the reporter are unit-tested, and the backend's
  tests cover the tunnel).
- **Every screen in the browser.** The browser suite follows each phase's
  demo target, not every page; the pages are covered by their Vitest tests.

---

## CI

A GitHub Actions workflow exists
([`.github/workflows/ci.yml`](../.github/workflows/ci.yml)) and was rehearsed
in a sandbox from fresh clones. It is **parked** until the repositories are
public (decisions §38): `.github/` is in `.gitignore` until then, so no
Actions minutes are spent and no token is held while they are private. Two
jobs, in parallel:

- **checks**: `npm ci`, `tsc -b`, `npm run lint`, `vitest run`, `vite build`;
- **browser**: this commit and the backend's `main` checked out side by side
  (so `../backend` is right with no setting), Postgres, RustFS and Mailpit as
  service containers, the backend's `scripts/ci/` writing its `.env` and
  waiting for the services, then `npm run test:e2e`. On a failure, the
  report and the traces are kept for 7 days.

The backend's workflow has the twin `browser` job, with the two repositories'
roles swapped; the two are kept in step.
