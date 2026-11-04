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
import { apiError, renderPasswordReset, requests, type SentRequest } from './renderPasswordReset'

const ok = ({ method, path }: SentRequest) =>
  method === 'POST' && path === '/auth/forgot-password' ? new Response(null, { status: 204 }) : undefined

describe('ForgotPasswordPage', () => {
  it('opens with the address the sign-in page passed, and sends it trimmed', async () => {
    const user = userEvent.setup()
    renderPasswordReset({ pathname: '/forgot-password', state: { email: 'pat@example.com' } }, ok)

    const email = screen.getByLabelText('Email')
    expect(email).toHaveValue('pat@example.com')
    await user.clear(email)
    await user.type(email, '  pat@example.com ')
    await user.click(screen.getByRole('button', { name: 'Send the link' }))

    expect(await screen.findByRole('heading', { name: 'Check your email' })).toBeInTheDocument()
    expect(requests()).toEqual([
      { method: 'POST', path: '/auth/forgot-password', body: '{"email":"pat@example.com"}' },
    ])
  })

  it('says the same thing whatever the answer means — "if an account exists"', async () => {
    const user = userEvent.setup()
    renderPasswordReset('/forgot-password', ok)
    await user.type(screen.getByLabelText('Email'), 'pat@example.com')
    await user.click(screen.getByRole('button', { name: 'Send the link' }))

    expect(await screen.findByRole('status')).toHaveTextContent(
      "If an account exists for pat@example.com, we've sent it a link to choose a new password. The link works for 1 hour.",
    )
    expect(screen.queryByLabelText('Email')).not.toBeInTheDocument()
  })

  it('goes back to the form to try again', async () => {
    const user = userEvent.setup()
    renderPasswordReset('/forgot-password', ok)
    await user.type(screen.getByLabelText('Email'), 'pat@example.com')
    await user.click(screen.getByRole('button', { name: 'Send the link' }))
    await user.click(await screen.findByRole('button', { name: 'try again' }))
    expect(screen.getByRole('heading', { name: 'Reset your password' })).toBeInTheDocument()
  })

  it('refuses an address that is not one, at its field, and sends nothing', async () => {
    const user = userEvent.setup()
    renderPasswordReset('/forgot-password', ok)
    await user.type(screen.getByLabelText('Email'), 'pat@')
    await user.click(screen.getByRole('button', { name: 'Send the link' }))

    const email = screen.getByLabelText('Email')
    expect(email).toHaveAttribute('aria-invalid', 'true')
    expect(email).toHaveAccessibleDescription('Enter a valid email address')
    expect(requests()).toEqual([])
  })

  it("shows the backend's refusal (too many requests) and keeps the form", async () => {
    const user = userEvent.setup()
    renderPasswordReset('/forgot-password', () => apiError(429, 'Too many requests. Try again in a minute.'))
    await user.type(screen.getByLabelText('Email'), 'pat@example.com')
    await user.click(screen.getByRole('button', { name: 'Send the link' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Too many requests. Try again in a minute.')
    expect(screen.getByRole('button', { name: 'Send the link' })).toBeEnabled()
  })

  it('disables Send while the request is out', async () => {
    const user = userEvent.setup()
    let release: (r: Response) => void = () => undefined
    renderPasswordReset('/forgot-password', () => new Promise<Response>((resolve) => (release = resolve)))
    await user.type(screen.getByLabelText('Email'), 'pat@example.com')
    await user.click(screen.getByRole('button', { name: 'Send the link' }))
    expect(await screen.findByRole('button', { name: 'Sending…' })).toBeDisabled()
    release(new Response(null, { status: 204 }))
    expect(await screen.findByRole('heading', { name: 'Check your email' })).toBeInTheDocument()
  })

  it('carries the address typed back to the sign-in page, from the form', async () => {
    const user = userEvent.setup()
    renderPasswordReset('/forgot-password', ok)
    await user.type(screen.getByLabelText('Email'), 'pat@example.com')
    await user.click(screen.getByRole('link', { name: 'Back to log in' }))
    expect(screen.getByTestId('login-state')).toHaveTextContent('{"email":"pat@example.com"}')
  })

  it('carries the address back after sending too', async () => {
    const user = userEvent.setup()
    renderPasswordReset('/forgot-password', ok)
    await user.type(screen.getByLabelText('Email'), 'pat@example.com')
    await user.click(screen.getByRole('button', { name: 'Send the link' }))
    await user.click(await screen.findByRole('link', { name: 'Back to log in' }))
    expect(screen.getByTestId('login-state')).toHaveTextContent('{"email":"pat@example.com"}')
  })
})