import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { currentUserQueryKey } from '@/auth/useCurrentUser'
import { formatShortDate } from '@/common/calendarDate'
import { sessionQueryKey } from './api'
import { SessionPage } from './SessionPage'
import {
  B,
  KNEE,
  PAT,
  apiError,
  json,
  session,
  sessionExercise,
  urlOf,
} from './testData'
import { expectLoadError, expectNotAvailable } from './notAvailableAssertions'

const fetchMock = vi.fn<typeof fetch>()
vi.stubGlobal('fetch', fetchMock)

let sessionAnswer: () => Response
let programAnswer: () => Response

// A FINISHED session: the page shows its checklist read-only (an open
// session of today gets the player instead — SessionPlayer.test.tsx).
function finished(fields: Parameters<typeof session>[0] = {}) {
  return session({ status: 'completed', completedAt: '2031-06-12T12:40:00.000Z', ...fields })
}

beforeEach(() => {
  fetchMock.mockReset()
  sessionAnswer = () => json(session())
  programAnswer = () => json(KNEE)
  fetchMock.mockImplementation((input) => {
    const url = urlOf(input)
    if (/\/sessions\/31$/.test(url)) return Promise.resolve(sessionAnswer())
    if (/\/assigned-programs\/12$/.test(url)) return Promise.resolve(programAnswer())
    return Promise.reject(new Error(`unexpected request: ${url}`))
  })
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2031, 5, 12, 15, 0))
})

afterEach(() => {
  vi.useRealTimers()
})

function renderPage(path = '/patient/sessions/31', cached?: ReturnType<typeof session>) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 30_000 } },
  })
  queryClient.setQueryData(currentUserQueryKey, PAT)
  if (cached) queryClient.setQueryData(sessionQueryKey(cached.id), cached)
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/patient/sessions/:sessionId" element={<SessionPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

function requested() {
  return fetchMock.mock.calls.map(([input]) => urlOf(input))
}

