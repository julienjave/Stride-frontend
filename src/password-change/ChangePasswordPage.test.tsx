import { describe, expect, it } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { WRONG_PASSWORD_MESSAGE } from '@/auth/currentPassword'
import { pendingEmailChangeQueryKey } from '@/email-change/usePendingEmailChange'
import {
  address,
  apiError,
  json,
  ME,
  meReads,
  noContent,
  pendingAnswer,
  PENDING_EMAIL,
  renderPasswordChange,
  requests,
  type SentRequest,
} from './renderPasswordChange'
import { PASSWORD_CHANGED_NOTICE, SAME_PASSWORD_MESSAGE } from './passwordChangeRules'
import { expectSnackbar } from '@/snackbars/snackbarAssertions'

const GET_PENDING: SentRequest = { method: 'GET', path: '/auth/email-change', body: null }

// The pending-email answer, plus one answer for the POST.
function answers(
  pending: typeof PENDING_EMAIL | null,
  post: () => Response | Promise<Response>,
) {
  const readPending = pendingAnswer(pending)
  return (request: SentRequest) =>
    request.method === 'POST' && request.path === '/auth/password' ? post() : readPending(request)
}

async function fill(current: string, next: string, confirm = next) {
  const user = userEvent.setup()
  if (current) await user.type(screen.getByLabelText('Current password'), current)
  if (next) await user.type(screen.getByLabelText('New password'), next)
  if (confirm) await user.type(screen.getByLabelText('Confirm new password'), confirm)
  return user
}

async function send(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Change password' }))
}

