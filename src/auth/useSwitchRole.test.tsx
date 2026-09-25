import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, renderHook, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useSwitchRole } from './useSwitchRole'
import { currentUserQueryKey, useCurrentUser } from './useCurrentUser'

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
          // A literal string, not JSON.stringify(...) — the test must say
          // what the wire format IS, not recompute it the same way the
          // code does.
          body: '{"role":"admin"}',
        }),
      ),
    )
  })

  it('components already showing the current user update to the new role at once', async () => {
    // The regression test for the "header keeps showing the old role" bug.
    // The first test above only reads the CACHE, which was correct even
    // while the bug existed: the new user WAS in the cache. The bug was
    // that components already watching the old cache entry were never told.
    // So this test renders one such component and checks what it DISPLAYS,
    // with no navigation or anything else around to re-render it by luck.
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
    queryClient.setQueryData(currentUserQueryKey, {
      id: 1,
      email: 'a@b.com',
      activeRole: 'practitioner',
      roles: ['practitioner', 'admin'],
    })

    function RoleDisplay() {
      const { data: user } = useCurrentUser()
      return <p>Active role: {user?.activeRole}</p>
    }
    function SwitchButton() {
      const switchRoleMutation = useSwitchRole()
      return (
        <button onClick={() => switchRoleMutation.mutate('admin')}>
          Switch
        </button>
      )
    }

    render(
      <QueryClientProvider client={queryClient}>
        <RoleDisplay />
        <SwitchButton />
      </QueryClientProvider>,
    )
    expect(screen.getByText('Active role: practitioner')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Switch' }))

    expect(await screen.findByText('Active role: admin')).toBeInTheDocument()
  })
})