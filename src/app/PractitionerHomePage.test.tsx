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

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
import { PractitionerHomePage } from './PractitionerHomePage'
import { currentUserQueryKey } from '@/auth/useCurrentUser'

// The home asks for the To-do (GET /alerts, 2026-10-19); these tests are
// about the rest of the page, so the list is empty. The To-do itself is
// tested in src/alerts/TodoSection.test.tsx.
const fetchMock = vi.fn<typeof fetch>()
vi.stubGlobal('fetch', fetchMock)

function renderWithUser(user: {
  firstName: string
  lastName: string
  avatarUrl?: string | null
}) {
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
    fetchMock.mockReset()
    fetchMock.mockImplementation(() => Promise.resolve(new Response('[]')))
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

  it('shows their photo when they have one', () => {
    renderWithUser({
      firstName: 'Jamie',
      lastName: 'Rivera',
      avatarUrl: 'https://storage.example.com/signed/avatars/5/me.jpg',
    })
    // UserAvatar is aria-hidden, so its <img> is looked up in the DOM.
    expect(document.querySelector('img')).toHaveAttribute(
      'src',
      'https://storage.example.com/signed/avatars/5/me.jpg',
    )
  })

  it("shows today's date and time", () => {
    renderWithUser({ firstName: 'Jamie', lastName: 'Rivera' })
    // Formatted via Intl.DateTimeFormat — asserting on the parts we
    // control (weekday/month/day present) rather than the exact string,
    // which would vary by the test runner's locale/timezone.
    expect(screen.getByText(/Tuesday/)).toBeInTheDocument()
    expect(screen.getByText(/March/)).toBeInTheDocument()
  })

  it('shows the unread messages as a link to Messages — nothing is "Coming soon" any more', async () => {
    // findBy… retries on a timer: with the clock frozen it would wait for
    // ever. This test needs no particular time.
    vi.useRealTimers()
    renderWithUser({ firstName: 'Jamie', lastName: 'Rivera' })
    // Every request answers [] here: no conversations, so nothing unread.
    expect(await screen.findByRole('link', { name: 'No unread messages' })).toHaveAttribute(
      'href',
      '/practitioner/messages',
    )
    expect(screen.queryByText('Coming soon')).not.toBeInTheDocument()
  })

  it('links to the three sections, Messages being in the card above', () => {
    renderWithUser({ firstName: 'Jamie', lastName: 'Rivera' })
    // Scoped to this page's own shortcuts landmark, and compared in full
    // (name + href, in order), so a missing, extra or reordered link fails.
    const shortcuts = screen.getByRole('navigation', { name: 'Shortcuts' })
    expect(
      within(shortcuts)
        .getAllByRole('link')
        .map((link) => [link.textContent, link.getAttribute('href')]),
    ).toEqual([
      ['My Patients', '/practitioner/patients'],
      ['Exercise Library', '/practitioner/library'],
      ['Programs', '/practitioner/programs'],
    ])
  })

  it('no longer links to the profile (it moved to the account menu)', () => {
    renderWithUser({ firstName: 'Jamie', lastName: 'Rivera' })
    expect(
      screen.queryByRole('link', { name: /profile/i }),
    ).not.toBeInTheDocument()
  })
})