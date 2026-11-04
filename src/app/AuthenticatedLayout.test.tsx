/*
    Copyright 2026 Julien Javelaud

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

        http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
*/
// -----------------------------------------------------------------------------------------------------------

import { beforeEach, describe, it, expect, vi } from 'vitest'
import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createMemoryRouter, RouterProvider, useNavigate } from 'react-router'
import { AuthenticatedLayout } from './AuthenticatedLayout'
import { FILLS_SCREEN } from './layout/fillsScreen'
import { currentUserQueryKey } from '@/auth/useCurrentUser'
import { ThemeProvider } from '@/theme/ThemeProvider'
import { json, urlOf } from '@/sessions/testData'
import { message, summary } from '@/messages/testData'
import { showSuccess, useSnackbarStore } from '@/snackbars/snackbarStore'
import { drawnSnackbar } from '@/snackbars/snackbarAssertions'

// The layout asks for the conversation list (the Messages badge, Phase 5)
// for practitioners and patients. Every other request isn't expected here.
const fetchMock = vi.fn<typeof fetch>()
vi.stubGlobal('fetch', fetchMock)
let unread = 0

beforeEach(() => {
  unread = 0
  fetchMock.mockReset()
  fetchMock.mockImplementation((input) => {
    const url = new URL(urlOf(input))
    if (url.pathname === '/conversations') {
      return Promise.resolve(json([summary({ lastMessage: message(1), unreadCount: unread })]))
    }
    return Promise.reject(new Error(`unexpected request: ${url.href}`))
  })
})

// The pieces (SectionNav, SettingsMenu, UserMenu) each have their own
// tests. This file checks the ASSEMBLY: that the layout wires them to the
// current user's role and still renders the matched page.
// `handle`: what routes.tsx may attach to the page's route (fillsScreen.ts);
// given, the page is nested one level down, under a pathless parent
// carrying it — the shape of the Messages routes (the handle on the
// section's layout, the open conversation its child).
function renderLayoutAt(activeRole: string, path: string, handle?: unknown) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  queryClient.setQueryData(currentUserQueryKey, {
    id: 3,
    firstName: 'Julien',
    lastName: 'Martin',
    email: 'julien@example.com',
    activeRole,
    roles: [activeRole],
  })
  const router = createMemoryRouter(
    [
      {
        element: <AuthenticatedLayout />,
        children:
          handle === undefined
            ? [{ path, element: <p>Page content</p> }]
            : [{ handle, children: [{ path, element: <p>Page content</p> }] }],
      },
    ],
    { initialEntries: [path] },
  )
  return render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <RouterProvider router={router} />
      </ThemeProvider>
    </QueryClientProvider>,
  )
}

describe('AuthenticatedLayout', () => {
  it('renders the matched page inside <main>', () => {
    renderLayoutAt('practitioner', '/practitioner')
    expect(
      within(screen.getByRole('main')).getByText('Page content'),
    ).toBeInTheDocument()
  })

  it("renders the role's sections twice — top bar and phone tab bar", () => {
    // jsdom applies no CSS, so both copies are "visible" here; in a real
    // browser `hidden md:block` / `md:hidden` shows exactly one.
    renderLayoutAt('admin', '/admin')
    const navs = screen.getAllByRole('navigation', { name: 'Sections' })
    expect(navs).toHaveLength(2)
    for (const nav of navs) {
      expect(
        within(nav).getAllByRole('link').map((link) => link.textContent),
      ).toEqual(['Home', 'Clinics', 'Users', 'Audit log'])
    }
  })

  it("links the logo to the active role's home", () => {
    renderLayoutAt('patient', '/patient/team')
    expect(screen.getByRole('link', { name: 'Stride home' })).toHaveAttribute(
      'href',
      '/patient',
    )
  })

  it('shows the Settings and account menu buttons', () => {
    renderLayoutAt('practitioner', '/practitioner')
    expect(screen.getByRole('button', { name: 'Settings' })).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Account menu' }),
    ).toBeInTheDocument()
  })

  it('shows the unread messages on the Messages tab, in both navs', async () => {
    unread = 2
    renderLayoutAt('practitioner', '/practitioner')
    expect(await screen.findAllByRole('link', { name: 'Messages, 2 unread' })).toHaveLength(2)
  })

  it('gives a patient the same badge, on their own Messages', async () => {
    unread = 1
    renderLayoutAt('patient', '/patient')
    const links = await screen.findAllByRole('link', { name: 'Messages, 1 unread' })
    expect(links[0]).toHaveAttribute('href', '/patient/messages')
  })

  it('asks nothing about messages for an admin, who has none', () => {
    renderLayoutAt('admin', '/admin')
    expect(screen.getByText('Page content')).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })
})


