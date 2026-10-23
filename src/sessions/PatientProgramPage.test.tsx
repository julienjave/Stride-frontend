import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes, useLocation, useNavigate, useParams } from 'react-router'
import { currentUserQueryKey } from '@/auth/useCurrentUser'
import { formatCalendarDate } from '@/common/formatCalendarDate'
import { formatShortDate } from '@/common/calendarDate'
import type { AssignedProgramDetail, ScheduleSummary, ScheduleVersion } from '@/assigned-programs/types'
import { assignedProgramSummaryQueryKey } from '@/assigned-programs/api'
import { PatientProgramPage } from './PatientProgramPage'
import { A, B, KNEE, PAT, TODAY, apiError, json, programExercise, scheduledDay, session, summary, urlOf } from './testData'
import { expectLoadError, expectNotAvailable } from './notAvailableAssertions'

const fetchMock = vi.fn<typeof fetch>()
vi.stubGlobal('fetch', fetchMock)

// Today is Thursday 12 June 2031 (testData); the summary is read two weeks
// ahead, through Wednesday 25 June — the hub's and the home's key.
const THROUGH = '2031-06-25'

const MWF: ScheduleVersion = {
  id: 1,
  assignedProgramId: 12,
  type: 'weekdays',
  timesPerWeek: null,
  effectiveFrom: '2031-06-02',
  createdBy: 3,
  createdAt: '2031-06-01T10:00:00.000Z',
  days: [
    { weekday: 1, workoutId: A },
    { weekday: 3, workoutId: B },
    { weekday: 5, workoutId: A },
  ],
  rotation: [],
}

const PROGRAM: AssignedProgramDetail = {
  ...KNEE,
  schedules: [MWF],
  lateMakeUpDays: 14,
  exercises: [
    programExercise(1, A, 0, {
      name: 'Heel Slides',
      sets: 3,
      reps: 10,
      instructions: ['Lie on your back.', 'Slide the heel in.'],
      notes: 'Go gently on the left knee.',
      equipment: ['towel'],
      images: [{ url: 'https://storage.test/heel-1.jpg' }],
    }),
    programExercise(2, A, 1, { name: 'Squat', sets: 3, reps: 8, weight: 20, weightUnit: 'kg' }),
    programExercise(3, B, 0, { name: 'Bridge', sets: 2, reps: 12 }),
  ],
}

// Two program weeks (they start on Monday 2 June). Week 1: Monday 2's A
// missed (skipped for illness — session 20 — a skip has nothing to show),
// can still be made up LATE; Wednesday 4's B made up on Thursday 5 (session
// 21), after a session stopped for pain that day (22); Friday 6 done (23); an
// extra on Saturday 7 (25). Week 2 (this week): Monday 9 done (24);
// Wednesday 11's B still DUE — an on-time catch-up, today a free day; Friday
// 13 upcoming.
const SUMMARY: ScheduleSummary = summary({
  firstDay: '2031-06-02',
  lastDay: '2031-06-15',
  totals: { ...summary().totals, done: 2, madeUp: 1, missed: 1, extra: 1, skipped: 1, incomplete: 1 },
  days: [
    {
      ...scheduledDay('2031-06-02', A, 'missed'),
      attempts: [{ sessionId: 20, status: 'skipped', endReason: 'illness' }],
    },
    {
      ...scheduledDay('2031-06-04', B, 'made_up'),
      madeUpBy: { sessionId: 21, date: '2031-06-05' },
      attempts: [{ sessionId: 22, status: 'incomplete', endReason: 'pain' }],
    },
    { ...scheduledDay('2031-06-06', A, 'done'), sessionId: 23 },
    { ...scheduledDay('2031-06-09', A, 'done'), sessionId: 24 },
    scheduledDay('2031-06-11', B, 'due'),
    scheduledDay('2031-06-13', A, 'upcoming'),
  ],
  extraSessions: [{ sessionId: 25, date: '2031-06-07', reason: 'no_missed_day' }],
  nextWorkout: { workoutId: B, forDay: '2031-06-11', programWeek: null, until: '2031-06-12' },
  lateMakeUps: {
    days: [{ forDay: '2031-06-02', workoutId: A, until: '2031-06-14' }],
    blockedToday: null,
  },
})

let program: () => Response
let summaryAnswer: () => Response
let sessionsAnswer: () => Response

beforeEach(() => {
  fetchMock.mockReset()
  program = () => json(PROGRAM)
  summaryAnswer = () => json(SUMMARY)
  // The progress charts' list (PainAndMobility — its own tests cover it).
  sessionsAnswer = () => json([])
  fetchMock.mockImplementation((input) => {
    const url = urlOf(input)
    if (/\/assigned-programs\/12$/.test(url)) return Promise.resolve(program())
    if (/\/assigned-programs\/12\/summary\?/.test(url)) return Promise.resolve(summaryAnswer())
    if (url.endsWith('/assigned-programs/12/sessions')) return Promise.resolve(sessionsAnswer())
    return Promise.reject(new Error(`unexpected request: ${url}`))
  })
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2031, 5, 12, 12, 0))
})

