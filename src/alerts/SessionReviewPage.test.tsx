import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router'
import { currentUserQueryKey } from '@/auth/useCurrentUser'
import { formatMomentDate } from '@/common/formatMomentDate'
import { formatShortDate } from '@/common/calendarDate'
import { apiError, json, KNEE, PAT, sessionExercise, urlOf } from '@/sessions/testData'
import { alertsQueryKey } from './api'
import { SessionReviewPage } from './SessionReviewPage'
import { staffSession } from './testData'
import type { StaffSession } from './types'

// The care team's view of one session (2026-10-19), against a simulated
// server: GET /sessions/31 (with reviews), the program (title, workouts),
// the patient (name), and POST /sessions/31/review.
const fetchMock = vi.fn<typeof fetch>()
vi.stubGlobal('fetch', fetchMock)

const ME = { id: 3, firstName: 'Alex', lastName: 'Chen', avatarUrl: null, preferredWeightUnit: 'kg' }
const SAM = { id: 4, firstName: 'Sam', lastName: 'Okafor' }

let current: StaffSession
let sessionAnswer: () => Response
// The review's answer — a function so a test can HOLD it (a promise it
// resolves later) and look at the page meanwhile.
let reviewAnswer: () => Promise<Response>

beforeEach(() => {
  fetchMock.mockReset()
  current = staffSession()
  sessionAnswer = () => json(current)
  reviewAnswer = () => {
    current = { ...current, reviews: [...current.reviews, { practitioner: ME, reviewedAt: '2031-06-12T09:00:00.000Z' }] }
    return Promise.resolve(json(current))
  }
  fetchMock.mockImplementation((input, init) => {
    const url = new URL(urlOf(input))
    const method = init?.method ?? 'GET'
    if (method === 'GET' && url.pathname.endsWith('/sessions/31')) return Promise.resolve(sessionAnswer())
    if (method === 'POST' && url.pathname.endsWith('/sessions/31/review')) return reviewAnswer()
    if (url.pathname.endsWith('/assigned-programs/12')) return Promise.resolve(json(KNEE))
    if (url.pathname.endsWith('/users/6')) return Promise.resolve(json(PAT))
    return Promise.reject(new Error(`unexpected request: ${method} ${url.href}`))
  })
})

function renderPage(path = '/practitioner/sessions/31') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 30_000 } },
  })
  queryClient.setQueryData(currentUserQueryKey, ME)
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/practitioner/sessions/:sessionId" element={<SessionReviewPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return queryClient
}

const section = (name: string) => screen.findByRole('region', { name })
function requests() {
  return fetchMock.mock.calls.map(([input, init]) => {
    const url = new URL(urlOf(input))
    return { method: init?.method ?? 'GET', path: url.pathname, body: init?.body }
  })
}

