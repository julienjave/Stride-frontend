import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
import type { ReactNode } from 'react'
import { useLogout } from './useLogout'

const fetchMock = vi.fn<typeof fetch>()
vi.stubGlobal('fetch', fetchMock)

beforeEach(() => {
  fetchMock.mockReset()
})

describe('useLogout', () => {
  it('clears every cached query on success, not just the current user', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }))

    const queryClient = new QueryClient()
    // Seed the cache with a couple of unrelated entries FIRST, so we can
    // actually verify they're gone afterward — the real point of using
    // queryClient.clear() over a narrower invalidation.
    queryClient.setQueryData(['auth', 'me'], { id: 1, email: 'a@b.com' })
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

    // The real assertion: BOTH entries are gone, not just the auth one —
    // confirms clear() ran, rather than some narrower invalidation that
    // happened to only target currentUserQueryKey.
    expect(queryClient.getQueryData(['auth', 'me'])).toBeUndefined()
    expect(queryClient.getQueryData(['exercises'])).toBeUndefined()
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