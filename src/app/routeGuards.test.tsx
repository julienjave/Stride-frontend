import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { RequireAuth } from './RequireAuth'
import { RequireGuest } from './RequireGuest'
import { RequireRole } from './RequireRole'
import { currentUserQueryKey } from '@/auth/useCurrentUser'

const fetchMock = vi.fn<typeof fetch>()
vi.stubGlobal('fetch', fetchMock)

beforeEach(() => {
  fetchMock.mockReset()
})

// A tiny, self-contained route tree mirroring the shape of the real one —
// just enough structure to exercise each guard, without pulling in the
// real LoginPage/DashboardPage (which would need their OWN network mocks
// and aren't what we're testing here).
function renderWithGuardedRoutes(
  user: { activeRole: string } | null,
  initialPath: string,
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  queryClient.setQueryData(currentUserQueryKey, user)

  const router = createMemoryRouter(
    [
      {
        element: <RequireGuest />,
        children: [{ path: '/login', element: <div>Login page</div> }],
      },
      {
        element: <RequireAuth />,
        children: [
          { path: '/', element: <div>Dashboard page</div> },
          {
            element: <RequireRole allowedRoles={['admin']} />,
            children: [{ path: '/admin', element: <div>Admin page</div> }],
          },
          {
            element: <RequireRole allowedRoles={['practitioner']} />,
            children: [
              { path: '/practitioner', element: <div>Practitioner page</div> },
            ],
          },
        ],
      },
    ],
    { initialEntries: [initialPath] },
  )

  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
}

describe('RequireAuth', () => {
  it('redirects to /login when there is no user', () => {
    renderWithGuardedRoutes(null, '/')
    expect(screen.getByText('Login page')).toBeInTheDocument()
  })

  it('renders the real page when a user exists', () => {
    renderWithGuardedRoutes({ activeRole: 'patient' }, '/')
    expect(screen.getByText('Dashboard page')).toBeInTheDocument()
  })
})

describe('RequireGuest', () => {
  it('redirects an already-logged-in user away from /login', () => {
    renderWithGuardedRoutes({ activeRole: 'patient' }, '/login')
    expect(screen.getByText('Dashboard page')).toBeInTheDocument()
  })

  it('renders the login page for a logged-out visitor', () => {
    renderWithGuardedRoutes(null, '/login')
    expect(screen.getByText('Login page')).toBeInTheDocument()
  })
})

describe('RequireRole', () => {
  it('renders the admin page for a user whose activeRole is admin', () => {
    renderWithGuardedRoutes({ activeRole: 'admin' }, '/admin')
    expect(screen.getByText('Admin page')).toBeInTheDocument()
  })

  it('redirects a non-admin user away from the admin page', () => {
    renderWithGuardedRoutes({ activeRole: 'practitioner' }, '/admin')
    expect(screen.getByText('Dashboard page')).toBeInTheDocument()
    expect(screen.queryByText('Admin page')).not.toBeInTheDocument()
  })

  it('redirects a logged-out visitor straight to login, never the admin page', () => {
    renderWithGuardedRoutes(null, '/admin')
    expect(screen.getByText('Login page')).toBeInTheDocument()
  })

  // Same guard component as the admin cases above, just proving it
  // generalizes to a different allowedRoles value rather than having
  // only ever been exercised against 'admin'.
  it('renders the practitioner page for a user whose activeRole is practitioner', () => {
    renderWithGuardedRoutes({ activeRole: 'practitioner' }, '/practitioner')
    expect(screen.getByText('Practitioner page')).toBeInTheDocument()
  })

  it('redirects a non-practitioner user away from the practitioner page', () => {
    renderWithGuardedRoutes({ activeRole: 'admin' }, '/practitioner')
    expect(screen.getByText('Dashboard page')).toBeInTheDocument()
    expect(screen.queryByText('Practitioner page')).not.toBeInTheDocument()
  })
})