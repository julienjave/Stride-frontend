import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createMemoryRouter, Outlet, RouterProvider } from 'react-router'
import { UserMenu } from './UserMenu'
import { currentUserQueryKey } from '@/auth/useCurrentUser'

const fetchMock = vi.fn<typeof fetch>()
vi.stubGlobal('fetch', fetchMock)

beforeEach(() => {
  fetchMock.mockReset()
})

const julien = {
  id: 1,
  firstName: 'Julien',
  lastName: 'Martin',
  email: 'julien@example.com',
  activeRole: 'practitioner',
  roles: ['practitioner'],
}

function renderMenu(user: typeof julien = julien) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  queryClient.setQueryData(currentUserQueryKey, user)
  const router = createMemoryRouter(
    [
      { path: '/', element: <UserMenu /> },
      { path: '/profile', element: <div>Profile page</div> },
      { path: '/login', element: <div>Login page</div> },
    ],
    { initialEntries: ['/'] },
  )
  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
}

async function openMenu() {
  await userEvent.click(screen.getByRole('button', { name: 'Account menu' }))
}

describe('UserMenu', () => {
  it('shows the first name with the active role as text under it', () => {
    renderMenu()
    const trigger = screen.getByRole('button', { name: 'Account menu' })
    expect(trigger).toHaveTextContent('Julien')
    expect(trigger).toHaveTextContent('Practitioner')
  })

  it('opens with the full name and email, and a Profile link to /profile', async () => {
    renderMenu()
    await openMenu()
    const menu = screen.getByRole('menu')
    expect(menu).toHaveTextContent('Julien Martin')
    expect(menu).toHaveTextContent('julien@example.com')
    // asChild made the item a real link — it has a real href.
    expect(screen.getByRole('menuitem', { name: 'Profile' })).toHaveAttribute(
      'href',
      '/profile',
    )
  })

  // A patient's own medical file (decisions §8) — by the ACTIVE role.
  it("offers a patient their records, and nobody else", async () => {
    renderMenu({ ...julien, activeRole: 'patient', roles: ['patient'] })
    await openMenu()
    expect(screen.getByRole('menuitem', { name: 'My records' })).toHaveAttribute('href', '/profile/records')
  })

  it('offers no records to a practitioner', async () => {
    renderMenu()
    await openMenu()
    expect(screen.getByRole('menuitem', { name: 'Profile' })).toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: 'My records' })).not.toBeInTheDocument()
  })

  it('Profile navigates to the profile page', async () => {
    renderMenu()
    await openMenu()
    await userEvent.click(screen.getByRole('menuitem', { name: 'Profile' }))
    expect(await screen.findByText('Profile page')).toBeInTheDocument()
  })

  it('has no role switcher for a single-role account', async () => {
    renderMenu()
    await openMenu()
    expect(screen.queryByText('Switch role')).not.toBeInTheDocument()
  })

  it('includes the role switcher for a multi-role account', async () => {
    renderMenu({ ...julien, roles: ['practitioner', 'admin'] })
    await openMenu()
    expect(screen.getByText('Switch role')).toBeInTheDocument()
    expect(screen.getAllByRole('menuitemradio')).toHaveLength(2)
  })

  it('Log out calls POST /auth/logout and lands on the login page', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }))
    renderMenu()
    await openMenu()
    await userEvent.click(screen.getByRole('menuitem', { name: 'Log out' }))

    await waitFor(() =>
      expect(screen.getByText('Login page')).toBeInTheDocument(),
    )
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    // stringMatching also asserts the URL IS a string (fetch accepts URL
    // and Request objects too, which String() would silently mangle).
    expect(url).toEqual(expect.stringMatching(/\/auth\/logout$/))
    expect(init?.method).toBe('POST')
  })

  describe('switching role', () => {
    // The real flow, the way it runs in the app: UserMenu stays in a
    // layout (like the header) ABOVE the pages, and the menu really opens
    // and closes. This is the test that would have caught the original
    // bug. RoleSwitcher.test.tsx forces its menu open — and a menu that
    // never closes never unmounts the switcher, which was exactly the
    // condition that hid the lost redirect.
    function renderInLayout() {
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
      })
      queryClient.setQueryData(currentUserQueryKey, {
        ...julien,
        roles: ['practitioner', 'admin'],
      })
      const router = createMemoryRouter(
        [
          {
            element: (
              <>
                <UserMenu />
                <Outlet />
              </>
            ),
            children: [
              { path: '/practitioner', element: <p>Practitioner home</p> },
              { path: '/admin', element: <p>Admin home</p> },
            ],
          },
        ],
        { initialEntries: ['/practitioner'] },
      )
      render(
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} />
        </QueryClientProvider>,
      )
    }

    function mockSwitchResponse() {
      fetchMock.mockResolvedValue(
        new Response(
          JSON.stringify({
            ...julien,
            activeRole: 'admin',
            roles: ['practitioner', 'admin'],
          }),
          { status: 201 },
        ),
      )
    }

    it("lands on the new role's home and shows the new role in the header", async () => {
      mockSwitchResponse()
      renderInLayout()

      await openMenu()
      await userEvent.click(screen.getByRole('menuitemradio', { name: 'Admin' }))

      // findByText waits (up to a timeout) for the redirect to happen.
      expect(await screen.findByText('Admin home')).toBeInTheDocument()
      expect(screen.queryByText('Practitioner home')).not.toBeInTheDocument()
      const trigger = screen.getByRole('button', { name: 'Account menu' })
      expect(trigger).toHaveTextContent('Admin')
      expect(trigger).not.toHaveTextContent('Practitioner')
    })

    it('sends exactly one POST /auth/switch-role with the chosen role', async () => {
      mockSwitchResponse()
      renderInLayout()

      await openMenu()
      await userEvent.click(screen.getByRole('menuitemradio', { name: 'Admin' }))
      await screen.findByText('Admin home')

      expect(fetchMock).toHaveBeenCalledTimes(1)
      const [url, init] = fetchMock.mock.calls[0]
      expect(url).toEqual(expect.stringMatching(/\/auth\/switch-role$/))
      expect(init?.method).toBe('POST')
      // The body as a literal string: what really went over the wire.
      expect(init?.body).toBe('{"role":"admin"}')
    })
  })
})