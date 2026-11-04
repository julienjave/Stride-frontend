/*
    Copyright 2026 Julien Javelaud

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

        http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
*/
// -----------------------------------------------------------------------------------------------------------

import { describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ME, address, apiError, json, renderEmailChange, requests } from './renderEmailChange'

const LINK = '/confirm-email?token=abc123'

// /confirm-email — the link sent to the NEW address (decisions §12).
describe('ConfirmEmailPage', () => {
  // A mail scanner opening the link must change nothing: only the button
  // acts. And the token leaves the address at once.
  it('sends nothing on opening, and takes the token out of the address', async () => {
    renderEmailChange(LINK, () => undefined, null)

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Confirm your new email address' }),
    ).toBeInTheDocument()
    expect(screen.getByText(/signs you out on your other devices/)).toBeInTheDocument()
    expect(address()).toBe('/confirm-email')
    expect(requests()).toEqual([])
  })

  it('confirms on the button; signed out here, offers to log in with the new address', async () => {
    const user = userEvent.setup()
    renderEmailChange(
      LINK,
      ({ path }) =>
        path === '/auth/email-change/confirm' ? json({ email: 'pat.new@example.com' }) : undefined,
      null,
    )

    await user.click(screen.getByRole('button', { name: 'Confirm my new address' }))

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Your email address is changed' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent(
      "You now sign in with pat.new@example.com. You've been signed out on your other devices.",
    )
    expect(requests()).toEqual([
      { method: 'POST', path: '/auth/email-change/confirm', body: '{"token":"abc123"}' },
    ])
    expect(screen.queryByRole('link', { name: 'Back to my profile' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: 'Log in' }))
    expect(screen.getByTestId('login-state')).toHaveTextContent('{"email":"pat.new@example.com"}')
  })

  // Signed in as the account: its session was kept, and "who am I" is read
  // again — it now answers the new address.
  it('signed in as the account, re-reads who is signed in and leads back to the profile', async () => {
    const user = userEvent.setup()
    renderEmailChange(LINK, ({ path }) => {
      if (path === '/auth/email-change/confirm') return json({ email: 'pat.new@example.com' })
      if (path === '/auth/me') return json({ ...ME, email: 'pat.new@example.com' })
      return undefined
    })

    await user.click(screen.getByRole('button', { name: 'Confirm my new address' }))

    expect(await screen.findByRole('link', { name: 'Back to my profile' })).toHaveAttribute(
      'href',
      '/profile',
    )
    expect(screen.queryByRole('link', { name: 'Log in' })).not.toBeInTheDocument()
    expect(requests().map((r) => `${r.method} ${r.path}`)).toEqual([
      'POST /auth/email-change/confirm',
      'GET /auth/me',
    ])
  })

  // The change is made whatever happens next: a failed re-read of who is
  // signed in must not turn the page into an error.
  it('still says the change is made when re-reading who is signed in fails', async () => {
    const user = userEvent.setup()
    renderEmailChange(LINK, ({ path }) =>
      path === '/auth/email-change/confirm' ? json({ email: 'pat.new@example.com' }) : undefined,
    )

    await user.click(screen.getByRole('button', { name: 'Confirm my new address' }))

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Your email address is changed' }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('signed in as someone else, offers to log in', async () => {
    const user = userEvent.setup()
    renderEmailChange(
      LINK,
      ({ path }) => {
        if (path === '/auth/email-change/confirm') return json({ email: 'pat.new@example.com' })
        if (path === '/auth/me') return json({ ...ME, id: 9, email: 'jo@example.com' })
        return undefined
      },
      { email: 'jo@example.com' },
    )

    await user.click(screen.getByRole('button', { name: 'Confirm my new address' }))

    expect(await screen.findByRole('link', { name: 'Log in' })).toBeInTheDocument()
  })

  it('explains a dead link, and how to ask again', async () => {
    const user = userEvent.setup()
    renderEmailChange(LINK, () => apiError(400, 'This link is invalid or has expired'), null)

    await user.click(screen.getByRole('button', { name: 'Confirm my new address' }))

    expect(
      await screen.findByRole('heading', { level: 1, name: "This link can't be used" }),
    ).toBeInTheDocument()
    expect(screen.getByText(/work for 24 hours, and only once/)).toHaveTextContent(
      'This link is invalid or has expired. Confirmation links work for 24 hours',
    )
    expect(screen.getByRole('link', { name: 'Ask for the change again' })).toHaveAttribute(
      'href',
      '/profile/email',
    )
  })

  it('explains an address taken since the request', async () => {
    const user = userEvent.setup()
    renderEmailChange(
      LINK,
      () =>
        apiError(
          409,
          'This address now belongs to another Stride account, so your email was not changed',
        ),
      null,
    )

    await user.click(screen.getByRole('button', { name: 'Confirm my new address' }))

    expect(
      await screen.findByRole('heading', { level: 1, name: "This address can't be used" }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Choose another address' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Ask for the change again' })).not.toBeInTheDocument()
  })

  it('keeps the button after any other failure, saying why', async () => {
    const user = userEvent.setup()
    renderEmailChange(LINK, () => apiError(429, 'Too many requests'), null)

    await user.click(screen.getByRole('button', { name: 'Confirm my new address' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Too many requests')
    expect(screen.getByRole('button', { name: 'Confirm my new address' })).toBeEnabled()
    expect(screen.queryByRole('heading', { name: "This link can't be used" })).not.toBeInTheDocument()
  })

  it('without a token, asks for the link and sends nothing', () => {
    renderEmailChange('/confirm-email', () => undefined, null)

    expect(
      screen.getByRole('heading', { level: 1, name: 'Open your confirmation link' }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button')).toHaveTextContent('test: back')
    expect(requests()).toEqual([])
  })
})