// /profile/password — changing one's own password (decisions §13).
describe('ChangePasswordPage', () => {
  it('says what will happen, and mentions no email change when none is waiting', async () => {
    const { queryClient } = renderPasswordChange('/profile/password', pendingAnswer(null))

    expect(
      screen.getByRole('heading', { level: 1, name: 'Change your password' }),
    ).toBeInTheDocument()
    expect(screen.getByText(/any other devices signed in to your account are signed out/))
      .toHaveTextContent('This one stays signed in.')
    // Absence only means something once the answer has arrived.
    await waitFor(() =>
      expect(queryClient.getQueryState(pendingEmailChangeQueryKey)?.status).toBe('success'),
    )
    expect(screen.queryByText(/also cancels your change of email/)).not.toBeInTheDocument()
  })

  // The person's choice: a waiting email change is cancelled by a new
  // password — said BEFORE they send.
  it('warns that a waiting change of email will be cancelled', async () => {
    renderPasswordChange('/profile/password', pendingAnswer(PENDING_EMAIL))

    expect(await screen.findByText(/also cancels your change of email/)).toHaveTextContent(
      'Changing your password also cancels your change of email to pat.new@example.com, which is waiting for confirmation.',
    )
  })

  // For password managers: the account the new password belongs to.
  it('names the account in a hidden username field', () => {
    renderPasswordChange('/profile/password', pendingAnswer(null))

    const username = document.querySelector('input[autocomplete="username"]')
    expect(username).toHaveValue('pat@example.com')
    expect(username).not.toBeVisible()
    expect(screen.getByLabelText('Current password')).toHaveAttribute(
      'autocomplete',
      'current-password',
    )
    expect(screen.getByLabelText('New password')).toHaveAttribute('autocomplete', 'new-password')
    expect(screen.getByLabelText('Confirm new password')).toHaveAttribute(
      'autocomplete',
      'new-password',
    )
  })

  it('sends both passwords exactly as typed, then says so on the profile — the cancelled email change gone', async () => {
    renderPasswordChange(
      ['/profile', '/profile/password'],
      answers(PENDING_EMAIL, () => noContent()),
    )
    await screen.findByText(/also cancels your change of email/)

    await send(await fill(' old pw ', ' new secret ', ' new secret '))

    await screen.findByRole('heading', { name: 'My profile' })
    expectSnackbar('success', PASSWORD_CHANGED_NOTICE)
    expect(address()).toBe('/profile')
    // The backend cancelled the email change; the cache was told — the
    // profile's Email row shows nothing waiting, and asks nothing again.
    expect(screen.queryByText(/Waiting for confirmation of/)).not.toBeInTheDocument()
    expect(requests()).toEqual([
      GET_PENDING,
      {
        method: 'POST',
        path: '/auth/password',
        body: '{"currentPassword":" old pw ","newPassword":" new secret "}',
      },
    ])
  })

  // replace: Back from the profile doesn't reopen a form already sent.
  it('replaces the form in the history', async () => {
    renderPasswordChange(['/start', '/profile/password'], answers(null, () => noContent()))

    const user = await fill('old secret', 'new secret')
    await send(user)
    await screen.findByRole('heading', { name: 'My profile' })
    await user.click(screen.getByRole('button', { name: 'test: back' }))

    expect(address()).toBe('/start')
  })

  it('checks the fields before sending anything', async () => {
    renderPasswordChange('/profile/password', pendingAnswer(null))
    const user = userEvent.setup()

    await send(user)

    expect(await screen.findByText('Enter your current password')).toBeInTheDocument()
    expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument()
    expect(screen.getByLabelText('Current password')).toHaveFocus()
    expect(screen.getByLabelText('Current password')).toHaveAttribute('aria-invalid', 'true')
    expect(requests()).toEqual([GET_PENDING])
  })

  it('refuses the current password as the new one, at the new password, without sending', async () => {
    renderPasswordChange('/profile/password', pendingAnswer(null))

    await send(await fill('same secret', 'same secret'))

    expect(await screen.findByText(SAME_PASSWORD_MESSAGE)).toHaveAttribute('id', 'password-error')
    expect(screen.getByLabelText('New password')).toHaveFocus()
    expect(requests()).toEqual([GET_PENDING])
  })

  // The hint and the error are both read with the field.
  it('ties the hint and the error to the new password field', async () => {
    renderPasswordChange('/profile/password', pendingAnswer(null))
    expect(screen.getByLabelText('New password')).toHaveAccessibleDescription(
      'At least 8 characters.',
    )

    await send(await fill('old secret', 'short', 'short'))

    expect(await screen.findByLabelText('New password')).toHaveAccessibleDescription(
      'At least 8 characters. Password must be at least 8 characters',
    )
  })

  // The step-up's refusal belongs to its field: said there, the field
  // cleared and focused; the new password stays typed.
  it('says a wrong current password at its field, cleared and focused', async () => {
    renderPasswordChange(
      '/profile/password',
      answers(null, () => apiError(400, WRONG_PASSWORD_MESSAGE)),
    )

    await send(await fill('not it', 'new secret'))

    expect(await screen.findByText(WRONG_PASSWORD_MESSAGE)).toHaveAttribute(
      'id',
      'currentPassword-error',
    )
    expect(screen.getByLabelText('Current password')).toHaveValue('')
    expect(screen.getByLabelText('Current password')).toHaveFocus()
    expect(screen.getByLabelText('New password')).toHaveValue('new secret')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(address()).toBe('/profile/password')
  })

  it("says any other refusal under the form, in the server's words", async () => {
    renderPasswordChange(
      '/profile/password',
      answers(null, () => apiError(429, 'ThrottlerException: Too Many Requests')),
    )

    await send(await fill('old secret', 'new secret'))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'ThrottlerException: Too Many Requests',
    )
    expect(screen.getByLabelText('Current password')).toHaveValue('old secret')
  })

  it('says a failed connection plainly', async () => {
    renderPasswordChange(
      '/profile/password',
      answers(null, () => Promise.reject(new TypeError('Failed to fetch'))),
    )

    await send(await fill('old secret', 'new secret'))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Something went wrong. Check your connection and try again.',
    )
  })

  it('shows the change in progress and refuses a second press', async () => {
    let finish: (response: Response) => void = () => {}
    renderPasswordChange(
      '/profile/password',
      answers(null, () => new Promise<Response>((resolve) => (finish = resolve))),
    )

    await send(await fill('old secret', 'new secret'))

    const button = await screen.findByRole('button', { name: 'Changing…' })
    expect(button).toBeDisabled()
    finish(noContent())
    await screen.findByRole('heading', { name: 'My profile' })
    expectSnackbar('success', PASSWORD_CHANGED_NOTICE)
    expect(requests().filter((request) => request.method === 'POST')).toHaveLength(1)
  })
})
// An account with two-factor sign-in on proves itself with a code as well
// (decisions §14): an app code or a recovery code, at its own field.
describe('ChangePasswordPage — with two-factor sign-in on', () => {
  it('asks no code when two-factor sign-in is off', () => {
    renderPasswordChange('/profile/password', pendingAnswer(null))

    expect(screen.queryByLabelText('Two-factor code')).not.toBeInTheDocument()
  })

  it('sends the code, trimmed, with both passwords', async () => {
    renderPasswordChange(
      ['/profile', '/profile/password'],
      answers(null, () => noContent()),
      { mfaEnabled: true },
    )

    const user = await fill('old secret', 'new secret 1')
    const code = screen.getByLabelText('Two-factor code')
    // Letters too — a recovery code: no number pad.
    expect(code).not.toHaveAttribute('inputmode')
    expect(code).toHaveAccessibleDescription(
      'From your authenticator app, or one of your recovery codes.',
    )
    await user.type(code, ' abcde-23456 ')
    await send(user)

    await screen.findByRole('heading', { name: 'My profile' })
    expectSnackbar('success', PASSWORD_CHANGED_NOTICE)
    expect(requests().find((r) => r.method === 'POST')).toEqual({
      method: 'POST',
      path: '/auth/password',
      body: '{"currentPassword":"old secret","newPassword":"new secret 1","mfaCode":"abcde-23456"}',
    })
  })

  it('checks the code before sending anything', async () => {
    renderPasswordChange('/profile/password', pendingAnswer(null), { mfaEnabled: true })

    const user = await fill('old secret', 'new secret 1')
    await user.type(screen.getByLabelText('Two-factor code'), '12345')
    await send(user)

    expect(
      await screen.findByText(
        'Enter the 6-digit code from your authenticator app, or one of your recovery codes',
      ),
    ).toHaveAttribute('id', 'mfaCode-error')
    expect(requests().some((r) => r.method === 'POST')).toBe(false)
  })

  it('says a refused code at the code field — cleared, focused, no other alert', async () => {
    renderPasswordChange(
      '/profile/password',
      answers(null, () => apiError(400, 'Invalid authentication code')),
      { mfaEnabled: true },
    )

    const user = await fill('old secret', 'new secret 1')
    await user.type(screen.getByLabelText('Two-factor code'), '123456')
    await send(user)

    const code = screen.getByLabelText('Two-factor code')
    expect(await screen.findByText('Invalid authentication code')).toHaveAttribute(
      'id',
      'mfaCode-error',
    )
    expect(code).toHaveValue('')
    expect(code).toHaveFocus()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    // The passwords stay: only the code was wrong.
    expect(screen.getByLabelText('Current password')).toHaveValue('old secret')
  })

  it('still says a wrong password at the password field', async () => {
    renderPasswordChange(
      '/profile/password',
      answers(null, () => apiError(400, WRONG_PASSWORD_MESSAGE)),
      { mfaEnabled: true },
    )

    const user = await fill('wrong', 'new secret 1')
    await user.type(screen.getByLabelText('Two-factor code'), '123456')
    await send(user)

    expect(await screen.findByText(WRONG_PASSWORD_MESSAGE)).toHaveAttribute(
      'id',
      'currentPassword-error',
    )
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})

// The account is read AGAIN as the page opens (useRefreshedCurrentUser):
// two-factor may have been turned off on another device — which signs no
// device out — and this tab's start-up copy would still ask for a code.
describe('ChangePasswordPage — the account read again on opening', () => {
  it('reads the account once as it opens', async () => {
    renderPasswordChange('/profile/password', pendingAnswer(null))

    await waitFor(() => expect(meReads()).toBe(1))
  })

  it('drops the code field when two-factor was turned off elsewhere, and sends no code', async () => {
    renderPasswordChange(
      ['/profile', '/profile/password'],
      (request) =>
        request.method === 'GET' && request.path === '/auth/me'
          ? json({ ...ME, mfaEnabled: false })
          : answers(null, () => noContent())(request),
      { mfaEnabled: true },
    )

    await waitFor(() =>
      expect(screen.queryByLabelText('Two-factor code')).not.toBeInTheDocument(),
    )
    const user = await fill('old secret', 'new secret 1')
    await send(user)

    await screen.findByRole('heading', { name: 'My profile' })
    expectSnackbar('success', PASSWORD_CHANGED_NOTICE)
    expect(requests().find((r) => r.method === 'POST')).toEqual({
      method: 'POST',
      path: '/auth/password',
      body: '{"currentPassword":"old secret","newPassword":"new secret 1"}',
    })
  })

  // A failed read keeps what the tab had: the backend checks anyway.
  it('keeps the code field when the read fails', async () => {
    renderPasswordChange(
      '/profile/password',
      (request) =>
        request.method === 'GET' && request.path === '/auth/me'
          ? apiError(500, 'Internal server error')
          : pendingAnswer(null)(request),
      { mfaEnabled: true },
    )

    await waitFor(() =>
      expect(requests()).toContainEqual({ method: 'GET', path: '/auth/me', body: null }),
    )
    expect(screen.getByLabelText('Two-factor code')).toBeInTheDocument()
  })
})