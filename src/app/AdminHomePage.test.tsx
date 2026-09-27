import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
import { AdminHomePage } from './AdminHomePage'
import { currentUserQueryKey } from '@/auth/useCurrentUser'

const PHOTO_URL = 'https://storage.example.com/signed/avatars/1/me.jpg'

// Seeds the logged-in user into the cache, the way the app's /auth/me
// bootstrap would, so useCurrentUser() finds it without a request.
function renderWithUser(avatarUrl: string | null = null) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  queryClient.setQueryData(currentUserQueryKey, {
    id: 1,
    firstName: 'Ada',
    lastName: 'Min',
    avatarUrl,
    activeRole: 'admin',
  })
  return render(
    <QueryClientProvider client={queryClient}>
      {/* The shortcuts are react-router <Link>s, which need a router. */}
      <MemoryRouter>
        <AdminHomePage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('AdminHomePage', () => {
  beforeEach(() => {
    // A fixed "now", so the Today slot shows a known date and time.
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-10T14:05:00'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('greets the admin by first name, as the page heading, with their initials', () => {
    renderWithUser()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Hello Ada,')
    expect(screen.getByText('AM')).toBeInTheDocument()
  })

  it('shows their photo when they have one', () => {
    renderWithUser(PHOTO_URL)
    // UserAvatar is aria-hidden (the greeting already names the person),
    // so its <img> is looked up in the DOM rather than by role.
    expect(document.querySelector('img')).toHaveAttribute('src', PHOTO_URL)
  })

  it("shows today's date and time", () => {
    renderWithUser()
    // The parts we control, not the exact string — Intl output depends on
    // the test runner's locale (e.g. "2:05 PM" vs "14:05").
    expect(screen.getByText(/Tuesday/)).toBeInTheDocument()
    expect(screen.getByText(/March/)).toBeInTheDocument()
    expect(screen.getByText(/(2|14):05/)).toBeInTheDocument()
  })

  it('shows Metrics and Activity as "Coming soon", not real data', () => {
    renderWithUser()
    expect(screen.getByText('Metrics')).toBeInTheDocument()
    expect(screen.getByText('Activity')).toBeInTheDocument()
    expect(screen.getAllByText('Coming soon')).toHaveLength(2)
  })

  it('links to Clinics and Users, in that order', () => {
    renderWithUser()
    // Scoped to the page's own landmark and compared in full (name + href,
    // in order), so a missing, extra or reordered link fails.
    const shortcuts = screen.getByRole('navigation', { name: 'Shortcuts' })
    expect(
      within(shortcuts)
        .getAllByRole('link')
        .map((link) => [link.textContent, link.getAttribute('href')]),
    ).toEqual([
      ['Clinics', '/admin/clinics'],
      ['Users', '/admin/users'],
    ])
  })
})