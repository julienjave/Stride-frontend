import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes, useNavigate, useParams } from 'react-router'
import { currentUserQueryKey } from '@/auth/useCurrentUser'
import { assignedProgramQueryKey, assignedProgramSummaryQueryKey } from '@/assigned-programs/api'
import type { AssignedProgramDetail, ScheduleSummary } from '@/assigned-programs/types'
import { sessionQueryKey } from './api'
import { StartSessionPage } from './StartSessionPage'
import {
  A,
  B,
  KNEE,
  PAT,
  TODAY,
  apiError,
  json,
  scheduledDay,
  session,
  summary,
  urlOf,
} from './testData'

const fetchMock = vi.fn<typeof fetch>()
vi.stubGlobal('fetch', fetchMock)

// What each request answers — tests replace entries for their case.
let program: () => Response
let todaySummary: () => Response
let startAnswer: () => Promise<Response>

const DUE = summary({ days: [scheduledDay(TODAY, A, 'due')] })

beforeEach(() => {
  fetchMock.mockReset()
  program = () => json(KNEE)
  todaySummary = () => json(DUE)
  startAnswer = () => Promise.resolve(json(session(), 201))
  fetchMock.mockImplementation((input, init) => {
    const url = urlOf(input)
    if (init?.method === 'POST' && url.endsWith('/sessions')) return startAnswer()
    if (/\/assigned-programs\/12$/.test(url)) return Promise.resolve(program())
    if (/\/assigned-programs\/12\/summary\?today=/.test(url)) return Promise.resolve(todaySummary())
    return Promise.reject(new Error(`unexpected request: ${url}`))
  })
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2031, 5, 12, 12, 0))
})

afterEach(() => {
  vi.useRealTimers()
})

// Stand-ins for the pages around this one: the session page says which
// session it shows and offers the browser's Back; the home says it's home.
function SessionStandIn() {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  return (
    <>
      <p>Session page {sessionId}</p>
      <button onClick={() => void navigate(-1)}>Browser back</button>
    </>
  )
}

