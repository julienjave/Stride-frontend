import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
import { currentUserQueryKey } from '@/auth/useCurrentUser'
import { localDateString } from '@/common/calendarDate'
import { PractitionerHomePage } from '@/app/PractitionerHomePage'
import { apiError, json, urlOf } from '@/sessions/testData'
import {
  attendanceAlert,
  complaintReviewAlert,
  joinAlert,
  legalDisclosureAlert,
  patientMergeAlert,
  sessionAlert,
} from './testData'
import type { Alert } from './types'
import { expectSkeleton } from '@/common/loadingAssertions'

// The "For review" list on the practitioner home (2026-10-19): the card's count and
// the list under it, through the real page — the two share one query, and
// that is part of what is tested.
const fetchMock = vi.fn<typeof fetch>()
vi.stubGlobal('fetch', fetchMock)

let alerts: () => Response
// "Mark as reviewed" on a join notice (2026-10-28): its answer.
let joinReview: () => Response | Promise<Response>
// … and on a complaint review's notice (pass 2).
let complaintReview: () => Response | Promise<Response>
let disclosureReview: () => Response | Promise<Response>
let mergeReview: () => Response | Promise<Response>

beforeEach(() => {
  fetchMock.mockReset()
  alerts = () => json([])
  joinReview = () => json({ reviewedAt: '2031-06-12T12:00:00.000Z' })
  complaintReview = () => json({ reviewedAt: '2031-06-12T12:00:00.000Z' })
  disclosureReview = () => json({ reviewedAt: '2031-06-12T12:00:00.000Z' })
  mergeReview = () => json({ reviewedAt: '2031-06-12T12:00:00.000Z' })
  fetchMock.mockImplementation((input, init) => {
    const url = new URL(urlOf(input))
    if (init?.method === 'POST' && url.pathname.endsWith('/alerts/care-team-joins/41/review')) {
      return Promise.resolve(joinReview())
    }
    if (init?.method === 'POST' && url.pathname.endsWith('/alerts/complaint-reviews/12/review')) {
      return Promise.resolve(complaintReview())
    }
    if (init?.method === 'POST' && url.pathname.endsWith('/alerts/legal-disclosures/21/review')) {
      return Promise.resolve(disclosureReview())
    }
    if (init?.method === 'POST' && url.pathname.endsWith('/alerts/patient-merges/31/review')) {
      return Promise.resolve(mergeReview())
    }
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

function postRequests() {
  return fetchMock.mock.calls
    .filter(([, init]) => init?.method === 'POST')
    .map(([input, init]) => `${new URL(urlOf(input)).pathname} ${init?.body as string}`)
}

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

  // --- A colleague joined a patient's care team (2026-10-28) ---

  it('says the list holds care-team joins, complaint reviews and disclosures too', async () => {
    renderHome()
    expect(
      await screen.findByText(
        "Your patients who have stopped coming, sessions of the last 14 days to look at, colleagues who joined their care teams, complaint reviews of their records, records disclosed outside the clinic, and patients' second accounts merged into theirs.",
      ),
    ).toBeInTheDocument()
  })

  it('gives a join row who joined, by whom, when — and its two controls', async () => {
    alerts = () =>
      json([joinAlert({ link: { addedBy: { id: 1, firstName: 'Avery', lastName: 'Admin' } } })])
    renderHome()
    const [row] = await rows()
    expect(within(row).getByText('Pat Lee')).toBeInTheDocument()
    expect(within(row).getByText('Avery Admin added Sam Lee to the care team')).toBeInTheDocument()
    // The day (its words are alertText's, tested there).
    expect(within(row).getByText(/10/)).toBeInTheDocument()
    const link = within(row).getByRole('link', { name: 'View care team (Pat Lee)' })
    expect(link).toHaveAttribute('href', '/practitioner/patients/6')
    expect(within(row).getByRole('button', { name: "Mark as reviewed: Sam Lee on Pat Lee's care team" }))
      .toHaveTextContent('Mark as reviewed')
    // No program line: a join is about the team, not a program.
    expect(within(row).queryByText(/Knee Rehab|Lower Back/)).not.toBeInTheDocument()
  })

  it('marks a join reviewed: one POST, the list asked again, focus to the heading, said', async () => {
    let answer!: (response: Response) => void
    joinReview = () => new Promise((resolve) => (answer = resolve))
    let listed = [joinAlert()]
    alerts = () => json(listed)
    const user = userEvent.setup()
    renderHome()
    const [row] = await rows()
    await user.click(within(row).getByRole('button', { name: /^Mark as reviewed/ }))
    // While it's on its way: one request, the button busy and disabled.
    expect(within(row).getByRole('button', { name: /^Mark as reviewed/ })).toBeDisabled()
    expect(within(row).getByRole('button', { name: /^Mark as reviewed/ })).toHaveTextContent('Marking…')
    await user.click(within(row).getByRole('button', { name: /^Mark as reviewed/ }))
    expect(postRequests()).toEqual(['/alerts/care-team-joins/41/review undefined'])

    listed = []
    answer(json({ reviewedAt: '2031-06-12T12:00:00.000Z' }))
    const heading = screen.getByRole('heading', { level: 2, name: 'For review' })
    await waitFor(() => expect(heading).toHaveFocus())
    expect(
      await screen.findByText('Marked as reviewed: Sam Lee joined the care team of Pat Lee.', {
        selector: '[role="status"]',
      }),
    ).toBeInTheDocument()
    // Asked again (the cache was marked stale): the row is gone.
    expect(await screen.findByText("You're all caught up.")).toBeInTheDocument()
    expect(alertRequests()).toHaveLength(2)
  })

  it('says a refused review in the row, in the app\'s words, and keeps it', async () => {
    alerts = () => json([joinAlert()])
    joinReview = () => apiError(409, 'This change to the care team is not in your For review list')
    const user = userEvent.setup()
    renderHome()
    const [row] = await rows()
    await user.click(within(row).getByRole('button', { name: /^Mark as reviewed/ }))
    expect(await within(row).findByRole('alert')).toHaveTextContent(
      'This change to the care team is not in your For review list',
    )
    expect(within(row).getByRole('button', { name: /^Mark as reviewed/ })).toBeEnabled()
    expect(screen.getByRole('heading', { level: 2, name: 'For review' })).not.toHaveFocus()
  })

  it('keeps a join among the others in the backend\'s order, by its own key', async () => {
    // A program and a link with the same number: two rows, both kept — and
    // two different React keys. React still draws both rows when two keys
    // collide; it says so on console.error (and may mix the rows up on a
    // later update), so the test listens for that.
    const consoleError = vi.spyOn(console, 'error')
    alerts = () => json([attendanceAlert({ program: { id: 41, title: 'Lower Back — Jo' } }), joinAlert()])
    renderHome()
    const all = await rows()
    expect(all).toHaveLength(2)
    expect(
      consoleError.mock.calls.filter((call) => String(call[0]).includes('same key')),
    ).toEqual([])
    consoleError.mockRestore()
    expect(within(all[0]).getByRole('link')).toHaveAttribute('href', '/practitioner/programs/assigned/41')
    expect(within(all[1]).getByText('Sam Lee joined the care team')).toBeInTheDocument()
  })

  // --- An admin opened a complaint review (2026-10-28, pass 2) ---

  it('gives a complaint review row who opened it, when, what it means — and no link', async () => {
    alerts = () => json([complaintReviewAlert()])
    renderHome()
    const [row] = await rows()
    expect(within(row).getByText('Pat Lee')).toBeInTheDocument()
    expect(within(row).getByText('Avery Admin opened a complaint review of the record')).toBeInTheDocument()
    expect(
      within(row).getByText(
        "While it's open, that admin can download copies of the record. The reason stays with the clinic's admins.",
      ),
    ).toBeInTheDocument()
    expect(within(row).getByText(/10.*17/)).toBeInTheDocument()
    expect(
      within(row).getByRole('button', { name: "Mark as reviewed: complaint review of Pat Lee's record" }),
    ).toHaveTextContent('Mark as reviewed')
    // Nothing to go and see: no link at all.
    expect(within(row).queryByRole('link')).not.toBeInTheDocument()
  })

  it('marks a complaint review seen: its own POST, focus to the heading, said', async () => {
    let listed = [complaintReviewAlert()]
    alerts = () => json(listed)
    const user = userEvent.setup()
    renderHome()
    const [row] = await rows()
    listed = []
    await user.click(within(row).getByRole('button', { name: /^Mark as reviewed/ }))
    expect(postRequests()).toEqual(['/alerts/complaint-reviews/12/review undefined'])
    await waitFor(() =>
      expect(screen.getByRole('heading', { level: 2, name: 'For review' })).toHaveFocus(),
    )
    expect(
      await screen.findByText("Marked as reviewed: the complaint review of Pat Lee's record.", {
        selector: '[role="status"]',
      }),
    ).toBeInTheDocument()
    expect(await screen.findByText("You're all caught up.")).toBeInTheDocument()
  })

  it('says a refused complaint review mark in the row', async () => {
    alerts = () => json([complaintReviewAlert()])
    complaintReview = () => apiError(409, 'This complaint review is not in your For review list')
    const user = userEvent.setup()
    renderHome()
    const [row] = await rows()
    await user.click(within(row).getByRole('button', { name: /^Mark as reviewed/ }))
    expect(await within(row).findByRole('alert')).toHaveTextContent(
      'This complaint review is not in your For review list',
    )
    expect(within(row).getByRole('button', { name: /^Mark as reviewed/ })).toBeEnabled()
  })

  it('keys a complaint review apart from a join and a session of the same number', async () => {
    const consoleError = vi.spyOn(console, 'error')
    alerts = () =>
      json([
        sessionAlert({ session: { ...sessionAlert().session, id: 12 } }),
        joinAlert({ link: { id: 12 } }),
        complaintReviewAlert(),
      ])
    renderHome()
    expect(await rows()).toHaveLength(3)
    expect(
      consoleError.mock.calls.filter((call) => String(call[0]).includes('same key')),
    ).toEqual([])
    consoleError.mockRestore()
  })

  // --- An admin disclosed the record (2026-10-28, pass 3) ---

  it('gives a disclosure row who made it, to whom, when, what it means — and no link', async () => {
    alerts = () => json([legalDisclosureAlert()])
    renderHome()
    const [row] = await rows()
    expect(within(row).getByText('Pat Lee')).toBeInTheDocument()
    expect(
      within(row).getByText('Avery Admin disclosed the record to Det. Jane Roe (Montreal Police)'),
    ).toBeInTheDocument()
    expect(
      within(row).getByText(
        "The law required the clinic to give them a copy. The order's details stay with the clinic's admins.",
      ),
    ).toBeInTheDocument()
    expect(
      within(row).getByRole('button', { name: "Mark as reviewed: disclosure of Pat Lee's record" }),
    ).toHaveTextContent('Mark as reviewed')
    expect(within(row).queryByRole('link')).not.toBeInTheDocument()
  })

  it('says, while a hold runs, when the patient will see it — and not to tell them first', async () => {
    // A hold far in the future: still running whatever the real clock says.
    alerts = () =>
      json([legalDisclosureAlert({ disclosure: { withheldUntil: '2099-06-30T12:00:00.000Z' } })])
    renderHome()
    const [row] = await rows()
    expect(within(row).getByText(/· Pat sees it from/)).toBeInTheDocument()
    expect(within(row).getByText(/An agency asked that Pat not be told until then/)).toBeInTheDocument()
  })

  it('marks a disclosure seen: its own POST, focus to the heading, said', async () => {
    let listed = [legalDisclosureAlert()]
    alerts = () => json(listed)
    const user = userEvent.setup()
    renderHome()
    const [row] = await rows()
    listed = []
    await user.click(within(row).getByRole('button', { name: /^Mark as reviewed/ }))
    expect(postRequests()).toEqual(['/alerts/legal-disclosures/21/review undefined'])
    await waitFor(() =>
      expect(screen.getByRole('heading', { level: 2, name: 'For review' })).toHaveFocus(),
    )
    expect(
      await screen.findByText("Marked as reviewed: the disclosure of Pat Lee's record.", {
        selector: '[role="status"]',
      }),
    ).toBeInTheDocument()
    expect(await screen.findByText("You're all caught up.")).toBeInTheDocument()
  })

  // --- An admin merged two accounts of the patient (2026-10-29) ---

  it('gives a merge row who merged, when, what it means, and a link to the patient', async () => {
    alerts = () => json([patientMergeAlert()])
    renderHome()
    const [row] = await rows()
    expect(within(row).getByText('Pat Lee')).toBeInTheDocument()
    expect(
      within(row).getByText('Avery Admin merged a second account of this patient into this one'),
    ).toBeInTheDocument()
    expect(
      within(row).getByText(
        'Programs, sessions, notes and messages from the other account are now part of this record.',
      ),
    ).toBeInTheDocument()
    expect(within(row).getByRole('link', { name: 'Open Pat Lee' })).toHaveAttribute(
      'href',
      '/practitioner/patients/6',
    )
  })

  it('marks a merge seen: its own POST, focus to the heading, said', async () => {
    let listed = [patientMergeAlert()]
    alerts = () => json(listed)
    const user = userEvent.setup()
    renderHome()
    const [row] = await rows()
    listed = []
    await user.click(
      within(row).getByRole('button', { name: 'Mark as reviewed: accounts of Pat Lee merged' }),
    )
    expect(postRequests()).toEqual(['/alerts/patient-merges/31/review undefined'])
    await waitFor(() =>
      expect(screen.getByRole('heading', { level: 2, name: 'For review' })).toHaveFocus(),
    )
    expect(
      await screen.findByText("Marked as reviewed: the merge of Pat Lee's accounts.", {
        selector: '[role="status"]',
      }),
    ).toBeInTheDocument()
  })

  it('keys a merge apart from a disclosure of the same number', async () => {
    const consoleError = vi.spyOn(console, 'error')
    alerts = () =>
      json([legalDisclosureAlert({ disclosure: { id: 31 } }), patientMergeAlert()])
    renderHome()
    expect(await rows()).toHaveLength(2)
    expect(
      consoleError.mock.calls.filter((call) => String(call[0]).includes('same key')),
    ).toEqual([])
    consoleError.mockRestore()
  })

  it('says a refused disclosure mark in the row', async () => {
    alerts = () => json([legalDisclosureAlert()])
    disclosureReview = () => apiError(409, 'This disclosure is not in your For review list')
    const user = userEvent.setup()
    renderHome()
    const [row] = await rows()
    await user.click(within(row).getByRole('button', { name: /^Mark as reviewed/ }))
    expect(await within(row).findByRole('alert')).toHaveTextContent(
      'This disclosure is not in your For review list',
    )
    expect(within(row).getByRole('button', { name: /^Mark as reviewed/ })).toBeEnabled()
  })

  it('keys a disclosure apart from a complaint review of the same number', async () => {
    const consoleError = vi.spyOn(console, 'error')
    alerts = () =>
      json([
        complaintReviewAlert({ review: { id: 21 } }),
        legalDisclosureAlert(),
      ])
    renderHome()
    expect(await rows()).toHaveLength(2)
    expect(
      consoleError.mock.calls.filter((call) => String(call[0]).includes('same key')),
    ).toEqual([])
    consoleError.mockRestore()
  })
})