describe('SessionReviewPage', () => {
  it('names the program, the patient (a link), the workout, the day and how it ended', async () => {
    renderPage()
    expect(await screen.findByRole('heading', { level: 1, name: 'Knee Rehab' })).toBeInTheDocument()
    expect(await screen.findByRole('link', { name: 'Pat Lee' })).toHaveAttribute('href', '/practitioner/patients/6')
    // Two workouts in the program: the label says which one.
    expect(screen.getByText('A · Mobility')).toBeInTheDocument()
    expect(screen.getByText(`${formatShortDate('2031-06-10')} · Completed`)).toBeInTheDocument()
  })

  it('names no workout when the program has only one', async () => {
    const oneWorkout = { ...KNEE, workouts: [KNEE.workouts[0]] }
    fetchMock.mockImplementation((input) => {
      const url = new URL(urlOf(input))
      if (url.pathname.endsWith('/sessions/31')) return Promise.resolve(json(current))
      if (url.pathname.endsWith('/assigned-programs/12')) return Promise.resolve(json(oneWorkout))
      if (url.pathname.endsWith('/users/6')) return Promise.resolve(json(PAT))
      return Promise.reject(new Error(`unexpected request: ${url.href}`))
    })
    renderPage()
    expect(await screen.findByRole('heading', { level: 1, name: 'Knee Rehab' })).toBeInTheDocument()
    expect(screen.queryByText(/· Mobility$/)).not.toBeInTheDocument()
  })

  it('lists the scores asked, with their values — 0 included — and the scale', async () => {
    current = staffSession({ painBefore: 0, painAfter: 7, mobilityAfter: null })
    renderPage()
    const how = await section('How it went')
    const pairs = within(how)
      .getAllByRole('term')
      .map((term) => [term.textContent, term.nextElementSibling?.textContent])
    expect(pairs).toEqual([
      ['Pain before', '0 out of 10'],
      ['Pain after', '7 out of 10'],
      ['Mobility after', 'Not answered'],
    ])
    expect(within(how).getByText(/0 = no pain, 10 = worst pain/)).toBeInTheDocument()
  })

  it('shows only the questions asked: a skip for pain has a pain level and no check-out', async () => {
    current = staffSession({
      status: 'skipped',
      endReason: 'pain',
      startedAt: null,
      completedAt: null,
      endedAt: '2031-06-10T07:30:00.000Z',
      painBefore: 6,
      painAfter: null,
      mobilityAfter: null,
      endNote: 'Knee swollen this morning',
      exercises: [],
    })
    renderPage()
    const how = await section('How it went')
    expect(within(how).getAllByRole('term').map((term) => term.textContent)).toEqual(['Pain before'])
    expect(screen.getByText(`${formatShortDate('2031-06-10')} · Skipped (pain)`)).toBeInTheDocument()
    // The patient's words, as a quotation, labelled by how it ended.
    const note = within(how).getByText('Knee swollen this morning')
    expect(note.tagName).toBe('BLOCKQUOTE')
    expect(within(how).getByText('Their note when skipping')).toBeInTheDocument()
    expect(screen.getByText('Skipped before starting: no exercise was done.')).toBeInTheDocument()
  })

  it("says the stop's note and the session's feedback, each labelled", async () => {
    current = staffSession({
      status: 'incomplete',
      endReason: 'pain',
      completedAt: null,
      endedAt: '2031-06-10T17:10:00.000Z',
      endNote: 'It hurt too much',
      sessionFeedback: null,
    })
    renderPage()
    const how = await section('How it went')
    expect(within(how).getByText('Their note when stopping')).toBeInTheDocument()
    expect(within(how).getByText('It hurt too much')).toBeInTheDocument()
    expect(within(how).queryByText('Their feedback on the session')).not.toBeInTheDocument()
  })

  it("shows the session's feedback — and no end-note label on a completed session", async () => {
    current = staffSession({ sessionFeedback: 'Felt better today' })
    renderPage()
    const how = await section('How it went')
    expect(within(how).getByText('Their feedback on the session')).toBeInTheDocument()
    expect(within(how).getByText('Felt better today').tagName).toBe('BLOCKQUOTE')
    expect(within(how).queryByText(/Their note when/)).not.toBeInTheDocument()
  })

  it('gives each exercise its state, its difficulty and its note', async () => {
    current = staffSession({
      exercises: [
        sessionExercise(1, 0, { name: 'Heel Slides', sets: 3, reps: 10, completed: true, difficultyRating: 4 }),
        sessionExercise(2, 1, { name: 'Squat', sets: 3, reps: 8, difficultyRating: 9, feedback: 'My knee clicked' }),
      ],
    })
    renderPage()
    const items = within(await section('Exercises')).getAllByRole('listitem')
    expect(items).toHaveLength(2)
    expect(within(items[0]).getByText('Done')).toBeInTheDocument()
    expect(within(items[0]).getByText('Difficulty: 4 out of 10')).toBeInTheDocument()
    expect(within(items[0]).queryByText('Their note')).not.toBeInTheDocument()
    expect(within(items[1]).getByText('Not done')).toBeInTheDocument()
    expect(within(items[1]).getByText('Difficulty: 9 out of 10')).toBeInTheDocument()
    expect(within(items[1]).getByText('My knee clicked').tagName).toBe('BLOCKQUOTE')
  })

  it('says nothing about difficulty for an exercise the patient did not rate', async () => {
    renderPage()
    const items = within(await section('Exercises')).getAllByRole('listitem')
    expect(items).toHaveLength(2)
    expect(screen.queryByText(/Difficulty/)).not.toBeInTheDocument()
  })

  it("says nobody has reviewed it yet, and offers Mark as reviewed", async () => {
    renderPage()
    const reviews = await section('Reviewed by')
    expect(within(reviews).getByText('Nobody on the care team has marked it reviewed yet.')).toBeInTheDocument()
    expect(within(reviews).getByRole('button', { name: 'Mark as reviewed' })).toBeEnabled()
  })

  it("lists a colleague's review, and still offers mine", async () => {
    current = staffSession({ reviews: [{ practitioner: SAM, reviewedAt: '2031-06-11T09:30:00.000Z' }] })
    renderPage()
    const reviews = await section('Reviewed by')
    expect(within(reviews).getByRole('listitem')).toHaveTextContent(
      `Sam Okafor — ${formatMomentDate('2031-06-11T09:30:00.000Z')}`,
    )
    expect(within(reviews).getByRole('button', { name: 'Mark as reviewed' })).toBeInTheDocument()
  })

  it('marks it reviewed: one POST with no body, Saving… meanwhile, then You — and no button', async () => {
    let release!: () => void
    const answered = reviewAnswer
    reviewAnswer = () => new Promise((resolve) => (release = () => resolve(answered())))
    const queryClient = renderPage()
    // The To-do's list is in the cache (as when the practitioner came from
    // the home): it must be marked stale.
    queryClient.setQueryData(alertsQueryKey('2031-06-12'), [])

    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Mark as reviewed' }))
    expect(await screen.findByRole('button', { name: 'Saving…' })).toBeDisabled()
    release()

    const reviews = await section('Reviewed by')
    expect(await within(reviews).findByText(`You — ${formatMomentDate('2031-06-12T09:00:00.000Z')}`)).toBeInTheDocument()
    expect(within(reviews).queryByRole('button')).not.toBeInTheDocument()
    expect(requests().filter((r) => r.method === 'POST')).toEqual([
      { method: 'POST', path: '/sessions/31/review', body: undefined },
    ])
    // The answer was used as is: no second read of the session.
    expect(requests().filter((r) => r.path === '/sessions/31')).toHaveLength(1)
    expect(queryClient.getQueryState(alertsQueryKey('2031-06-12'))?.isInvalidated).toBe(true)
  })

  it("offers no button once I have reviewed it", async () => {
    current = staffSession({ reviews: [{ practitioner: ME, reviewedAt: '2031-06-11T09:30:00.000Z' }] })
    renderPage()
    const reviews = await section('Reviewed by')
    expect(within(reviews).getByText(/^You — /)).toBeInTheDocument()
    expect(within(reviews).queryByRole('button')).not.toBeInTheDocument()
  })

  it("says why a session in progress can't be reviewed, with no button", async () => {
    current = staffSession({ status: 'in_progress', completedAt: null, painAfter: null, mobilityAfter: null })
    renderPage()
    const reviews = await section('Reviewed by')
    expect(
      within(reviews).getByText('This session is still in progress: it can be reviewed once it has ended.'),
    ).toBeInTheDocument()
    expect(within(reviews).queryByRole('button')).not.toBeInTheDocument()
  })

  it("shows the server's refusal and lets me try again", async () => {
    reviewAnswer = () =>
      Promise.resolve(apiError(409, "This session is still in progress, so it can't be reviewed yet"))
    renderPage()
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Mark as reviewed' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      "This session is still in progress, so it can't be reviewed yet",
    )
    expect(screen.getByRole('button', { name: 'Mark as reviewed' })).toBeEnabled()
  })

  it('links to the program and home', async () => {
    renderPage()
    const nav = await screen.findByRole('navigation', { name: 'Leave this session' })
    expect(
      within(nav)
        .getAllByRole('link')
        .map((link) => [link.textContent, link.getAttribute('href')]),
    ).toEqual([
      ['View program', '/practitioner/programs/assigned/12'],
      ['Back to home', '/practitioner'],
    ])
  })

  async function expectNotAvailable() {
    expect(await screen.findByRole('heading', { level: 1, name: 'Session not available' })).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent(
      /^This session doesn't exist, or it belongs to a patient whose care team you're not on\. Only a patient's care team can open their sessions\.$/,
    )
    expect(
      screen.getAllByRole('link').map((link) => [link.textContent, link.getAttribute('href')]),
    ).toStrictEqual([
      ['Back to home', '/practitioner'],
      ['My patients', '/practitioner/patients'],
    ])
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument()
  }

  it("says the session isn't available on a 404 — the same words for missing and not mine", async () => {
    sessionAnswer = () => apiError(404, 'Session 31 not found')
    renderPage()
    await expectNotAvailable()
  })

  it('asks nothing for an address that is not a session number', async () => {
    renderPage('/practitioner/sessions/abc')
    await expectNotAvailable()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('says loading failed on another error, without claiming it is not available — and "Try again" asks again', async () => {
    const user = userEvent.setup()
    let fail = true
    sessionAnswer = () => (fail ? apiError(500, 'boom') : json(staffSession()))
    renderPage()
    expect(await screen.findByRole('alert')).toHaveTextContent(
      /^Couldn't load this session\. Something went wrong on our side\. Try again in a moment\.$/,
    )
    expect(screen.getByRole('link', { name: 'Back to home' })).toHaveAttribute('href', '/practitioner')
    expect(screen.queryByText('Session not available')).not.toBeInTheDocument()
    fail = false
    await user.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByRole('button', { name: 'Mark as reviewed' })).toBeInTheDocument()
    // Focus on the page's title, not lost at the top.
    await waitFor(() => expect(screen.getByRole('heading', { level: 1 })).toHaveFocus())
  })
})