afterEach(() => {
  vi.useRealTimers()
})

function renderPage(path = '/patient/sessions/programs/12', cachedSummary?: ScheduleSummary) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 30_000 } },
  })
  queryClient.setQueryData(currentUserQueryKey, PAT)
  // What the hub (or the home) left in the cache: the same key.
  if (cachedSummary) {
    queryClient.setQueryData(assignedProgramSummaryQueryKey(12, TODAY, THROUGH), cachedSummary)
  }
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/patient/sessions/programs/:programId" element={<PatientProgramPage />} />
          <Route path="/patient/sessions/:sessionId" element={<SessionStandIn />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

// The session page stands in: which session, the note it was opened with,
// and the browser's Back.
function SessionStandIn() {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  return (
    <>
      <p>Session page {sessionId}</p>
      <p>Opened with {JSON.stringify(useLocation().state)}</p>
      <button onClick={() => void navigate(-1)}>Browser back</button>
    </>
  )
}

function paths() {
  return fetchMock.mock.calls.map(([input]) => {
    const url = new URL(urlOf(input))
    return url.pathname + url.search
  })
}

async function loaded() {
  await screen.findByRole('heading', { name: 'Knee Rehab', level: 1 })
  await screen.findByRole('heading', { name: 'Progress' })
}

// Every link to a session, as [name, href] — the order they appear in.
function sessionLinks() {
  return screen
    .getAllByRole('link', { name: /^View session/ })
    .map((link) => [link.getAttribute('aria-label'), link.getAttribute('href')])
}

describe('PatientProgramPage — the program', () => {
  it('says what it is: title, dates and status, the schedule — reading the hub’s summary', async () => {
    renderPage()
    await loaded()
    expect(screen.getByText(`Started ${formatCalendarDate('2031-06-02')} · Active`)).toBeInTheDocument()
    expect(screen.getByText('Mon A · Wed B · Fri A')).toBeInTheDocument()
    await waitFor(() =>
      expect(paths()).toStrictEqual([
        '/assigned-programs/12',
        `/assigned-programs/12/summary?today=${TODAY}&through=${THROUGH}`,
        '/assigned-programs/12/sessions',
      ]),
    )
    expect(screen.getByRole('link', { name: 'Back to Sessions' })).toHaveAttribute(
      'href',
      '/patient/sessions',
    )
  })

  // Coming from the hub, the summary is already cached under the same key:
  // the page shows it without asking again.
  it("reuses the summary the hub cached — no second request", async () => {
    renderPage('/patient/sessions/programs/12', SUMMARY)
    await loaded()
    await waitFor(() =>
      expect(paths()).toStrictEqual(['/assigned-programs/12', '/assigned-programs/12/sessions']),
    )
  })

  // The scores over time (2026-10-18) inside "Progress", between the totals
  // and the weeks — the patient's words.
  it('shows pain and mobility between the totals and the weeks', async () => {
    const { exercises: _exercises, ...row } = session({
      id: 23,
      localDate: '2031-06-06',
      status: 'completed',
      painBefore: 5,
      painAfter: 3,
      mobilityAfter: 6,
    })
    sessionsAnswer = () => json([row])
    renderPage()
    await loaded()
    const progress = screen.getByRole('region', { name: 'Progress' })
    const scores = within(progress).getByRole('region', { name: 'Pain and mobility' })
    expect(within(scores).getByRole('heading', { name: 'Pain and mobility' }).tagName).toBe('H3')
    expect(await within(scores).findByRole('group', { name: 'Pain chart' })).toBeInTheDocument()
    const totals = within(progress).getByText('3 sessions done')
    const firstWeek = within(progress).getAllByText(/^Week \d · /)[0]
    expect(totals.compareDocumentPosition(scores) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(scores.compareDocumentPosition(firstWeek) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('tells the patient the scores come with the first session', async () => {
    renderPage()
    await loaded()
    expect(
      await screen.findByText('Your pain and mobility scores will show here after your first session.'),
    ).toBeInTheDocument()
  })

  it('lists what can still be made up, under its own h2', async () => {
    renderPage()
    await loaded()
    const region = screen.getByRole('region', { name: 'To make up' })
    expect(within(region).getByRole('heading', { name: 'To make up' }).tagName).toBe('H2')
    expect(within(region).getAllByRole('link')).toHaveLength(2)
  })

  it("shows the totals in the practitioner page's words", async () => {
    renderPage()
    await loaded()
    expect(screen.getByText('3 sessions done')).toBeInTheDocument()
    expect(screen.getByText('1 made up · 1 missed · 1 skipped · 1 not finished · 1 extra')).toBeInTheDocument()
  })
})

describe('PatientProgramPage — the weeks', () => {
  it('links every session that holds something to see — and never a skip', async () => {
    renderPage()
    await loaded()
    // This week first (open), then the earlier week; within a week, the
    // days in order, a day's stopped session before the one that counted.
    expect(sessionLinks()).toStrictEqual([
      [`View session of ${formatShortDate('2031-06-09')}`, '/patient/sessions/24'],
      [`View session of ${formatShortDate('2031-06-04')} (stopped)`, '/patient/sessions/22'],
      [`View session of ${formatShortDate('2031-06-04')}`, '/patient/sessions/21'],
      [`View session of ${formatShortDate('2031-06-06')}`, '/patient/sessions/23'],
      [`View session of ${formatShortDate('2031-06-07')} (extra)`, '/patient/sessions/25'],
    ])
    expect(document.querySelector('a[href="/patient/sessions/20"]')).toBeNull()
  })

  it('offers "Make it up today" on each missed day the summary offers — with its day', async () => {
    renderPage()
    await loaded()
    const offers = screen.getAllByRole('link', { name: /^Make it up today/ })
    expect(offers.map((link) => [link.getAttribute('aria-label'), link.getAttribute('href')])).toStrictEqual([
      [
        `Make it up today: B · Strength from ${formatShortDate('2031-06-11')}`,
        '/patient/sessions/start/12?for=2031-06-11',
      ],
      [
        `Make it up today: A · Mobility from ${formatShortDate('2031-06-02')}`,
        '/patient/sessions/start/12?for=2031-06-02',
      ],
    ])
    expect(offers.every((link) => link.textContent === 'Make it up today')).toBe(true)
  })

  // Blocked today: no button on the day rows — the "To make up" section
  // says why, with its disabled buttons.
  it('offers none on the days when today is blocked', async () => {
    summaryAnswer = () =>
      json({ ...SUMMARY, lateMakeUps: { ...SUMMARY.lateMakeUps, blockedToday: 'session_done_today' } })
    renderPage()
    await loaded()
    expect(screen.queryByRole('link', { name: /^Make it up today/ })).not.toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: 'To make up' })).getAllByRole('button')).not.toHaveLength(0)
  })
})

describe('PatientProgramPage — a past program', () => {
  it('is history only: how it ended, its sessions — nothing to make up', async () => {
    program = () => json({ ...PROGRAM, status: 'completed', endDate: '2031-06-11' })
    renderPage()
    await loaded()
    expect(
      screen.getByText(
        `Completed · ended ${formatCalendarDate('2031-06-11')} · ran from ${formatCalendarDate('2031-06-02')}`,
      ),
    ).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'To make up' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /^Make it up/ })).not.toBeInTheDocument()
    expect(sessionLinks()).toHaveLength(5)
  })
})

