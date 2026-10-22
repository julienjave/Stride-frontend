import { beforeEach, describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { AuthenticatedLayout } from './AuthenticatedLayout'
import { currentUserQueryKey } from '@/auth/useCurrentUser'
import { ThemeProvider } from '@/theme/ThemeProvider'
import { json, urlOf } from '@/sessions/testData'
import { message, summary } from '@/messages/testData'

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
function renderLayoutAt(activeRole: string, path: string) {
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
        children: [{ path, element: <p>Page content</p> }],
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