function renderPage(path = '/patient/sessions/start/12', cachedSummary?: ScheduleSummary) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 30_000 } },
  })
  queryClient.setQueryData(currentUserQueryKey, PAT)
  if (cachedSummary) {
    queryClient.setQueryData(assignedProgramQueryKey(12), KNEE)
    queryClient.setQueryData(assignedProgramSummaryQueryKey(12, TODAY), cachedSummary)
  }
  render(
    <QueryClientProvider client={queryClient}>
      {/* The home first, then this page — as when Start was tapped. */}
      <MemoryRouter initialEntries={['/patient', path]} initialIndex={1}>
        <Routes>
          <Route path="/patient" element={<p>Home page</p>} />
          <Route path="/patient/sessions/start/:programId" element={<StartSessionPage />} />
          <Route path="/patient/sessions/:sessionId" element={<SessionStandIn />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return queryClient
}

// Each request as plain values — the method, the path and query (the
// API's origin dropped), the body as sent — so tests compare LITERALS.
function requests() {
  return fetchMock.mock.calls.map(([input, init]) => {
    const url = new URL(urlOf(input))
    return {
      method: init?.method ?? 'GET',
      path: url.pathname + url.search,
      body: init?.body ?? null,
    }
  })
}

function posts() {
  return requests().filter((request) => request.method === 'POST')
}

async function startForm() {
  return screen.findByRole('heading', { name: 'Start your session' })
}

describe('StartSessionPage — before starting', () => {
  it("shows today's workout — its program, why today, its exercises — and writes nothing", async () => {
    renderPage()
    await startForm()
    expect(screen.getByText('Knee Rehab: A · Mobility')).toBeInTheDocument()
    expect(screen.getByText("Today's session.")).toBeInTheDocument()

    const list = screen.getByRole('list')
    expect(within(list).getAllByRole('listitem').map((item) => item.textContent)).toStrictEqual([
      'Heel Slides3 sets · 10 reps',
      // Pat prefers pounds: the prescription in kg shown converted, the
      // prescription itself alongside (WeightValue).
      'Squat3 sets · 8 reps · 44.1 lbs (20 kg)',
    ])
    expect(screen.getByRole('heading', { name: '2 exercises' })).toBeInTheDocument()
    // Only reads: the program, then today's summary.
    expect(requests()).toStrictEqual([
      { method: 'GET', path: '/assigned-programs/12', body: null },
      { method: 'GET', path: `/assigned-programs/12/summary?today=${TODAY}`, body: null },
    ])
  })

  it('asks the pain question, optional, nothing chosen', async () => {
    renderPage()
    await startForm()
    const question = screen.getByRole('group', { name: 'How much pain do you have right now?' })
    expect(question).toHaveAccessibleDescription('Optional. 0 = no pain, 10 = worst pain imaginable.')
    expect(within(question).getAllByRole('radio').some((radio) => (radio as HTMLInputElement).checked)).toBe(false)
  })

  it("starts a catch-up with the MISSED day's workout, and says so", async () => {
    todaySummary = () =>
      json(
        summary({
          days: [scheduledDay('2031-06-11', B, 'due')],
          nextWorkout: { workoutId: B, forDay: '2031-06-11', programWeek: null },
        }),
      )
    renderPage()
    await startForm()
    expect(screen.getByText('Knee Rehab: B · Strength')).toBeInTheDocument()
    expect(
      screen.getByText("Catching up Wednesday's session: it was missed, and you can still make it up today."),
    ).toBeInTheDocument()
    expect(within(screen.getByRole('list')).getAllByRole('listitem').map((item) => item.textContent)).toStrictEqual([
      'Bridge2 sets · 12 reps',
    ])
    expect(screen.getByRole('heading', { name: '1 exercise' })).toBeInTheDocument()
  })

  it('names no workout for a program with only one', async () => {
    const oneWorkout: AssignedProgramDetail = {
      ...KNEE,
      workouts: [KNEE.workouts[0]],
      exercises: KNEE.exercises.filter((exercise) => exercise.workoutId === A),
    }
    program = () => json(oneWorkout)
    renderPage()
    await startForm()
    expect(screen.getByText('Knee Rehab')).toBeInTheDocument()
    expect(screen.queryByText(/Mobility/)).not.toBeInTheDocument()
  })

  // The backend would refuse an emptied workout: say it now, offer nothing
  // that can only fail.
  it('offers no Start for a workout with no exercises', async () => {
    program = () => json({ ...KNEE, exercises: KNEE.exercises.filter((exercise) => exercise.workoutId === B) })
    renderPage()
    await startForm()
    expect(
      screen.getByText('This workout has no exercises at the moment. Ask your practitioner to check your program.'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Start session' })).not.toBeInTheDocument()
    expect(screen.queryByRole('group')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to home' })).toHaveAttribute('href', '/patient')
  })
})

describe('StartSessionPage — starting', () => {
  it('sends the program, today, the workout — and no pain when not answered', async () => {
    const user = userEvent.setup()
    renderPage()
    await startForm()
    await user.click(screen.getByRole('button', { name: 'Start session' }))
    await screen.findByText('Session page 31')
    expect(posts()).toStrictEqual([
      {
        method: 'POST',
        path: '/sessions',
        body: '{"assignedProgramId":12,"localDate":"2031-06-12","workoutId":57}',
      },
    ])
  })

  it('sends the pain answer when given — 0 included', async () => {
    const user = userEvent.setup()
    renderPage()
    await startForm()
    await user.click(screen.getByRole('radio', { name: '0' }))
    await user.click(screen.getByRole('button', { name: 'Start session' }))
    await screen.findByText('Session page 31')
    expect(posts()[0].body).toBe(
      '{"assignedProgramId":12,"localDate":"2031-06-12","workoutId":57,"painBefore":0}',
    )
  })

  it('sends a changed mind as it ends: 7, then cleared → nothing', async () => {
    const user = userEvent.setup()
    renderPage()
    await startForm()
    await user.click(screen.getByRole('radio', { name: '7' }))
    await user.click(screen.getByRole('button', { name: /^Clear answer/ }))
    await user.click(screen.getByRole('button', { name: 'Start session' }))
    await screen.findByText('Session page 31')
    expect(posts()[0].body).toBe('{"assignedProgramId":12,"localDate":"2031-06-12","workoutId":57}')
  })

  it("sends a catch-up's missed workout, never a countsFor", async () => {
    todaySummary = () =>
      json(
        summary({
          days: [scheduledDay('2031-06-11', B, 'due')],
          nextWorkout: { workoutId: B, forDay: '2031-06-11', programWeek: null },
        }),
      )
    const user = userEvent.setup()
    renderPage()
    await startForm()
    await user.click(screen.getByRole('button', { name: 'Start session' }))
    await screen.findByText('Session page 31')
    expect(posts()[0].body).toBe('{"assignedProgramId":12,"localDate":"2031-06-12","workoutId":58}')
  })

  it("opens the session in place of this page (Back goes home), with the answer cached and the program's summaries stale", async () => {
    const user = userEvent.setup()
    const queryClient = renderPage()
    await startForm()
    // The home's summary entry (with `through`), as if the home had loaded.
    queryClient.setQueryData(assignedProgramSummaryQueryKey(12, TODAY, '2031-06-25'), DUE)
    await user.click(screen.getByRole('button', { name: 'Start session' }))
    await screen.findByText('Session page 31')

    // The session page reads the answer: no second request for it.
    expect(queryClient.getQueryData(sessionQueryKey(31))).toStrictEqual(session())
    // The home will say "In progress" when the patient comes back.
    expect(
      queryClient.getQueryState(assignedProgramSummaryQueryKey(12, TODAY, '2031-06-25'))?.isInvalidated,
    ).toBe(true)
    // …but not the program itself: starting changes nothing in it. (Read
    // as "asked for once": the page still shows it when the start
    // succeeds, so marking it stale would refetch it at once — and a
    // refetched entry is no longer marked stale by the time a test looks.)
    expect(requests().filter((request) => request.path === '/assigned-programs/12')).toHaveLength(1)

    await user.click(screen.getByRole('button', { name: 'Browser back' }))
    expect(await screen.findByText('Home page')).toBeInTheDocument()
  })

  it('shows it is starting, and takes no second tap meanwhile', async () => {
    let answer!: (response: Response) => void
    startAnswer = () => new Promise((resolve) => (answer = resolve))
    const user = userEvent.setup()
    renderPage()
    await startForm()
    await user.click(screen.getByRole('button', { name: 'Start session' }))
    const button = await screen.findByRole('button', { name: 'Starting…' })
    expect(button).toBeDisabled()
    for (const radio of screen.getAllByRole('radio')) expect(radio).toBeDisabled()
    answer(json(session(), 201))
    await screen.findByText('Session page 31')
    expect(posts()).toHaveLength(1)
  })

  it("shows the backend's reason when it refuses, and stays", async () => {
    startAnswer = () =>
      Promise.resolve(
        apiError(409, 'A session of this program is already in progress today: finish it or stop it first'),
      )
    const user = userEvent.setup()
    renderPage()
    await startForm()
    await user.click(screen.getByRole('button', { name: 'Start session' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      "Couldn't start the session. A session of this program is already in progress today: finish it or stop it first",
    )
    expect(screen.getByRole('button', { name: 'Start session' })).toBeEnabled()
    expect(screen.queryByText(/Session page/)).not.toBeInTheDocument()
  })

  it('says "Try again." for a server failure', async () => {
    startAnswer = () => Promise.resolve(apiError(500, 'Internal server error'))
    const user = userEvent.setup()
    renderPage()
    await startForm()
    await user.click(screen.getByRole('button', { name: 'Start session' }))
    expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't start the session. Try again.")
  })
})

// Found in the live check (2026-10-16): the page DECIDES from the summary —
// start, resume, or nothing — so it must decide from a fresh answer, never
// from the cache. Here the cache still holds a summary from earlier (a
// session open — since stopped), fresh by the cache's own clock; the server
// now says the day is due again.
describe('StartSessionPage — decides from a fresh answer', () => {
  it("asks again on every visit, and doesn't act on an outdated cached answer", async () => {
    const outdated = { ...DUE, openSession: { sessionId: 73, localDate: TODAY, workoutId: A } }
    renderPage('/patient/sessions/start/12', outdated)
    expect(await startForm()).toBeInTheDocument()
    expect(screen.queryByText('Session page 73')).not.toBeInTheDocument()
    expect(requests().map((request) => request.path)).toStrictEqual([
      `/assigned-programs/12/summary?today=${TODAY}`,
    ])
  })

  // Only the FIRST answer of a visit is waited for: a later refetch (the
  // window regaining focus, say) keeps the form — and the patient's answer.
  it("keeps the form and the patient's answer through a later refetch", async () => {
    const user = userEvent.setup()
    const queryClient = renderPage()
    await startForm()
    await user.click(screen.getByRole('radio', { name: '4' }))
    // The refetch is HELD: the form must stay while it's on its way.
    let answer!: (response: Response) => void
    fetchMock.mockImplementation(() => new Promise((resolve) => (answer = resolve)))
    const before = requests().length
    void queryClient.invalidateQueries({ queryKey: assignedProgramSummaryQueryKey(12, TODAY) })
    await vi.waitFor(() => expect(requests().length).toBe(before + 1))
    // Give the page time to render the fetch (TanStack Query tells
    // components a moment AFTER the request leaves) — a page that hid the
    // form while fetching would have done so by now.
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(screen.getByRole('heading', { name: 'Start your session' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: '4' })).toBeChecked()
    answer(json(DUE))
    await vi.waitFor(() => expect(screen.getByRole('radio', { name: '4' })).toBeChecked())
  })

  it('shows Loading, not the outdated answer, while it asks', async () => {
    let answer!: (response: Response) => void
    fetchMock.mockImplementation((input) => {
      const url = urlOf(input)
      if (/\/summary\?today=/.test(url)) return new Promise((resolve) => (answer = resolve))
      return Promise.reject(new Error(`unexpected request: ${url}`))
    })
    const outdated = { ...DUE, openSession: { sessionId: 73, localDate: TODAY, workoutId: A } }
    renderPage('/patient/sessions/start/12', outdated)
    expect(await screen.findByText('Loading…')).toBeInTheDocument()
    expect(screen.queryByText('Session page 73')).not.toBeInTheDocument()
    answer(json(DUE))
    expect(await startForm()).toBeInTheDocument()
  })
})

describe('StartSessionPage — nothing to start', () => {
  it("goes straight to today's open session, in place of this page", async () => {
    todaySummary = () =>
      json({ ...DUE, openSession: { sessionId: 44, localDate: TODAY, workoutId: A } })
    const user = userEvent.setup()
    renderPage()
    expect(await screen.findByText('Session page 44')).toBeInTheDocument()
    expect(posts()).toStrictEqual([])
    await user.click(screen.getByRole('button', { name: 'Browser back' }))
    expect(await screen.findByText('Home page')).toBeInTheDocument()
  })

  it.each<[string, Partial<ScheduleSummary>, string]>([
    ['done', { days: [scheduledDay(TODAY, A, 'done')] }, "Today's session is done."],
    [
      'paused',
      { pauses: [{ from: '2031-06-01', to: null }], days: [scheduledDay(TODAY, A, 'due')] },
      'This program is paused: there is nothing to do while your practitioner has paused it.',
    ],
    ['a day with nothing', { days: [scheduledDay('2031-06-13', A, 'upcoming')] }, 'There is no session to do today for this program.'],
  ])('says why when today is %s — no Start', async (_label, fields, text) => {
    todaySummary = () => json(summary(fields))
    renderPage()
    expect(await screen.findByText(text)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Knee Rehab' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Start session' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to home' })).toHaveAttribute('href', '/patient')
  })

  it("says a program it can't see isn't available — and asks nothing more", async () => {
    program = () => apiError(404, 'Assigned program not found')
    renderPage()
    expect(await screen.findByRole('alert')).toHaveTextContent("This program doesn't exist, or isn't yours.")
    expect(requests().map((request) => request.path)).toStrictEqual(['/assigned-programs/12'])
  })

  it('says so when loading fails for another reason', async () => {
    todaySummary = () => apiError(500, 'Internal server error')
    renderPage()
    expect(await screen.findByRole('alert')).toHaveTextContent(
      "Couldn't load this program. Try refreshing the page.",
    )
  })

  it('refuses an address that names no program, asking nothing', async () => {
    renderPage('/patient/sessions/start/abc')
    expect(await screen.findByRole('alert')).toHaveTextContent("This program doesn't exist, or isn't yours.")
    expect(requests()).toStrictEqual([])
  })
})