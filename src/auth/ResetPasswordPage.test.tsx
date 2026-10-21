import { describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { formatLinkExpiry } from './passwordResetRules'
import { address, apiError, json, renderPasswordReset, requests, type SentRequest } from './renderPasswordReset'

const TOKEN = 'a'.repeat(64)
const PAGE = `/reset-password?token=${TOKEN}`
const EXPIRES = '2031-03-04T13:05:00.000Z'
const DEAD = 'This password reset link is invalid or has expired'

// The usual answers: the link checks out, the reset succeeds.
function answers({
  check = () => json({ email: 'pat@example.com', expiresAt: EXPIRES }),
  reset = () => new Response(null, { status: 204 }),
}: {
  check?: () => Response | Promise<Response>
  reset?: () => Response | Promise<Response>
} = {}) {
  return ({ method, path }: SentRequest) => {
    if (method === 'POST' && path === '/auth/reset-password/check') return check()
    if (method === 'POST' && path === '/auth/reset-password') return reset()
    if (method === 'POST' && path === '/auth/logout') return new Response(null, { status: 204 })
    return undefined
  }
}

async function fillPasswords(user: ReturnType<typeof userEvent.setup>, password: string, confirm = password) {
  await user.type(await screen.findByLabelText('New password'), password)
  await user.type(screen.getByLabelText('Confirm the new password'), confirm)
  await user.click(screen.getByRole('button', { name: 'Change password' }))
}

describe('ResetPasswordPage', () => {
  it('checks the link first — the token in the body — and takes it out of the address', async () => {
    renderPasswordReset(PAGE, answers())

    expect(screen.getByRole('status')).toHaveTextContent('Checking your link…')
    expect(await screen.findByRole('heading', { name: 'Choose a new password' })).toBeInTheDocument()
    expect(requests()).toEqual([
      { method: 'POST', path: '/auth/reset-password/check', body: `{"token":"${TOKEN}"}` },
    ])
    expect(address()).toBe('/reset-password')
  })

  it("shows the account's email for the password manager, and when the link stops working", async () => {
    renderPasswordReset(PAGE, answers())
    const email = await screen.findByLabelText('Email')
    expect(email).toHaveValue('pat@example.com')
    expect(email).toHaveAttribute('readonly')
    expect(email).toHaveAttribute('autocomplete', 'username')
    expect(screen.getByLabelText('New password')).toHaveAttribute('autocomplete', 'new-password')
    expect(
      screen.getByText(
        `This link works until ${formatLinkExpiry(EXPIRES)}. Changing your password signs you out on every device.`,
      ),
    ).toBeInTheDocument()
  })

  it('changes the password, then opens the sign-in page with the email and the reset flag, replacing itself', async () => {
    const user = userEvent.setup()
    renderPasswordReset(PAGE, answers())
    await fillPasswords(user, 'new-password-1')

    expect(await screen.findByTestId('login-state')).toHaveTextContent(
      '{"email":"pat@example.com","passwordReset":true}',
    )
    expect(requests().at(-1)).toEqual({
      method: 'POST',
      path: '/auth/reset-password',
      body: `{"token":"${TOKEN}","newPassword":"new-password-1"}`,
    })
  })

  // Back from the sign-in page skips the spent link (it would only say
  // "Open your reset link" now — the token left the address).
  it('replaces itself in the history', async () => {
    const user = userEvent.setup()
    renderPasswordReset(['/forgot-password', PAGE], answers())
    await fillPasswords(user, 'new-password-1')
    await screen.findByTestId('login-state')
    await user.click(screen.getByRole('button', { name: 'test: back' }))
    expect(await screen.findByRole('heading', { name: 'Reset your password' })).toBeInTheDocument()
  })

  it('says what is wrong with the passwords at their fields, and sends nothing', async () => {
    const user = userEvent.setup()
    renderPasswordReset(PAGE, answers())
    await fillPasswords(user, 'short', 'short')
    expect(screen.getByLabelText('New password')).toHaveAccessibleDescription(
      'Password must be at least 8 characters',
    )
    expect(screen.getByLabelText('New password')).toHaveAttribute('aria-invalid', 'true')

    await user.clear(screen.getByLabelText('New password'))
    await user.clear(screen.getByLabelText('Confirm the new password'))
    await fillPasswords(user, 'new-password-1', 'new-password-2')
    expect(screen.getByLabelText('Confirm the new password')).toHaveAccessibleDescription("Passwords don't match")
    expect(requests().filter((r) => r.path === '/auth/reset-password')).toEqual([])
  })

  it('says a dead link at once, with a way to ask for a new one — and shows no form', async () => {
    renderPasswordReset(PAGE, answers({ check: () => apiError(400, DEAD) }))
    expect(await screen.findByRole('heading', { name: "This link can't be used" })).toBeInTheDocument()
    expect(screen.getByText(new RegExp(`^${DEAD}\\. Links work for 1 hour, and only once`))).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Request a new link' })).toHaveAttribute('href', '/forgot-password')
    expect(screen.getByRole('link', { name: 'Back to log in' })).toHaveAttribute('href', '/login')
    expect(screen.queryByLabelText('New password')).not.toBeInTheDocument()
  })

  it('says a link that died while the form was open the same way', async () => {
    const user = userEvent.setup()
    renderPasswordReset(PAGE, answers({ reset: () => apiError(400, DEAD) }))
    await fillPasswords(user, 'new-password-1')
    expect(await screen.findByRole('heading', { name: "This link can't be used" })).toBeInTheDocument()
  })

  it("shows the reset's other refusals on the form", async () => {
    const user = userEvent.setup()
    renderPasswordReset(PAGE, answers({ reset: () => apiError(429, 'Too many requests.') }))
    await fillPasswords(user, 'new-password-1')
    expect(await screen.findByRole('alert')).toHaveTextContent('Too many requests.')
    expect(screen.getByRole('button', { name: 'Change password' })).toBeEnabled()
  })

  it('disables Change password while the reset is out', async () => {
    const user = userEvent.setup()
    let release: (r: Response) => void = () => undefined
    renderPasswordReset(PAGE, answers({ reset: () => new Promise<Response>((resolve) => (release = resolve)) }))
    await fillPasswords(user, 'new-password-1')
    expect(await screen.findByRole('button', { name: 'Changing…' })).toBeDisabled()
    release(new Response(null, { status: 204 }))
    expect(await screen.findByTestId('login-state')).toBeInTheDocument()
  })

  it("offers to try again when the check couldn't be made, and the second try can work", async () => {
    const user = userEvent.setup()
    let calls = 0
    renderPasswordReset(
      PAGE,
      answers({
        check: () =>
          ++calls === 1
            ? apiError(429, 'Too many requests.')
            : json({ email: 'pat@example.com', expiresAt: EXPIRES }),
      }),
    )
    expect(await screen.findByRole('alert')).toHaveTextContent('Too many requests.')
    expect(screen.getByRole('heading', { name: "We couldn't check your link" })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByRole('heading', { name: 'Choose a new password' })).toBeInTheDocument()
  })

  it('asks for the link when there is no token, and asks the server nothing', () => {
    renderPasswordReset('/reset-password', answers())
    expect(screen.getByRole('heading', { name: 'Open your reset link' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Request a new link' })).toBeInTheDocument()
    expect(requests()).toEqual([])
  })

  it('asks a signed-in visitor to log out first, without checking the link', async () => {
    const user = userEvent.setup()
    renderPasswordReset(PAGE, answers(), { email: 'alex@example.com' })
    expect(screen.getByRole('heading', { name: "You're already signed in" })).toBeInTheDocument()
    expect(screen.getByText(/You're signed in as alex@example\.com\. To reset a password, log out/)).toBeInTheDocument()
    expect(requests()).toEqual([])

    await user.click(screen.getByRole('button', { name: 'Log out' }))
    expect(await screen.findByTestId('login-state')).toBeInTheDocument()
    expect(requests().map((r) => r.path)).toContain('/auth/logout')
  })
})