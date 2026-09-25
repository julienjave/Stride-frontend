import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, renderHook, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
import type { ReactNode } from 'react'
import { useLogout } from './useLogout'
import { currentUserQueryKey, useCurrentUser } from './useCurrentUser'

const fetchMock = vi.fn<typeof fetch>()
vi.stubGlobal('fetch', fetchMock)

beforeEach(() => {
  fetchMock.mockReset()
})

function urlOf(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input
  if (input instanceof URL) return input.toString()
  return input.url
}

describe('useLogout', () => {
  it('drops every other cached query, and records the current user as logged out (null)', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }))

    const queryClient = new QueryClient()
    // Seed the cache FIRST, so we can verify what happens to each entry.
    queryClient.setQueryData(currentUserQueryKey, { id: 1, email: 'a@b.com' })
    queryClient.setQueryData(['exercises'], [{ id: 1, name: 'Squat' }])

    function Wrapper({ children }: { children: ReactNode }) {
      return (
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>{children}</MemoryRouter>
        </QueryClientProvider>
      )
    }

    const { result } = renderHook(() => useLogout(), { wrapper: Wrapper })

    result.current.mutate()

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    // Unrelated data is GONE — not left in memory for the next person.
    expect(queryClient.getQueryState(['exercises'])).toBeUndefined()
    // The current user is not gone but KNOWN: logged out. toBeNull (not
    // toBeUndefined) is the whole difference between "logged out" and
    // "unknown — go and ask the server again".
    expect(queryClient.getQueryData(currentUserQueryKey)).toBeNull()
  })

  // The bug behind a flaky UserMenu test: after logout, a component that
  // is STILL on screen and reads the current user (like the header) must
  // not trigger a new GET /auth/me. Here that component deliberately stays
  // mounted for the whole test, so the check doesn't depend on timing —
  // with the old queryClient.clear(), this fails every time.
  it('does not re-fetch /auth/me from a component still showing the current user', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }))
    const queryClient = new QueryClient()
    queryClient.setQueryData(currentUserQueryKey, { id: 1, email: 'a@b.com' })

    function StillMounted() {
      const { data: user } = useCurrentUser()
      const logoutMutation = useLogout()
      return (
        <>
          <p>{user ? 'logged in' : 'logged out'}</p>
          <button onClick={() => logoutMutation.mutate()}>Log out</button>
        </>
      )
    }

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <StillMounted />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Log out' }))

    expect(await screen.findByText('logged out')).toBeInTheDocument()
    expect(fetchMock.mock.calls.map(([input]) => urlOf(input))).toEqual([
      expect.stringMatching(/\/auth\/logout$/),
    ])
  })

  it('calls POST /auth/logout', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }))
    const queryClient = new QueryClient()

    function Wrapper({ children }: { children: ReactNode }) {
      return (
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>{children}</MemoryRouter>
        </QueryClientProvider>
      )
    }

    const { result } = renderHook(() => useLogout(), { wrapper: Wrapper })
    result.current.mutate()

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/auth/logout'),
        expect.objectContaining({ method: 'POST' }),
      ),
    )
  })
})