// The snackbars (decisions §33) are drawn by the layout, outside the page.
// The room under each page (decisions §47). jsdom applies no CSS, so the
// classes are what can be checked here; the pixels were checked in a
// browser at 375 and 1280 px.
describe('AuthenticatedLayout — the room under a page', () => {
  const ORDINARY = ['pb-[calc(6rem+env(safe-area-inset-bottom))]', 'md:pb-12']
  const FILLS = ['pb-[calc(4rem+env(safe-area-inset-bottom))]', 'md:pb-0']

  it('gives an ordinary page room past the tab bar (phone) and at the bottom (desktop)', () => {
    renderLayoutAt('practitioner', '/practitioner')
    const main = screen.getByRole('main')
    expect(main).toHaveClass(...ORDINARY)
    expect(main).not.toHaveClass(...FILLS)
  })

  it('gives a page that fills the screen only the tab bar’s height — set on its parent route', () => {
    renderLayoutAt('practitioner', '/practitioner/messages/12', FILLS_SCREEN)
    const main = screen.getByRole('main')
    expect(main).toHaveClass(...FILLS)
    expect(main).not.toHaveClass(...ORDINARY)
  })

  // `handle` is the app's to define (typed unknown): only the exact shape
  // counts, anything else is an ordinary page — never a crash.
  it.each([[null], ['fillsScreen'], [{ fillsScreen: 'yes' }], [{ crumb: 'Messages' }]])(
    'treats a handle of another shape (%j) as an ordinary page',
    (handle) => {
      renderLayoutAt('admin', '/admin/users', handle)
      expect(screen.getByRole('main')).toHaveClass(...ORDINARY)
    },
  )
})

describe('AuthenticatedLayout — snackbars', () => {
  // A page that raises a snackbar and LEAVES in the same click — the way
  // "Finish session" does — and the page it goes to.
  function LeavingPage() {
    const navigate = useNavigate()
    return (
      <button
        onClick={() => {
          showSuccess('Session finished. Well done!')
          void navigate('/patient/next')
        }}
      >
        Finish
      </button>
    )
  }

  function renderWithPages() {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const user = (activeRole: string) => ({
      id: 3,
      firstName: 'Julien',
      lastName: 'Martin',
      email: 'julien@example.com',
      activeRole,
      roles: ['practitioner', 'patient'],
    })
    queryClient.setQueryData(currentUserQueryKey, user('patient'))
    const router = createMemoryRouter(
      [
        {
          element: <AuthenticatedLayout />,
          children: [
            { path: '/patient', element: <LeavingPage /> },
            { path: '/patient/next', element: <p>Next page</p> },
          ],
        },
      ],
      { initialEntries: ['/patient'] },
    )
    render(
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <RouterProvider router={router} />
        </ThemeProvider>
      </QueryClientProvider>,
    )
    // A role switch as the app does it: the current user's cache entry
    // changes role (useSwitchRole writes the server's answer there).
    return {
      switchTo: (role: string) => {
        act(() => {
          queryClient.setQueryData(currentUserQueryKey, user(role))
        })
      },
    }
  }

  it('draws a snackbar raised by a page that then navigates away, outside <main>', async () => {
    renderWithPages()
    await userEvent.click(screen.getByRole('button', { name: 'Finish' }))

    expect(await screen.findByText('Next page')).toBeInTheDocument()
    const row = drawnSnackbar('Session finished. Well done!')
    expect(within(screen.getByRole('main')).queryByText('Session finished. Well done!')).toBeNull()
    expect(row).toBeInTheDocument()
  })

  it('empties the snackbars on a role switch — none is left over for the other role', async () => {
    const { switchTo } = renderWithPages()
    await userEvent.click(screen.getByRole('button', { name: 'Finish' }))
    await screen.findByText('Next page')
    expect(useSnackbarStore.getState().snackbars).toHaveLength(1)

    switchTo('practitioner')
    // waitFor: TanStack Query tells the components about a cache change on
    // its next tick, not inside act() — the layout re-renders a moment later.
    await waitFor(() => expect(useSnackbarStore.getState().snackbars).toEqual([]))
    expect(screen.queryByText('Session finished. Well done!')).not.toBeInTheDocument()
  })
})