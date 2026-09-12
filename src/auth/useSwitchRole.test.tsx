import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useSwitchRole } from './useSwitchRole'
import { currentUserQueryKey } from './useCurrentUser'

const fetchMock = vi.fn<typeof fetch>()
vi.stubGlobal('fetch', fetchMock)

beforeEach(() => {
  fetchMock.mockReset()
})

describe('useSwitchRole', () => {
  it('clears every other cached query but immediately re-seeds the current user with fresh data', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 1,
          email: 'a@b.com',
          activeRole: 'admin',
          roles: ['practitioner', 'admin'],
        }),
        { status: 201 },
      ),
    )

    const queryClient = new QueryClient()
    // Seed BOTH the old current-user data and an unrelated role-scoped
    // query, so we can tell the difference between "everything got wiped"
    // and "everything got wiped, then the user entry specifically came
    // back with fresh data."
    queryClient.setQueryData(currentUserQueryKey, {
      id: 1,
      email: 'a@b.com',
      activeRole: 'practitioner',
      roles: ['practitioner', 'admin'],
    })
    queryClient.setQueryData(['patients'], [{ id: 5, name: 'Old patient' }])

    function Wrapper({ children }: { children: ReactNode }) {
      return (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      )
    }

    const { result } = renderHook(() => useSwitchRole(), { wrapper: Wrapper })
    result.current.mutate('admin')

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    // The unrelated query is genuinely gone — not just stale, GONE.
    expect(queryClient.getQueryData(['patients'])).toBeUndefined()

    // The current-user entry is back, but with the NEW activeRole — proof
    // this is the fresh response data, not the old cached value somehow
    // surviving the clear().
    const finalUser = queryClient.getQueryData<{ activeRole: string }>(
      currentUserQueryKey,
    )
    expect(finalUser?.activeRole).toBe('admin')
  })

  it('calls POST /auth/switch-role with the chosen role', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({ id: 1, email: 'a@b.com', activeRole: 'admin', roles: [] }),
        { status: 201 },
      ),
    )
    const queryClient = new QueryClient()
    function Wrapper({ children }: { children: ReactNode }) {
      return (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      )
    }

    const { result } = renderHook(() => useSwitchRole(), { wrapper: Wrapper })
    result.current.mutate('admin')

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/auth/switch-role'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ role: 'admin' }),
        }),
      ),
    )
  })
})