describe('PatientProgramPage — the exercises', () => {
  it('lists them workout by workout, with what each asks', async () => {
    renderPage()
    await loaded()
    const section = screen.getByRole('region', { name: 'Exercises' })
    expect(
      within(section)
        .getAllByRole('heading', { level: 3 })
        .map((heading) => heading.textContent),
    ).toStrictEqual(['A · Mobility', 'B · Strength'])
    // Pat prefers pounds: the prescription through WeightValue.
    expect(within(section).getByText('Squat').closest('summary')).toHaveTextContent(
      'Squat3 sets · 8 reps · 44.1 lbs (20 kg)',
    )
    expect(within(section).getByText('Bridge')).toBeInTheDocument()
  })

  it('opens one to show its photos, steps, the practitioner’s note and equipment', async () => {
    const user = userEvent.setup()
    renderPage()
    await loaded()
    const heel = screen.getByText('Heel Slides').closest('details')!
    expect(heel).not.toHaveAttribute('open')
    await user.click(within(heel).getByText('Heel Slides'))
    expect(heel).toHaveAttribute('open')
    const inside = within(heel)
    expect(inside.getAllByRole('listitem').map((item) => item.textContent)).toStrictEqual([
      'Lie on your back.',
      'Slide the heel in.',
    ])
    expect(inside.getByText('Go gently on the left knee.').closest('p')).toHaveTextContent(
      'From your practitioner: Go gently on the left knee.',
    )
    expect(inside.getByText('Equipment: towel')).toBeInTheDocument()
    expect(inside.getByRole('img')).toHaveAttribute('src', 'https://storage.test/heel-1.jpg')
  })

  it('names no workout when there is only one, and says when one is empty', async () => {
    program = () =>
      json({
        ...PROGRAM,
        workouts: [PROGRAM.workouts[0]],
        exercises: [],
      })
    renderPage()
    await loaded()
    const section = within(screen.getByRole('region', { name: 'Exercises' }))
    expect(section.queryByRole('heading', { level: 3 })).not.toBeInTheDocument()
    expect(section.getByText('No exercises at the moment.')).toBeInTheDocument()
  })
})

