import { describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { address, apiError, json, renderEmailChange, requests } from './renderEmailChange'

const PENDING = {
  newEmail: 'pat.new@example.com',
  createdAt: '2031-03-13T13:30:00.000Z',
  expiresAt: '2031-03-14T13:30:00.000Z',
}

async function fillAndSend(newEmail: string, password: string) {
  const user = userEvent.setup()
  await user.type(screen.getByLabelText('New email address'), newEmail)
  await user.type(screen.getByLabelText('Current password'), password)
  await user.click(screen.getByRole('button', { name: 'Send the confirmation link' }))
  return user
}

// /profile/email — asking for the change (decisions §12).
describe('ChangeEmailPage', () => {
  it('says what will happen, naming the address used until then', () => {
    renderEmailChange('/profile/email', () => undefined)

    expect(screen.getByRole('heading', { level: 1, name: 'Change your email address' }))
      .toBeInTheDocument()
    expect(screen.getByText(/until then you sign in with/)).toHaveTextContent(
      'until then you sign in with pat@example.com.',
    )
    expect(screen.getByText(/signed out on your other devices/)).toBeInTheDocument()
  })

  it('sends the address trimmed and the password as typed, then shows the waiting change on the profile', async () => {
    renderEmailChange(['/profile', '/profile/email'], ({ method, path }) =>
      method === 'POST' && path === '/auth/email-change'
        ? json({ pending: PENDING }, 201)
        : undefined,
    )

    await fillAndSend('  pat.new@example.com ', ' secret pw ')

    expect(await screen.findByText(/Waiting for confirmation of/)).toHaveTextContent(
      'pat.new@example.com',
    )
    expect(address()).toBe('/profile')
    // The answer was written into the cache: no GET of the pending change.
    expect(requests()).toEqual([
      {
        method: 'POST',
        path: '/auth/email-change',
        body: '{"newEmail":"pat.new@example.com","currentPassword":" secret pw "}',
      },
    ])
  })

  // replace: Back from the profile doesn't reopen the form already sent.
  it('replaces the form in the history', async () => {
    const user = userEvent.setup()
    renderEmailChange(['/start', '/profile/email'], ({ method }) =>
      method === 'POST' ? json({ pending: PENDING }, 201) : undefined,
    )

    await fillAndSend('pat.new@example.com', 'password123')
    await screen.findByText(/Waiting for confirmation of/)
    await user.click(screen.getByRole('button', { name: 'test: back' }))

    expect(address()).toBe('/start')
  })

  it('checks the fields before sending anything', async () => {
    const user = userEvent.setup()
    renderEmailChange('/profile/email', () => undefined)

    await user.click(screen.getByRole('button', { name: 'Send the confirmation link' }))

    expect(await screen.findByText('Enter the new email address')).toBeInTheDocument()
    expect(screen.getByText('Enter your current password')).toBeInTheDocument()
    expect(screen.getByLabelText('New email address')).toHaveFocus()
    expect(requests()).toEqual([])
  })

  it('says a wrong password at the password field — cleared, focused, no other alert', async () => {
    renderEmailChange('/profile/email', () =>
      apiError(400, 'Your current password is not correct'),
    )

    await fillAndSend('pat.new@example.com', 'wrong')

    const password = screen.getByLabelText('Current password')
    expect(await screen.findByText('Your current password is not correct')).toHaveAttribute(
      'id',
      'currentPassword-error',
    )
    expect(password).toHaveValue('')
    expect(password).toHaveFocus()
    expect(password).toHaveAttribute('aria-invalid', 'true')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(address()).toBe('/profile/email')
  })

  it('says "already your address" at the address field', async () => {
    renderEmailChange('/profile/email', () =>
      apiError(400, 'This is already your email address'),
    )

    await fillAndSend('PAT@example.com', 'password123')

    expect(await screen.findByText('This is already your email address')).toHaveAttribute(
      'id',
      'newEmail-error',
    )
    expect(screen.getByLabelText('New email address')).toHaveFocus()
    expect(screen.getByLabelText('Current password')).toHaveValue('password123')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('says any other failure under the form', async () => {
    renderEmailChange('/profile/email', () =>
      apiError(429, 'Too many requests. Try again in a minute.'),
    )

    await fillAndSend('pat.new@example.com', 'password123')

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Too many requests. Try again in a minute.',
    )
  })
})
// An account with two-factor sign-in on proves itself with a code as well
// (decisions §14).
describe('ChangeEmailPage — with two-factor sign-in on', () => {
  const WITH_MFA = { email: 'pat@example.com', mfaEnabled: true }

  it('asks no code when two-factor sign-in is off', () => {
    renderEmailChange('/profile/email', () => undefined)

    expect(screen.queryByLabelText('Two-factor code')).not.toBeInTheDocument()
  })

  it('sends the code, trimmed, with the address and the password', async () => {
    renderEmailChange(
      ['/profile', '/profile/email'],
      ({ method }) => (method === 'POST' ? json({ pending: PENDING }, 201) : undefined),
      WITH_MFA,
    )

    const user = userEvent.setup()
    await user.type(screen.getByLabelText('New email address'), 'pat.new@example.com')
    await user.type(screen.getByLabelText('Current password'), 'secret pw')
    await user.type(screen.getByLabelText('Two-factor code'), ' 123456 ')
    await user.click(screen.getByRole('button', { name: 'Send the confirmation link' }))

    await screen.findByText(/Waiting for confirmation of/)
    expect(requests()).toEqual([
      {
        method: 'POST',
        path: '/auth/email-change',
        body: '{"newEmail":"pat.new@example.com","currentPassword":"secret pw","mfaCode":"123456"}',
      },
    ])
  })

  it('says a refused code at the code field — cleared, focused, no other alert', async () => {
    renderEmailChange(
      '/profile/email',
      () => apiError(400, 'This recovery code is not valid, or has already been used'),
      WITH_MFA,
    )

    const user = userEvent.setup()
    await user.type(screen.getByLabelText('New email address'), 'pat.new@example.com')
    await user.type(screen.getByLabelText('Current password'), 'secret pw')
    await user.type(screen.getByLabelText('Two-factor code'), 'abcde-23456')
    await user.click(screen.getByRole('button', { name: 'Send the confirmation link' }))

    const code = screen.getByLabelText('Two-factor code')
    expect(
      await screen.findByText('This recovery code is not valid, or has already been used'),
    ).toHaveAttribute('id', 'mfaCode-error')
    expect(code).toHaveValue('')
    expect(code).toHaveFocus()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})