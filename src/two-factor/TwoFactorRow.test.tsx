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