describe('SessionPage', () => {
  it('shows the session: its program and workout, its state, and its checklist', async () => {
    sessionAnswer = () => json(finished())
    renderPage()
    expect(await screen.findByRole('heading', { level: 1, name: 'Knee Rehab' })).toBeInTheDocument()
    expect(screen.getByText('A · Mobility')).toBeInTheDocument()
    expect(screen.getByText(/^Completed · Started at /)).toBeInTheDocument()

    const list = screen.getByRole('list')
    expect(within(list).getAllByRole('listitem').map((item) => item.textContent)).toStrictEqual([
      'Heel Slides3 sets · 10 repsTo do',
      // Pat prefers pounds: WeightValue converts, the prescription alongside.
      'Squat3 sets · 8 reps · 44.1 lbs (20 kg)To do',
    ])
    expect(screen.getByText('0 of 2 exercises done')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to home' })).toHaveAttribute('href', '/patient')
    // Today's open session is simply in progress — not "left open".
    expect(screen.queryByText(/was left open/)).not.toBeInTheDocument()
  })

  // The checklist is the SESSION's copy — what it was given when it
  // started — not the program's current exercises (step 3b-0 / D-2).
  it("lists the session's own copy, not the program's current exercises", async () => {
    sessionAnswer = () =>
      json(finished({ exercises: [sessionExercise(1, 0, { name: 'Heel Slides (as given then)' })] }))
    renderPage()
    const list = await screen.findByRole('list')
    expect(within(list).getAllByRole('listitem').map((item) => item.textContent)).toStrictEqual([
      'Heel Slides (as given then)To do',
    ])
  })

  it('says which exercises are done, in words', async () => {
    sessionAnswer = () =>
      json(
        finished({
          exercises: [
            sessionExercise(1, 0, { name: 'Heel Slides', completed: true }),
            sessionExercise(2, 1, { name: 'Squat' }),
          ],
        }),
      )
    renderPage()
    const items = within(await screen.findByRole('list')).getAllByRole('listitem')
    expect(items[0]).toHaveTextContent(/Done$/)
    expect(items[1]).toHaveTextContent(/To do$/)
    expect(screen.getByText('1 of 2 exercises done')).toBeInTheDocument()
  })

  it('shows the pain check-in when one was given — 0 included', async () => {
    sessionAnswer = () => json(session({ painBefore: 0 }))
    renderPage()
    expect(await screen.findByText('Pain when you started: 0 out of 10')).toBeInTheDocument()
  })

  it('says nothing of a check-in not given', async () => {
    renderPage()
    await screen.findByRole('heading', { level: 1, name: 'Knee Rehab' })
    expect(screen.queryByText(/Pain when you started/)).not.toBeInTheDocument()
  })

  it("names no workout for a program with only one", async () => {
    programAnswer = () => json({ ...KNEE, workouts: [KNEE.workouts[0]] })
    renderPage()
    await screen.findByRole('heading', { level: 1, name: 'Knee Rehab' })
    expect(screen.queryByText('A · Mobility')).not.toBeInTheDocument()
  })

  it("names the session's own workout", async () => {
    sessionAnswer = () => json(session({ workoutId: B }))
    renderPage()
    expect(await screen.findByText('B · Strength')).toBeInTheDocument()
  })

  // Opened right after starting: the answer is already cached — the page
  // shows it with no request for the session (only the program's title).
  it('opens at once from the cache, asking only for the program', async () => {
    renderPage('/patient/sessions/31', finished())
    expect(screen.getByRole('list')).toBeInTheDocument()
    await screen.findByRole('heading', { level: 1, name: 'Knee Rehab' })
    expect(requested()).toStrictEqual([expect.stringMatching(/\/assigned-programs\/12$/)])
  })

  it("still shows the session when the program can't be read", async () => {
    programAnswer = () => apiError(500, 'Internal server error')
    sessionAnswer = () => json(finished())
    renderPage()
    expect(await screen.findByRole('heading', { level: 1, name: 'Your session' })).toBeInTheDocument()
    expect(screen.getByRole('list')).toBeInTheDocument()
  })

  // Open, but from an earlier day: it can't be finished any more.
  it('says a session from an earlier day was left open', async () => {
    sessionAnswer = () =>
      json(session({ localDate: '2031-06-09', startedAt: '2031-06-09T16:00:00.000Z' }))
    renderPage()
    expect(
      await screen.findByText(
        'This session was left open. It can no longer be finished, and will be kept as not finished.',
      ),
    ).toBeInTheDocument()
    expect(screen.getByText(`In progress · Started on ${formatShortDate('2031-06-09')}`)).toBeInTheDocument()
    // Finish can't reach it; Stop can.
    expect(screen.getByRole('link', { name: 'Stop it now' })).toHaveAttribute('href', '/patient/sessions/31/stop')
  })

  it("doesn't say it of a finished session from an earlier day", async () => {
    sessionAnswer = () =>
      json(
        session({
          localDate: '2031-06-09',
          startedAt: '2031-06-09T16:00:00.000Z',
          status: 'incomplete',
          endReason: 'pain',
          endedAt: '2031-06-09T16:20:00.000Z',
        }),
      )
    renderPage()
    expect(await screen.findByText(`Stopped (pain) · Started on ${formatShortDate('2031-06-09')}`)).toBeInTheDocument()
    expect(screen.queryByText(/was left open/)).not.toBeInTheDocument()
  })

  // A late make-up: done today (Thursday 12), counting for Monday 2.
  it('says which day a session counts for, and nothing for an ordinary one', async () => {
    sessionAnswer = () => json(session({ countsFor: '2031-06-02' }))
    renderPage()
    expect(
      await screen.findByText(`Counts for the session of ${formatShortDate('2031-06-02')}`),
    ).toBeInTheDocument()

    cleanup()
    sessionAnswer = () => json(session())
    renderPage()
    await screen.findByText(/^In progress · Started at /)
    expect(screen.queryByText(/^Counts for/)).not.toBeInTheDocument()
  })

  it('names a finished session by how it ended', async () => {
    sessionAnswer = () =>
      json(session({ status: 'completed', completedAt: '2031-06-12T12:40:00.000Z' }))
    renderPage()
    expect(await screen.findByText(/^Completed · Started at /)).toBeInTheDocument()
  })

  it("says a session it can't see isn't available", async () => {
    sessionAnswer = () => apiError(404, 'Session not found')
    renderPage()
    await expectNotAvailable('session')
    // No program asked for: the session never said which.
    expect(requested()).toStrictEqual([expect.stringMatching(/\/sessions\/31$/)])
  })

  it('says so when loading fails for another reason', async () => {
    sessionAnswer = () => apiError(500, 'Internal server error')
    renderPage()
    await expectLoadError('session')
  })

  it('offers the two ways out a patient has: home and Sessions', async () => {
    sessionAnswer = () => apiError(404, 'Session not found')
    renderPage()
    await expectNotAvailable('session')
    expect(
      screen.getAllByRole('link').map((link) => [link.textContent, link.getAttribute('href')]),
    ).toStrictEqual([
      ['Back to home', '/patient'],
      ['Your sessions', '/patient/sessions'],
    ])
  })

  it('"Try again" asks for the session again and shows it', async () => {
    const user = userEvent.setup()
    let fail = true
    sessionAnswer = () => (fail ? apiError(500, 'Internal server error') : json(finished()))
    renderPage()
    await expectLoadError('session')
    fail = false
    await user.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByText(/^Completed · Started at /)).toBeInTheDocument()
    expect(requested().filter((url) => url.endsWith('/sessions/31'))).toHaveLength(2)
  })

  // The real TanStack Query flow: a request that never succeeded goes back to
  // "pending" while it is asked again (the page shows "Loading…"), so the
  // error block that comes back after a failed retry is a NEW one — it must
  // say "Still" and put focus back on its button (found in Chromium,
  // 2026-10-23).
  it('a retry that fails again: "Loading…", then "Still couldn\'t load", focus on "Try again"', async () => {
    const user = userEvent.setup()
    let fail = true
    sessionAnswer = () => (fail ? apiError(500, 'Internal server error') : json(finished()))
    renderPage()
    await expectLoadError('session')
    // Hold the retry's answer, to see the page while it waits.
    let release: () => void = () => {}
    fetchMock.mockImplementationOnce(
      () => new Promise<Response>((resolve) => (release = () => resolve(apiError(500, 'Internal server error')))),
    )
    await user.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByText('Loading…')).toBeInTheDocument()
    release()
    expect(await screen.findByRole('alert')).toHaveTextContent(/^Still couldn't load this session\.$/)
    expect(screen.getByRole('button', { name: 'Try again' })).toHaveFocus()
    // And once the server answers, the session.
    fail = false
    await user.keyboard('{Enter}')
    expect(await screen.findByText(/^Completed · Started at /)).toBeInTheDocument()
  })

  it('refuses an address that names no session, asking nothing', async () => {
    renderPage('/patient/sessions/0')
    await expectNotAvailable('session')
    expect(requested()).toStrictEqual([])
  })
})

