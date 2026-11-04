import path from 'node:path'
import { defineConfig, devices } from '@playwright/test'
import { API_URL, APP_URL } from './e2e/support/addresses.ts'
import { backendDir } from './e2e/support/backendDir.ts'

// The browser suite (decisions §34): a few tests that drive the REAL app —
// the production build, in Chromium, against a real backend and database —
// one per phase's "Demo target" in the roadmap. Run with `npm run test:e2e`.
//
// Why it exists beside the 3,000+ Vitest tests: those run in jsdom (a
// simulated browser with no layout and no network) against a FAKED backend,
// and the backend's own e2e suites call the API with no browser at all. What
// neither can see is the SEAM between the two — CORS, the session cookie,
// the socket handshake, the production build's lazy files, real layout and
// timing. Several of this project's bugs lived exactly there and were only
// found by hand in Chromium (decisions §34 lists them).
//
// THE TWO SERVERS. `webServer` makes Playwright start them before any test
// and stop them after the last one:
//   1. the backend, from the backend folder: `db:prepare:e2e` creates the
//      `stride_e2e` database if needed, migrates it, grants the app role and
//      seeds it FRESH (`seed:dev --reset`); then it is built and started on
//      port 3100 with the rate limits off (`start:e2e`). Its own database:
//      your development data (`stride`) is never touched, and every run
//      starts from the same known state.
//   2. the frontend's PRODUCTION build (what users get — not Vite's dev
//      server, which serves modules one by one), built into dist-e2e with
//      the API address pointing at port 3100, and served by `vite preview`
//      on port 4174.
// `reuseExistingServer: false`: a run never borrows a server that is
// already up — that one would hold data from an earlier run, and the
// "fresh every run" guarantee would be gone. (A port already in use makes
// the run stop with a clear message instead.)
//
// What must ALREADY be running: Postgres, RustFS and Mailpit (`docker
// compose up -d` in the backend folder). The invitation test reads its email
// from Mailpit's API.
export default defineConfig({
  testDir: './e2e',
  // `*.e2e.ts`, never `*.spec.ts` / `*.test.ts`: Vitest collects those two
  // patterns, and would try to run these files in jsdom.
  testMatch: '**/*.e2e.ts',
  // ONE worker, in order: every test shares the one seeded database, and
  // two at once could step on each other's data (a test pausing a program
  // another is reading). The suite is small; correctness beats speed here.
  workers: 1,
  fullyParallel: false,
  // A failure is a failure: no automatic second try that would hide a flaky
  // test. `forbidOnly` stops a stray `test.only` from silently skipping the
  // rest of the suite on a CI server.
  retries: 0,
  forbidOnly: !!process.env.CI,
  // Each step (a click, a wait for text) may take up to 10 s; a whole test
  // 60 s — the patient's session clicks through several pages.
  timeout: 60_000,
  expect: { timeout: 10_000 },
  // On GitHub Actions (CI=true) the `github` reporter is added: each failure
  // becomes an annotation on the test's line, shown on the run's summary and
  // in the pull request's diff. `list` prints progress either way; `html` is
  // the report kept as an artifact when a CI run fails.
  reporter: process.env.CI
    ? [['github'], ['list'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: APP_URL,
    // When a test fails, keep everything needed to see why without running
    // it again: a TRACE (every action, the page before and after, the
    // network, the console — `npx playwright show-trace <file>`) and a
    // screenshot. Nothing is kept for passing tests.
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    // Dates the app shows (and "today") are worked out in the browser's
    // zone; pinned so a run gives the same words on every machine.
    locale: 'en-GB',
    timezoneId: 'Europe/Paris',
  },
  projects: [
    // Signs each account in ONCE, through the API, and saves its cookie
    // (e2e/auth.setup.ts). The tests start already signed in — and the
    // suite needs only a handful of sign-ins in all.
    { name: 'setup', testMatch: /auth\.setup\.ts/ },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } },
      dependencies: ['setup'],
    },
  ],
  webServer: [
    {
      command: 'npm run db:prepare:e2e && npm run build && npm run start:e2e',
      // Found and checked before anything starts (support/backendDir.ts):
      // STRIDE_BACKEND_DIR, e2e/local.json, or ../backend then
      // ../Stride-backend. import.meta.dirname is this file's folder — the
      // frontend — whatever folder the command was typed in.
      cwd: backendDir(import.meta.dirname),
      url: `${API_URL}/health`,
      reuseExistingServer: false,
      // Preparing (~40 s), building (~20 s), starting: generous on purpose.
      timeout: 240_000,
      stdout: 'ignore',
      stderr: 'pipe',
    },
    {
      command: 'npx vite build --outDir dist-e2e && npx vite preview --outDir dist-e2e --port 4174 --strictPort',
      url: APP_URL,
      reuseExistingServer: false,
      timeout: 180_000,
      // Variables already set win over .env files in Vite: the build talks
      // to the e2e backend, and never reports errors to GlitchTip (an empty
      // DSN means reporting off).
      env: { VITE_API_URL: API_URL, VITE_SENTRY_DSN: '' },
    },
  ],
  // Where a run's results go (both folders are in .gitignore).
  outputDir: path.join('test-results'),
})
