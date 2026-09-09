import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useCurrentUser } from './useCurrentUser'

const fetchMock = vi.fn<typeof fetch>()
vi.stubGlobal('fetch', fetchMock)

beforeEach(() => {
  fetchMock.mockReset()
})

// renderHook needs every hook that calls useQuery to have a
// QueryClientProvider somewhere above it in the tree — this wrapper
// supplies a FRESH QueryClient per test, so one test's cached result can
// never leak into the next test and produce a false pass.
function createWrapper() {
  const queryClient = new QueryClient({
    // Turn off retries for this test client specifically — otherwise a
    // deliberately-failing test (the 401 case below) would sit retrying
    // for real time before the test could observe the failed state.
    defaultOptions: { queries: { retry: false } },
  })
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    )
  }
}

describe('useCurrentUser', () => {
  it('starts in a loading state before the request resolves', () => {
    // A promise that never resolves during this test — enough to observe
    // the hook's very first render, before fetch has had a chance to
    // return anything at all.
    fetchMock.mockReturnValue(new Promise(() => {}))

    const { result } = renderHook(() => useCurrentUser(), {
      wrapper: createWrapper(),
    })

    expect(result.current.isLoading).toBe(true)
  })

  it('resolves to the real user object on a successful /auth/me', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 42,
          email: 'dr.smith@clinic.com',
          firstName: 'Jane',
          lastName: 'Smith',
          activeRole: 'practitioner',
          roles: ['practitioner'],
        }),
        { status: 200 },
      ),
    )

    const { result } = renderHook(() => useCurrentUser(), {
      wrapper: createWrapper(),
    })

    // waitFor polls the assertion until it passes or times out — needed
    // here because the fetch mock resolves asynchronously (a real
    // microtask), so the data isn't there on the very next line yet.
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data?.email).toBe('dr.smith@clinic.com')
    expect(result.current.data?.activeRole).toBe('practitioner')
  })

  it('resolves to an error, not a retry loop, on a 401 (no session)', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          statusCode: 401,
          message: ['Unauthorized'],
          error: 'Unauthorized',
          timestamp: '2026-08-05T14:22:03.101Z',
          path: '/auth/me',
        }),
        { status: 401 },
      ),
    )

    const { result } = renderHook(() => useCurrentUser(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))

    // Confirms retry: false actually worked — fetch was called exactly
    // once, not the library's default 3-attempt retry sequence.
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})