describe('PatientProgramPage — not available', () => {
  it("says a program it can't see isn't available — and asks nothing more", async () => {
    program = () => apiError(404, 'Not found')
    renderPage()
    await expectNotAvailable('program')
    expect(paths()).toStrictEqual(['/assigned-programs/12'])
  })

  it('refuses an address that names no program, asking nothing', async () => {
    renderPage('/patient/sessions/programs/abc')
    await expectNotAvailable('program')
    expect(paths()).toStrictEqual([])
  })

  it('says so when loading fails for another reason', async () => {
    program = () => apiError(500, 'Boom')
    renderPage()
    await expectLoadError('program')
  })

  it('"Try again" asks for the program again and shows it', async () => {
    const user = userEvent.setup()
    let fail = true
    program = () => (fail ? apiError(500, 'Boom') : json(PROGRAM))
    renderPage()
    await expectLoadError('program')
    fail = false
    await user.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByRole('heading', { name: 'Knee Rehab', level: 1 })).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it("keeps the program and its exercises when only the progress fails", async () => {
    summaryAnswer = () => apiError(500, 'Boom')
    renderPage()
    expect(await screen.findByText("Couldn't load the progress. Try refreshing.")).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Exercises' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Progress' })).not.toBeInTheDocument()
  })
})

// The round trip (2026-10-18): "View session" notes where it came from, and
// coming back reopens the week and puts focus back on the link.
describe('PatientProgramPage — back from a session', () => {
  const weekOne = () => screen.getByText(/^Week 1 · /).closest('details')!

  it('opens the session with a note of this program', async () => {
    const user = userEvent.setup()
    renderPage()
    await loaded()
    await user.click(screen.getByText(/^Week 1 · /))
    await user.click(screen.getByRole('link', { name: `View session of ${formatShortDate('2031-06-06')}` }))
    expect(screen.getByText('Session page 23')).toBeInTheDocument()
    expect(screen.getByText('Opened with {"from":"program","programId":12}')).toBeInTheDocument()
  })

  it('reopens the week the session was in, and focuses its link again', async () => {
    const user = userEvent.setup()
    renderPage()
    await loaded()
    // Week 1 (an earlier week) starts folded.
    expect(weekOne()).not.toHaveAttribute('open')
    await user.click(screen.getByText(/^Week 1 · /))
    await user.click(screen.getByRole('link', { name: `View session of ${formatShortDate('2031-06-06')}` }))
    await user.click(screen.getByRole('button', { name: 'Browser back' }))

    await loaded()
    expect(weekOne()).toHaveAttribute('open')
    expect(screen.getByRole('link', { name: `View session of ${formatShortDate('2031-06-06')}` })).toHaveFocus()
  })

  // A week on EACH side of the one reopened: started a week earlier (from
  // Monday 26 May) and covering a later week (to Sunday 22 June), so a rule
  // checking only one end of a week would reopen a neighbour too.
  it('reopens only the week the session was in', async () => {
    program = () => json({ ...PROGRAM, startDate: '2031-05-26' })
    summaryAnswer = () =>
      json({
        ...SUMMARY,
        firstDay: '2031-05-26',
        lastDay: '2031-06-22',
        days: [
          { ...scheduledDay('2031-05-28', B, 'done'), sessionId: 18 },
          ...SUMMARY.days,
          scheduledDay('2031-06-16', A, 'upcoming'),
        ],
      })
    const user = userEvent.setup()
    renderPage()
    await loaded()
    const week = (n: number) => screen.getByText(new RegExp(`^Week ${n} · `)).closest('details')!
    await user.click(screen.getByText(/^Week 2 · /))
    await user.click(screen.getByRole('link', { name: `View session of ${formatShortDate('2031-06-06')}` }))
    await user.click(screen.getByRole('button', { name: 'Browser back' }))

    await loaded()
    expect(week(2)).toHaveAttribute('open')
    expect(week(1)).not.toHaveAttribute('open')
    expect(week(4)).not.toHaveAttribute('open')
  })

  // A Ctrl-click opens a new tab: this page doesn't change (no note, no
  // week opened).
  it('notes nothing on a click that opens a new tab', async () => {
    renderPage()
    await loaded()
    fireEvent.click(
      screen.getByRole('link', { name: `View session of ${formatShortDate('2031-06-06')}` }),
      { ctrlKey: true },
    )
    expect(weekOne()).not.toHaveAttribute('open')
    expect(screen.queryByText(/^Session page/)).not.toBeInTheDocument()
  })
})