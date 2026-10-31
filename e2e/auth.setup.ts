import { expect, test as setup } from '@playwright/test'
import { API_URL } from './support/addresses.ts'
import { ACCOUNTS, PASSWORD, stateFile, type AccountName } from './support/accounts.ts'

// Runs before every test (the `setup` project, a dependency of `chromium` in
// playwright.config.ts): signs each account in ONCE, through the API, and
// saves its session cookie to e2e/.auth/<account>.json. A test then starts
// already signed in: `test.use({ storageState: stateFile('alex') })`.
//
// Why not sign in through the screen in every test: the sign-in page has its
// own test (accounts.e2e.ts); doing it again in each test only adds time —
// and the cookie the browser would get is exactly this one. The session lives
// in Postgres (connect-pg-simple), keyed by the cookie, so a saved cookie
// stays valid for the whole run.
//
// The cookie is for `localhost` and works on both ports: cookies are scoped
// by host, not port, and the backend sets SameSite=Lax — the app on :4174
// calling the API on :3100 is "same site" (the port isn't part of a site), so
// the browser sends it, exactly as in development.
const SIGNED_IN: AccountName[] = ['admin', 'alex', 'pat', 'jo']

for (const account of SIGNED_IN) {
  setup(`sign in as ${account}`, async ({ request }) => {
    const response = await request.post(`${API_URL}/auth/login`, {
      data: { email: ACCOUNTS[account], password: PASSWORD },
    })
    expect(response.ok(), `sign-in of ${account}: ${response.status()}`).toBe(true)
    await request.storageState({ path: stateFile(account) })
  })
}
