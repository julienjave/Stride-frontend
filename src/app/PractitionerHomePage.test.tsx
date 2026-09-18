import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
import { PractitionerHomePage } from './PractitionerHomePage'
import { currentUserQueryKey } from '@/auth/useCurrentUser'

function renderWithUser(user: { firstName: string; lastName: string }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  queryClient.setQueryData(currentUserQueryKey, user)
  return render(
    <QueryClientProvider client={queryClient}>
      {/* Needed because the page renders react-router <Link> elements in
          its nav section — same reasoning as RoleSwitcher's tests. */}
      <MemoryRouter>
        <PractitionerHomePage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('PractitionerHomePage', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-10T14:05:00'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("greets the user by first name and shows their initials", () => {
    renderWithUser({ firstName: 'Jamie', lastName: 'Rivera' })
    expect(screen.getByText('Hello Jamie,')).toBeInTheDocument()
    expect(screen.getByText('JR')).toBeInTheDocument()
  })

  it("shows today's date and time", () => {
    renderWithUser({ firstName: 'Jamie', lastName: 'Rivera' })
    // Formatted via Intl.DateTimeFormat — asserting on the parts we
    // control (weekday/month/day present) rather than the exact string,
    // which would vary by the test runner's locale/timezone.
    expect(screen.getByText(/Tuesday/)).toBeInTheDocument()
    expect(screen.getByText(/March/)).toBeInTheDocument()
  })

  it('shows "Coming soon" for both messaging and to-do, not real data', () => {
    renderWithUser({ firstName: 'Jamie', lastName: 'Rivera' })
    // Both slots use the same "Coming soon" text — there should be
    // exactly two, one per not-yet-built feature.
    expect(screen.getAllByText('Coming soon')).toHaveLength(2)
  })

  it('links to all four Phase 3 destinations, and not to messaging', () => {
    renderWithUser({ firstName: 'Jamie', lastName: 'Rivera' })
    expect(screen.getByRole('link', { name: 'My Profile' })).toHaveAttribute(
      'href',
      '/practitioner/profile',
    )
    expect(screen.getByRole('link', { name: 'My Patients' })).toHaveAttribute(
      'href',
      '/practitioner/patients',
    )
    expect(
      screen.getByRole('link', { name: 'Exercise Library' }),
    ).toHaveAttribute('href', '/practitioner/library')
    expect(screen.getByRole('link', { name: 'Programs' })).toHaveAttribute(
      'href',
      '/practitioner/programs',
    )
    // Messaging has no frontend yet at all (Phase 5) — confirming there's
    // no dead link for it, rather than just confirming the four real ones.
    expect(
      screen.queryByRole('link', { name: /messag/i }),
    ).not.toBeInTheDocument()
  })
})