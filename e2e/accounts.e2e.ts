import { expect, test } from '@playwright/test'
import { ACCOUNTS, PASSWORD, stateFile } from './support/accounts.ts'
import { latestEmailText, linkIn } from './support/mailpit.ts'
import { APP_URL } from './support/addresses.ts'

// Phases 1 and 2's demo targets (roadmap): signing in — including an account
// with two roles —, switching roles, signing out; and an admin creating an
// account through the screens, which its owner then activates from the
// invitation EMAIL.

test.describe('signing in, switching roles, signing out (Phase 1)', () => {
  // No saved session: this test is about the sign-in page itself.
  test('an account with two roles chooses one, switches, and signs out', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Email').fill(ACCOUNTS.morgan)
    // exact: "Password" is also the start of other labels on some pages; on
    // this one it isn't, but a test that says exactly what it means doesn't
    // break the day one appears.
    await page.getByLabel('Password', { exact: true }).fill(PASSWORD)
    await page.getByRole('button', { name: 'Log in' }).click()

    // Morgan is a practitioner AND an admin: the sign-in asks which.
    await expect(
      page.getByRole('heading', { name: 'Which role do you want to log in as?' }),
    ).toBeVisible()
    await page.getByRole('button', { name: 'practitioner' }).click()

    // The practitioner's sections — read from the top navigation (the phone
    // tab bar holds the same links; at 1280 px only the top one is shown,
    // and `first()` picks it).
    const sections = page.getByRole('navigation', { name: 'Sections' }).first()
    await expect(sections.getByRole('link', { name: 'Patients' })).toBeVisible()
    await expect(sections.getByRole('link', { name: 'Users' })).toHaveCount(0)

    // Switching role: the account menu's radio group. The navigation must
    // show the ADMIN's sections afterwards — and none of the practitioner's
    // (decisions §1: nothing of the other role stays on screen).
    await page.getByRole('button', { name: 'Account menu' }).click()
    await page.getByRole('menuitemradio', { name: 'Admin' }).click()
    await expect(sections.getByRole('link', { name: 'Users' })).toBeVisible()
    await expect(sections.getByRole('link', { name: 'Patients' })).toHaveCount(0)

    // Signing out ends on the sign-in page, and the app no longer opens.
    await page.getByRole('button', { name: 'Account menu' }).click()
    await page.getByRole('menuitem', { name: 'Log out' }).click()
    await expect(page.getByRole('heading', { name: 'Log in' })).toBeVisible()
    await page.goto('/admin')
    await expect(page).toHaveURL(/\/login/)
  })
})

test.describe('an account created by an admin (Phase 2)', () => {
  test.use({ storageState: stateFile('admin') })

  test('the invitation email lets the new practitioner choose a password and sign in', async ({
    page,
    browser,
  }) => {
    // A new address on every run: the database is fresh each run, but
    // Mailpit's inbox isn't — the email found must be THIS run's.
    const email = `e2e.practitioner.${Date.now()}@stride.test`

    await page.goto('/admin/users')
    await page.getByRole('link', { name: 'Add user' }).click()
    await expect(page.getByRole('heading', { name: 'Add a user' })).toBeVisible()

    // Radix Select (not a native <select>): open it, then pick the option.
    await page.getByLabel('Role').click()
    await page.getByRole('option', { name: 'Practitioner' }).click()
    await page.getByLabel('Email').fill(email)
    await page.getByLabel('First name').fill('Erin')
    await page.getByLabel('Last name').fill('Ellis')
    await page.getByLabel('Clinic').click()
    await page.getByRole('option', { name: 'Riverside Physio' }).click()
    await page.getByLabel('License number').fill(`E2E-${Date.now()}`)
    await page.getByRole('button', { name: 'Create user' }).click()

    // The screen says the invitation went out…
    await expect(page.getByRole('status').filter({ hasText: email })).toBeVisible()

    // …and it did: the email, read from Mailpit, holds the one link that
    // can activate the account (its token is only stored hashed).
    const link = linkIn(await latestEmailText(email), `${APP_URL}/accept-invitation?token=`)

    // Opened by someone NOT signed in. The EMPTY storage state is needed:
    // inside a test, `browser.newContext()` inherits this file's
    // `test.use({ storageState })` — the "new visitor" would otherwise be
    // the admin again (the page said "You're already signed in"). The
    // admin's session stays in `page`.
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    const invited = await context.newPage()
    await invited.goto(link)
    await expect(invited.getByRole('heading', { name: 'Welcome to Stride, Erin' })).toBeVisible()
    // The token is taken out of the address bar as the page opens.
    await expect(invited).not.toHaveURL(/token=/)
    await invited.getByLabel('Password', { exact: true }).fill('a new password 1')
    await invited.getByLabel('Confirm password').fill('a new password 1')
    await invited.getByRole('button', { name: 'Set password' }).click()

    // Then the sign-in page, the email already filled in.
    await expect(invited.getByRole('heading', { name: 'Log in' })).toBeVisible()
    await expect(invited.getByLabel('Email')).toHaveValue(email)
    await invited.getByLabel('Password', { exact: true }).fill('a new password 1')
    await invited.getByRole('button', { name: 'Log in' }).click()
    await expect(
      invited.getByRole('navigation', { name: 'Sections' }).first().getByRole('link', { name: 'Patients' }),
    ).toBeVisible()
    await context.close()
  })
})
