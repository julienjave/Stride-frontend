import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { AuthenticatedLayout } from './AuthenticatedLayout'
import { currentUserQueryKey } from '@/auth/useCurrentUser'
import { ThemeProvider } from '@/theme/ThemeProvider'

// The pieces (SectionNav, SettingsMenu, UserMenu) each have their own
// tests. This file checks the ASSEMBLY: that the layout wires them to the
// current user's role and still renders the matched page.
function renderLayoutAt(activeRole: string, path: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  queryClient.setQueryData(currentUserQueryKey, {
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
      ).toEqual(['Home', 'Clinics', 'Users'])
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
})