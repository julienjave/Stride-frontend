import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
import { currentUserQueryKey } from '@/auth/useCurrentUser'
import { localDateString } from '@/common/calendarDate'
import { PractitionerHomePage } from '@/app/PractitionerHomePage'
import { json, urlOf } from '@/sessions/testData'
import { attendanceAlert, sessionAlert } from './testData'
import type { Alert } from './types'
import { expectSkeleton } from '@/common/loadingAssertions'

// The "For review" list on the practitioner home (2026-10-19): the card's count and
// the list under it, through the real page — the two share one query, and
// that is part of what is tested.
const fetchMock = vi.fn<typeof fetch>()
vi.stubGlobal('fetch', fetchMock)

let alerts: () => Response

beforeEach(() => {
  fetchMock.mockReset()
  alerts = () => json([])
  fetchMock.mockImplementation((input) => {
    const url = new URL(urlOf(input))
    if (url.pathname.endsWith('/alerts')) return Promise.resolve(alerts())
    // The card's Messages slot (Phase 5) asks for the conversations.
    if (url.pathname.endsWith('/conversations')) return Promise.resolve(json([]))
    return Promise.reject(new Error(`unexpected request: ${url.href}`))
  })
})

function renderHome() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 30_000 } },
  })
  queryClient.setQueryData(currentUserQueryKey, { id: 3, firstName: 'Alex', lastName: 'Chen', avatarUrl: null })
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <PractitionerHomePage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const list = () => screen.findByRole('list', { name: 'For review' })
const rows = async () => within(await list()).getAllByRole('listitem')

function alertRequests() {
  return fetchMock.mock.calls
    .map(([input]) => new URL(urlOf(input)))
    .filter((url) => url.pathname.endsWith('/alerts'))
    .map((url) => url.pathname + url.search)
}