// The way back (2026-10-18): opened from a program page's "View session",
// the page goes BACK to it; otherwise home.
describe('SessionPage — the way back', () => {
  // The history as a program page's "View session" leaves it: the program
  // page's entry (its own state marks it), then the session's, carrying
  // `state`.
  function renderFrom(state: unknown) {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: 30_000 } },
    })
    queryClient.setQueryData(currentUserQueryKey, PAT)
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter
          initialEntries={[
            { pathname: '/patient/sessions/programs/12', state: { marker: 'the original entry' } },
            { pathname: '/patient/sessions/31', state },
          ]}
          initialIndex={1}
        >
          <Routes>
            <Route path="/patient/sessions/:sessionId" element={<SessionPage />} />
            <Route path="/patient/sessions/programs/:programId" element={<ProgramStandIn />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )
  }

  // Shows which ENTRY it is: the original one keeps its marker; a new copy
  // pushed by a link would have none.
  function ProgramStandIn() {
    const state = useLocation().state as { marker?: string } | null
    return <p>Program page — {state?.marker ?? 'a new entry'}</p>
  }

  it('goes back to the program page it came from — the same entry, not a new one', async () => {
    sessionAnswer = () => json(finished())
    const user = userEvent.setup()
    renderFrom({ from: 'program', programId: 12 })
    const back = await screen.findByRole('link', { name: 'Back to the program' })
    // A real address: a new tab opens the program page.
    expect(back).toHaveAttribute('href', '/patient/sessions/programs/12')
    expect(screen.queryByRole('link', { name: 'Back to home' })).not.toBeInTheDocument()
    await user.click(back)
    expect(screen.getByText('Program page — the original entry')).toBeInTheDocument()
  })

  it('leaves a Ctrl-click to the browser (a new tab), staying here', async () => {
    sessionAnswer = () => json(finished())
    renderFrom({ from: 'program', programId: 12 })
    const back = await screen.findByRole('link', { name: 'Back to the program' })
    fireEvent.click(back, { ctrlKey: true })
    expect(await screen.findByRole('heading', { level: 1, name: 'Knee Rehab' })).toBeInTheDocument()
    expect(screen.queryByText(/^Program page/)).not.toBeInTheDocument()
  })

  // The state is believed only for this session's own program (12).
  it.each<[string, unknown]>([
    ['another program', { from: 'program', programId: 13 }],
    ['no note', null],
    ['a note of another shape', { from: 'program', programId: '12' }],
  ])('goes home when the page was reached with %s', async (_label, state) => {
    sessionAnswer = () => json(finished())
    renderFrom(state)
    expect(await screen.findByRole('link', { name: 'Back to home' })).toHaveAttribute('href', '/patient')
    expect(screen.queryByRole('link', { name: 'Back to the program' })).not.toBeInTheDocument()
  })
})