import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, createMemoryRouter, RouterProvider } from 'react-router'
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
      {/* RoleSwitcher now calls useNavigate() (to land on the newly-active
          role's own route after a switch) — that hook throws without a
          router ancestor, even in tests that never trigger a navigation.
          MemoryRouter is React Router's lightweight in-memory router
          built for exactly this: a real router context without needing
          an actual browser URL. Same pattern useLogout.test.tsx already
          uses for the same reason. */}
      <MemoryRouter>
        <RoleSwitcher />
      </MemoryRouter>
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

  it("navigates to the newly-active role's own home route after switching", async () => {
    // The mutation's mutationFn (switchRole, in api.ts) POSTs to
    // /auth/switch-role and resolves with the updated CurrentUser —
    // this mock stands in for that response, with activeRole flipped to
    // 'admin' to match the button we're about to click below.
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

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    queryClient.setQueryData(currentUserQueryKey, {
      activeRole: 'practitioner',
      roles: ['practitioner', 'admin'],
    })

    // A real router with two destinations, rather than inspecting
    // navigation history directly — same style preservedDestination.test.tsx
    // and routeGuards.test.tsx already use: render a marker element at the
    // expected destination and assert it shows up, which proves the actual
    // navigation happened rather than just that navigate() was CALLED with
    // the right argument (a subtly weaker assertion this avoids).
    const router = createMemoryRouter(
      [
        { path: '/', element: <RoleSwitcher /> },
        { path: '/admin', element: <div>Admin home</div> },
      ],
      { initialEntries: ['/'] },
    )

    render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    )

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Switch to admin' }))

    await waitFor(() =>
      expect(screen.getByText('Admin home')).toBeInTheDocument(),
    )
  })
})