describe('the For review list on the practitioner home', () => {
  it("asks for the practitioner's today ONCE, for the card and the list together", async () => {
    alerts = () => json([sessionAlert()])
    renderHome()
    await list()
    expect(alertRequests()).toEqual([`/alerts?today=${localDateString()}`])
  })

  it('shows the count in the card as a link down to the list', async () => {
    alerts = () => json([sessionAlert(), attendanceAlert()])
    renderHome()
    const link = await screen.findByRole('link', { name: '2 to look at' })
    expect(link).toHaveAttribute('href', '#review')
    // The target exists: the section with that id, named by its heading.
    expect(screen.getByRole('region', { name: 'For review' })).toHaveAttribute('id', 'review')
  })

  it('says all caught up in both places when there is nothing, and lists nothing', async () => {
    renderHome()
    expect(await screen.findByText('All caught up')).toBeInTheDocument()
    expect(screen.getByText("You're all caught up.")).toBeInTheDocument()
    expect(screen.queryByRole('list', { name: 'For review' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /to look at/ })).not.toBeInTheDocument()
  })

  it('says it could not load — in the card and the list — without claiming nothing to do', async () => {
    alerts = () => json({ statusCode: 500, message: ['boom'], error: 'Error', timestamp: '', path: '' }, 500)
    renderHome()
    expect(await screen.findByRole('alert')).toHaveTextContent(
      /^Couldn't load what's for review\. Something went wrong on our side\. Try again in a moment\.$/,
    )
    expect(screen.getByText('Unavailable')).toBeInTheDocument()
    expect(screen.queryByText(/caught up/)).not.toBeInTheDocument()
  })

  it('"Try again" that works: the list, and focus on its heading', async () => {
    const user = userEvent.setup()
    const good = alerts
    alerts = () => json({ statusCode: 500, message: ['boom'], error: 'Error', timestamp: '', path: '' }, 500)
    renderHome()
    await screen.findByRole('alert')
    alerts = good
    await user.click(screen.getByRole('button', { name: 'Try again' }))
    const heading = screen.getByRole('heading', { level: 2, name: 'For review' })
    await waitFor(() => expect(heading).toHaveFocus())
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('shows loading words in the list while it waits, and no count yet', () => {
    fetchMock.mockImplementation(() => new Promise(() => {}))
    renderHome()
    expectSkeleton('Loading what\'s for review…')
    expect(screen.queryByRole('link', { name: /to look at/ })).not.toBeInTheDocument()
    expect(screen.queryByText(/caught up/)).not.toBeInTheDocument()
    expect(screen.queryByText('Unavailable')).not.toBeInTheDocument()
  })

  it('gives an attendance row its facts and a link to the program', async () => {
    alerts = () =>
      json([
        attendanceAlert({
          missedInARow: { days: 3, weeks: 0, since: '2031-05-26' },
          inactive: { days: 9, lastSessionDate: '2031-06-01' },
        }),
      ])
    renderHome()
    const [row] = await rows()
    expect(within(row).getByText('Jo Novak')).toBeInTheDocument()
    expect(within(row).getByText('Lower Back — Jo')).toBeInTheDocument()
    expect(within(row).getByText(/^3 scheduled sessions missed in a row, since /)).toBeInTheDocument()
    expect(within(row).getByText(/^No session for 9 days — the last on /)).toBeInTheDocument()
    const link = within(row).getByRole('link', { name: 'View program Lower Back — Jo (Jo Novak)' })
    expect(link).toHaveAttribute('href', '/practitioner/programs/assigned/20')
    expect(link).toHaveTextContent('View program')
    // Initials stand in for the missing photo.
    expect(within(row).getByText('JN')).toBeInTheDocument()
  })

  it('gives a session row its day and status, its reasons, and a link to review it', async () => {
    alerts = () =>
      json([
        sessionAlert({
          reasons: ['ended_for_pain', 'pain_high', 'hard_exercise', 'patient_note'],
          hardExercises: [{ name: 'Squat', rating: 9 }],
          session: { status: 'incomplete', endReason: 'pain', painBefore: 5, painAfter: 8 },
        }),
      ])
    renderHome()
    const [row] = await rows()
    expect(within(row).getByText('Pat Lee')).toBeInTheDocument()
    expect(within(row).getByText(/ · Stopped \(pain\)$/)).toBeInTheDocument()
    expect(within(row).getByText('Pain 5 → 8 · Rated hard: Squat (9/10) · Left a note')).toBeInTheDocument()
    const link = within(row).getByRole('link', { name: /^Review Pat Lee's session of / })
    expect(link).toHaveAttribute('href', '/practitioner/sessions/31')
    expect(link).toHaveTextContent('Review')
  })

  it('keeps the order the backend gave', async () => {
    alerts = () =>
      json([
        attendanceAlert(),
        sessionAlert({ session: { id: 41 } }),
        sessionAlert({ session: { id: 40 } }),
      ])
    renderHome()
    const hrefs = (await rows()).map((row) => within(row).getByRole('link').getAttribute('href'))
    expect(hrefs).toEqual([
      '/practitioner/programs/assigned/20',
      '/practitioner/sessions/41',
      '/practitioner/sessions/40',
    ])
  })

  it('shows the first 5, then all of them on request, and folds them back', async () => {
    const seven: Alert[] = Array.from({ length: 7 }, (_, i) => sessionAlert({ session: { id: 100 + i } }))
    alerts = () => json(seven)
    renderHome()
    expect(await rows()).toHaveLength(5)
    // The count in the card is the WHOLE list.
    expect(screen.getByRole('link', { name: '7 to look at' })).toBeInTheDocument()

    const user = userEvent.setup()
    const toggle = screen.getByRole('button', { name: 'Show all 7' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await user.click(toggle)
    expect(await rows()).toHaveLength(7)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(toggle).toHaveTextContent('Show fewer')
    await user.click(toggle)
    expect(await rows()).toHaveLength(5)
  })

  // Below the shortcuts (the person's point, 2026-10-19): their fixed
  // height stays at the top; the list, of any length, comes after.
  it('comes after the shortcuts, labelled For review in the card', async () => {
    alerts = () => json([sessionAlert()])
    renderHome()
    const list = await screen.findByRole('region', { name: 'For review' })
    const shortcuts = screen.getByRole('navigation', { name: 'Shortcuts' })
    // compareDocumentPosition: a bit mask; FOLLOWING = the list comes later
    // in the document than the shortcuts.
    expect(shortcuts.compareDocumentPosition(list) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(screen.getAllByText('For review')).toHaveLength(2) // the slot's label, the heading
  })

  it('offers no toggle for exactly 5', async () => {
    alerts = () => json(Array.from({ length: 5 }, (_, i) => sessionAlert({ session: { id: 100 + i } })))
    renderHome()
    expect(await rows()).toHaveLength(5)
    expect(screen.queryByRole('button', { name: /Show/ })).not.toBeInTheDocument()
  })
})