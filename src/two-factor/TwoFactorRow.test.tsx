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

import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
import { TwoFactorRow } from './TwoFactorRow'

const fetchMock = vi.fn<typeof fetch>()
vi.stubGlobal('fetch', fetchMock)

function renderRow(mfaEnabled: boolean, remaining = 10) {
  fetchMock.mockReset()
  fetchMock.mockImplementation(() =>
    Promise.resolve(
      new Response(JSON.stringify({ remaining }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    ),
  )
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter>
        <TwoFactorRow mfaEnabled={mfaEnabled} />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

// The profile's "Two-factor sign-in" row (decisions §14).
describe('TwoFactorRow', () => {
  it('Off: offers to set it up, and asks nothing', () => {
    renderRow(false)

    expect(screen.getByText('Off')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Set up two-factor sign-in' })).toHaveAttribute(
      'href',
      '/profile/two-factor',
    )
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('On: says how many recovery codes are left, and offers to manage it', async () => {
    renderRow(true, 7)

    expect(screen.getByText('On')).toBeInTheDocument()
    const count = await screen.findByText('7 recovery codes left')
    expect(count).not.toHaveClass('text-destructive')
    expect(screen.getByRole('link', { name: 'Manage two-factor sign-in' })).toHaveAttribute(
      'href',
      '/profile/two-factor',
    )
  })

  it('On with none left: says so, as a warning', async () => {
    renderRow(true, 0)

    expect(await screen.findByText('No recovery codes left')).toHaveClass('text-destructive')
  })
})