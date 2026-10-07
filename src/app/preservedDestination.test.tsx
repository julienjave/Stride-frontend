import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { RequireAuth } from './RequireAuth'
import { RequireGuest } from './RequireGuest'
import { LoginPage } from '@/auth/LoginPage'
import { currentUserQueryKey } from '@/auth/useCurrentUser'
import { setupStatusQueryKey } from '@/auth/useSetupStatus'

const fetchMock = vi.fn<typeof fetch>()
vi.stubGlobal('fetch', fetchMock)

beforeEach(() => {
  fetchMock.mockReset()
})

describe('preserved destination through login', () => {
  it('sends a logged-out visitor from a guarded page to /login, then back to that SAME page after logging in', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 1,
          email: 'a@b.com',
          activeRole: 'admin',
          roles: ['admin'],
        }),
        { status: 201 },
      ),
    )

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    queryClient.setQueryData(currentUserQueryKey, null)
    // LoginPage also asks whether Stride is set up; answered from the cache
    // here (useSetupStatus never refetches a cached answer), so the only
    // request this test sees is the login it's about.
    queryClient.setQueryData(setupStatusQueryKey, { setupComplete: true })

    const router = createMemoryRouter(
      [
        {
          element: <RequireGuest />,
          children: [{ path: '/login', element: <LoginPage /> }],
        },
        {
          element: <RequireAuth />,
          children: [
            { path: '/', element: <div>Dashboard page</div> },
            { path: '/admin', element: <div>Admin page</div> },
          ],
        },
      ],
      // Starting directly on a guarded page, while logged out — exactly
      // the "someone bookmarked/typed a deep link" scenario.
      { initialEntries: ['/admin'] },
    )

    render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    )

    // RequireAuth should have redirected to /login, carrying /admin as
    // the preserved destination.
    await waitFor(() => expect(screen.getByLabelText('Email')).toBeInTheDocument())

    const user = userEvent.setup()
    await user.type(screen.getByLabelText('Email'), 'a@b.com')
    await user.type(screen.getByLabelText('Password'), 'password123')
    await user.click(screen.getByRole('button', { name: 'Log in' }))

    // The real assertion: NOT the dashboard — specifically back to /admin,
    // proving the 'from' state survived the whole round trip: RequireAuth's
    // redirect → LoginPage's useLocation() read → navigate(redirectTo).
    await waitFor(() => expect(screen.getByText('Admin page')).toBeInTheDocument())
  })

  it('falls back to "/" when there is no preserved destination (visiting /login directly)', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 1,
          email: 'a@b.com',
          activeRole: 'patient',
          roles: ['patient'],
        }),
        { status: 201 },
      ),
    )

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    queryClient.setQueryData(currentUserQueryKey, null)
    // LoginPage also asks whether Stride is set up; answered from the cache
    // here (useSetupStatus never refetches a cached answer), so the only
    // request this test sees is the login it's about.
    queryClient.setQueryData(setupStatusQueryKey, { setupComplete: true })

    const router = createMemoryRouter(
      [
        {
          element: <RequireGuest />,
          children: [{ path: '/login', element: <LoginPage /> }],
        },
        {
          element: <RequireAuth />,
          children: [{ path: '/', element: <div>Dashboard page</div> }],
        },
      ],
      { initialEntries: ['/login'] },
    )

    render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    )

    const user = userEvent.setup()
    await user.type(screen.getByLabelText('Email'), 'a@b.com')
    await user.type(screen.getByLabelText('Password'), 'password123')
    await user.click(screen.getByRole('button', { name: 'Log in' }))

    await waitFor(() => expect(screen.getByText('Dashboard page')).toBeInTheDocument())
  })
})