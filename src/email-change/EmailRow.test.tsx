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
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  address,
  apiError,
  json,
  noContent,
  renderEmailChange,
  requests,
} from './renderEmailChange'
import { formatLinkExpiry } from './emailChangeRules'

const PENDING = {
  newEmail: 'pat.new@example.com',
  createdAt: '2031-03-13T13:30:00.000Z',
  expiresAt: '2031-03-14T13:30:00.000Z',
}

// The Email row of the person's own profile (decisions §12): the address and
// "Change" — or, while a change waits, the notice with Cancel.
describe('EmailRow', () => {
  it('shows the address and "Change", which opens the change page', async () => {
    const user = userEvent.setup()
    renderEmailChange('/profile', ({ path }) =>
      path === '/auth/email-change' ? json({ pending: null }) : undefined,
    )

    expect(screen.getByText('pat@example.com')).toBeInTheDocument()
    await user.click(await screen.findByRole('link', { name: 'Change Email' }))

    expect(address()).toBe('/profile/email')
    expect(screen.queryByText(/Waiting for confirmation/)).not.toBeInTheDocument()
  })

  it('shows a waiting change in full, with its expiry — and no "Change"', async () => {
    renderEmailChange('/profile', ({ path }) =>
      path === '/auth/email-change' ? json({ pending: PENDING }) : undefined,
    )

    const notice = await screen.findByText(/Waiting for confirmation of/)
    expect(notice).toHaveTextContent(
      `Waiting for confirmation of pat.new@example.com. Open the link we sent there before ${formatLinkExpiry(PENDING.expiresAt)}. Until then, you sign in with your current address.`,
    )
    expect(screen.queryByRole('link', { name: 'Change Email' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Change to another address' })).toHaveAttribute(
      'href',
      '/profile/email',
    )
  })

  it('cancels the waiting change, then offers "Change" again', async () => {
    const user = userEvent.setup()
    let pending: typeof PENDING | null = PENDING
    renderEmailChange('/profile', ({ method, path }) => {
      if (path !== '/auth/email-change') return undefined
      if (method === 'DELETE') {
        pending = null
        return noContent()
      }
      return json({ pending })
    })

    await user.click(await screen.findByRole('button', { name: 'Cancel the change' }))

    expect(await screen.findByRole('link', { name: 'Change Email' })).toBeInTheDocument()
    expect(screen.queryByText(/Waiting for confirmation/)).not.toBeInTheDocument()
    // The 204 IS the answer: no second request to ask what is pending.
    expect(requests()).toEqual([
      { method: 'GET', path: '/auth/email-change', body: null },
      { method: 'DELETE', path: '/auth/email-change', body: null },
    ])
  })

  it("says why a cancel failed, and keeps the notice", async () => {
    const user = userEvent.setup()
    renderEmailChange('/profile', ({ method, path }) => {
      if (path !== '/auth/email-change') return undefined
      return method === 'DELETE'
        ? apiError(429, 'Too many requests. Try again in a minute.')
        : json({ pending: PENDING })
    })

    await user.click(await screen.findByRole('button', { name: 'Cancel the change' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Too many requests. Try again in a minute.',
    )
    await waitFor(() =>
      expect(screen.getByText(/Waiting for confirmation/)).toBeInTheDocument(),
    )
  })
})