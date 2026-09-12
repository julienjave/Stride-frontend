import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RoleSwitcher } from './RoleSwitcher'
import { currentUserQueryKey } from './useCurrentUser'

const fetchMock = vi.fn<typeof fetch>()
vi.stubGlobal('fetch', fetchMock)

beforeEach(() => {
  fetchMock.mockReset()
})

function renderWithUser(user: { activeRole: string; roles: string[] }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  // Seed the cache directly rather than mocking a fetch call — RoleSwitcher
  // reads via useCurrentUser(), which reads whatever's already in the
  // cache without needing a real request for this particular test.
  queryClient.setQueryData(currentUserQueryKey, user)
  return render(
    <QueryClientProvider client={queryClient}>
      <RoleSwitcher />
    </QueryClientProvider>,
  )
}

describe('RoleSwitcher', () => {
  it('renders nothing for a single-role account', () => {
    const { container } = renderWithUser({
      activeRole: 'patient',
      roles: ['patient'],
    })
    expect(container).toBeEmptyDOMElement()
  })

  it('shows only the roles the account holds, excluding the currently active one', () => {
    renderWithUser({
      activeRole: 'practitioner',
      roles: ['practitioner', 'admin'],
    })

    expect(
      screen.getByRole('button', { name: 'Switch to admin' }),
    ).toBeInTheDocument()
    // The currently active role should NOT appear as a switch target —
    // switching to the role you're already in doesn't make sense.
    expect(
      screen.queryByRole('button', { name: 'Switch to practitioner' }),
    ).not.toBeInTheDocument()
  })
})