import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
import { currentUserQueryKey } from '@/auth/useCurrentUser'
import { formatShortDate } from '@/common/calendarDate'
import { expectLoadError, retryThenExpectFocusOn } from '@/common/loadFailureAssertions'
import type { AssignedProgramListItem, ScheduleSummary, ScheduledDay } from '@/assigned-programs/types'
import { PatientHomePage } from './PatientHomePage'
import { expectSkeleton } from '@/common/loadingAssertions'

const fetchMock = vi.fn<typeof fetch>()
vi.stubGlobal('fetch', fetchMock)

function urlOf(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input
  if (input instanceof URL) return input.toString()
  return input.url
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status })
}

// "Today" is Thursday 12 June 2031. The home reads two weeks ahead: today
// and the 13 days after, so `through` is Wednesday 25 June.
const TODAY = '2031-06-12'
const THROUGH = '2031-06-25'

const PAT = {
  id: 6,
  firstName: 'Pat',
  lastName: 'Lee',
  email: 'pat@example.com',
  avatarUrl: null,
  roles: ['patient'],
  activeRole: 'patient',
  preferredWeightUnit: 'kg',
}

function program(id: number, fields: Partial<AssignedProgramListItem> = {}): AssignedProgramListItem {
  return {
    id,
    patientId: 6,
    assignedBy: 3,
    basedOnTemplateId: null,
    basedOnProgramId: null,
    title: `Program ${id}`,
    startDate: '2031-06-02',
    endDate: null,
    status: 'active',
    isArchived: false,
    allowSwaps: true,
    lateMakeUpDays: null,
    schedules: [],
    assigner: { id: 3, firstName: 'Alex', lastName: 'Chen' },
    workouts: [{ id: 57, assignedProgramId: id, name: null, sortOrder: 0 }],
    ...fields,
  }
}

// Knee Rehab: two workouts, Mon/Wed/Fri, ends 29 June — today (Thursday)
// is a free day, Wednesday's B still to make up. Lower Back: one workout,
// 3 a week, open-ended, 1 of 3 done this week.
const KNEE = program(12, {
  title: 'Knee Rehab',
  endDate: '2031-06-29',
  workouts: [
    { id: 57, assignedProgramId: 12, name: 'Mobility', sortOrder: 0 },
    { id: 58, assignedProgramId: 12, name: 'Strength', sortOrder: 1 },
  ],
})
const BACK = program(14, {
  title: 'Lower Back',
  startDate: '2031-06-09',
  assigner: { id: 4, firstName: 'Sam', lastName: 'Okafor' },
  workouts: [{ id: 70, assignedProgramId: 14, name: null, sortOrder: 0 }],
})

function day(date: string, workoutId: number, state: ScheduledDay['state']): ScheduledDay {
  return {
    date,
    workoutId,
    state,
    sessionId: null,
    madeUpBy: null,
    madeUpLateBy: null,
    doneEarlyBy: null,
    swappedBy: null,
    attempts: [],
  }
}

const TOTALS = {
  expected: null,
  done: 0,
  madeUp: 0,
  madeUpLate: 0,
  doneEarly: 0,
  swapped: 0,
  missed: 0,
  extra: 0,
  skipped: 0,
  incomplete: 0,
}

function summary(fields: Partial<ScheduleSummary>): ScheduleSummary {
  return {
    firstDay: '2031-06-02',
    lastDay: THROUGH,
    today: TODAY,
    totals: TOTALS,
    days: [],
    weeks: [],
    extraSessions: [],
    otherAttempts: [],
    pauses: [],
    nextWorkout: null,
    openSession: null,
    lateMakeUps: { days: [], blockedToday: null },
    ...fields,
  }
}

const KNEE_SUMMARY = summary({
  totals: { ...TOTALS, expected: 12, done: 3, madeUp: 1 },
  days: [
    day('2031-06-09', 57, 'done'),
    day('2031-06-11', 58, 'due'),
    day('2031-06-13', 57, 'upcoming'),
    day('2031-06-16', 57, 'upcoming'),
    day('2031-06-18', 58, 'upcoming'),
  ],
  nextWorkout: { workoutId: 58, forDay: '2031-06-11', programWeek: null, until: '2031-06-12' },
})

const BACK_SUMMARY = summary({
  totals: { ...TOTALS, done: 1 },
  weeks: [
    {
      programWeek: 1,
      start: '2031-06-09',
      end: '2031-06-15',
      timesPerWeek: 3,
      target: 3,
      workouts: [
        { workoutId: 70, sessionId: 31, date: '2031-06-10' },
        { workoutId: 70, sessionId: null, date: null },
        { workoutId: 70, sessionId: null, date: null },
      ],
      done: 1,
      state: 'in_progress',
      sessionIds: [31],
      attempts: [],
    },
  ],
  nextWorkout: { workoutId: 70, forDay: null, programWeek: 1, until: null },
})

// What each GET answers — tests replace entries for their case.
let list: () => Response
// (A promise too: a summary that never answers, for the loading states.)
let summaries: Record<number, () => Response | Promise<Response>>
// Each program's session list (the cards' pain trend — PainTrend's own
// tests cover it): none by default.
let sessionLists: Record<number, () => Response>

beforeEach(() => {
  fetchMock.mockReset()
  list = () => json([KNEE, BACK])
  summaries = { 12: () => json(KNEE_SUMMARY), 14: () => json(BACK_SUMMARY) }
  sessionLists = { 12: () => json([]), 14: () => json([]) }
  fetchMock.mockImplementation((input) => {
    const url = urlOf(input)
    if (url.endsWith('/assigned-programs')) return Promise.resolve(list())
    const sessions = /\/assigned-programs\/(\d+)\/sessions$/.exec(url)
    if (sessions) return Promise.resolve(sessionLists[Number(sessions[1])]())
    const one = /\/assigned-programs\/(\d+)\/summary\?/.exec(url)
    if (one) return Promise.resolve(summaries[Number(one[1])]())
    return Promise.reject(new Error(`unexpected request: ${url}`))
  })
  // Only Date is faked: Thursday 12 June 2031, at noon local time.
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2031, 5, 12, 12, 0))
})

afterEach(() => {
  vi.useRealTimers()
})

function renderPage(state: unknown = null) {
  // staleTime as in the app (deep-dive §8).
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 30_000 } },
  })
  queryClient.setQueryData(currentUserQueryKey, PAT)
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[{ pathname: '/patient', state }]}>
        <PatientHomePage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

function requested() {
  return fetchMock.mock.calls.map(([input]) => urlOf(input))
}

// A section by its heading's name.
function section(name: string) {
  return screen.getByRole('heading', { name }).closest('section') as HTMLElement
}

async function loaded() {
  // Every loading state (a status region saying "Loading …") is gone once
  // every summary is in.
  expect(await screen.findByRole('heading', { name: 'My programs' })).toBeInTheDocument()
  await vi.waitFor(() =>
    expect(screen.queryAllByRole('status').filter((region) => region.textContent?.startsWith('Loading'))).toEqual([]),
  )
}

describe('PatientHomePage — what it asks for', () => {
  it("asks for the patient's programs, then each active one's summary as of today, two weeks ahead", async () => {
    renderPage()
    await loaded()
    const paths = () => requested().map((url) => new URL(url).pathname + new URL(url).search)
    // The list first; then, in whatever order the cards ask, each active
    // program's summary — and its sessions, for the card's pain trend
    // (2026-10-18).
    await vi.waitFor(() => expect(paths()).toHaveLength(5))
    expect(paths()[0]).toBe('/assigned-programs')
    expect(paths().slice(1).sort()).toStrictEqual([
      '/assigned-programs/12/sessions',
      `/assigned-programs/12/summary?today=${TODAY}&through=${THROUGH}`,
      '/assigned-programs/14/sessions',
      `/assigned-programs/14/summary?today=${TODAY}&through=${THROUGH}`,
    ])
  })

  it('shows and asks nothing about a closed program', async () => {
    list = () => json([KNEE, program(20, { title: 'Old Program', status: 'completed' })])
    renderPage()
    await loaded()
    expect(requested().filter((url) => url.includes('/20/'))).toStrictEqual([])
    expect(screen.queryByText('Old Program')).not.toBeInTheDocument()
  })
})

describe('PatientHomePage — Today', () => {
  it("says today's date, and what each program asks today", async () => {
    renderPage()
    await loaded()
    const today = section('Today')
    expect(within(today).getByText('Thursday, June 12')).toBeInTheDocument()
    const rows = within(today).getAllByRole('listitem')
    expect(rows.map((row) => row.textContent)).toStrictEqual([
      "Knee RehabCatch up: Wednesday's B · StrengthNot done yet — you can still make it up today.Start",
      `Lower Back1 of 3 done this weekThis week runs ${formatShortDate('2031-06-09')} – ${formatShortDate('2031-06-15')}.Start`,
    ])
  })

  it('leaves out a program with nothing today, and says when none has anything', async () => {
    summaries[12] = () => json({ ...KNEE_SUMMARY, nextWorkout: null })
    renderPage()
    await loaded()
    expect(within(section('Today')).getAllByRole('listitem')).toHaveLength(1)
    expect(within(section('Today')).queryByText('Nothing to do today.')).not.toBeInTheDocument()

    summaries[14] = () => json(summary({}))
    // A fresh page (its own cache): both programs now have nothing today.
    cleanup()
    renderPage()
    await loaded()
    expect(within(section('Today')).getByText('Nothing to do today.')).toBeInTheDocument()
    expect(within(section('Today')).queryByRole('list')).not.toBeInTheDocument()
  })

  it("says so when a program's summary can't be loaded — and still shows the others", async () => {
    summaries[12] = () => json({ statusCode: 500, message: ['boom'] }, 500)
    renderPage()
    await loaded()
    const rows = within(section('Today')).getAllByRole('listitem')
    expect(rows[0]).toHaveTextContent(/^Knee Rehab/)
    expect(within(rows[0]).getByRole('alert')).toHaveTextContent(
      /^Couldn't load today's plan\. Something went wrong on our side\. Try again in a moment\.$/,
    )
    expect(rows[1]).toHaveTextContent('Lower Back1 of 3 done this week')
  })

  it('"Try again" on that row asks for ITS summary only; once it works, focus goes to Today', async () => {
    const user = userEvent.setup()
    const good = summaries[12]
    summaries[12] = () => json({ statusCode: 500, message: ['boom'] }, 500)
    renderPage()
    await loaded()
    const failedRow = within(section('Today')).getAllByRole('listitem')[0]
    await within(failedRow).findByRole('alert')
    const asked = () => requested().filter((url) => url.includes('/summary?'))
    const before = asked()
    summaries[12] = good
    await user.click(within(failedRow).getByRole('button', { name: 'Try again' }))
    const heading = within(section('Today')).getByRole('heading', { name: 'Today' })
    await waitFor(() => expect(heading).toHaveFocus())
    expect(within(section('Today')).queryByRole('alert')).not.toBeInTheDocument()
    // One more request: the failed program's summary, not the other's.
    expect(asked().slice(before.length)).toStrictEqual([before.find((url) => url.includes('/12/'))])
  })
})

// The session flow's way in (2026-10-16): a button on each row that can
// act, leading to the start page — never a write from the home itself.
describe('PatientHomePage — Start and Resume', () => {
  function todayRows() {
    return within(section('Today')).getAllByRole('listitem')
  }

  it("offers Start on a row that asks for a session — to that program's start page, named with it", async () => {
    renderPage()
    await loaded()
    // Knee Rehab: a catch-up; Lower Back: a weekly count.
    const [knee, back] = todayRows()
    expect(within(knee).getByRole('link', { name: 'Start Knee Rehab' })).toHaveAttribute(
      'href',
      '/patient/sessions/start/12',
    )
    expect(within(back).getByRole('link', { name: 'Start Lower Back' })).toHaveAttribute(
      'href',
      '/patient/sessions/start/14',
    )
    // Nothing was written: the home only reads.
    expect(fetchMock.mock.calls.every(([, init]) => (init?.method ?? 'GET') === 'GET')).toBe(true)
  })

  it("offers Start — and Skip today — on today's scheduled day", async () => {
    summaries[12] = () =>
      json({ ...KNEE_SUMMARY, days: [day(TODAY, 57, 'due')], nextWorkout: null })
    renderPage()
    await loaded()
    expect(within(todayRows()[0]).getByRole('link', { name: 'Start Knee Rehab' })).toBeInTheDocument()
    expect(within(todayRows()[0]).getByRole('link', { name: 'Skip today: Knee Rehab' })).toHaveAttribute(
      'href',
      '/patient/sessions/skip/12',
    )
  })

  // Only a DUE scheduled day can be skipped (the backend's rule).
  it('offers Skip today on no other row (a catch-up, a weekly count, a session open)', async () => {
    renderPage()
    await loaded()
    // Knee: a catch-up; Lower Back: a weekly count.
    expect(within(section('Today')).queryByRole('link', { name: /^Skip today/ })).not.toBeInTheDocument()
  })

  it("offers Resume — not Start — for today's open session, to that session", async () => {
    summaries[12] = () =>
      json({ ...KNEE_SUMMARY, openSession: { sessionId: 31, localDate: TODAY, workoutId: 58 } })
    renderPage()
    await loaded()
    const knee = todayRows()[0]
    expect(knee).toHaveTextContent('In progress: B · Strength')
    expect(within(knee).getByRole('link', { name: 'Resume Knee Rehab' })).toHaveAttribute(
      'href',
      '/patient/sessions/31',
    )
    expect(within(knee).queryByRole('link', { name: /^Start/ })).not.toBeInTheDocument()
  })

  it('offers nothing on a row with nothing to start (done today)', async () => {
    summaries[12] = () =>
      json({ ...KNEE_SUMMARY, days: [day(TODAY, 57, 'done')], nextWorkout: null })
    renderPage()
    await loaded()
    const knee = todayRows()[0]
    expect(knee).toHaveTextContent('Done for today')
    expect(within(knee).queryByRole('link')).not.toBeInTheDocument()
  })

  it('offers nothing on a row whose summary failed', async () => {
    summaries[12] = () => json({ statusCode: 500, message: ['boom'] }, 500)
    renderPage()
    await loaded()
    expect(within(todayRows()[0]).queryByRole('link')).not.toBeInTheDocument()
  })

  // A session left open on an EARLIER day: no Resume (it can't be finished
  // any more), one sentence — under today's own row when there is one…
  it("says a session was left open on an earlier day — beside today's Start, with no Resume", async () => {
    summaries[12] = () =>
      json({ ...KNEE_SUMMARY, openSession: { sessionId: 29, localDate: '2031-06-09', workoutId: 57 } })
    renderPage()
    await loaded()
    const knee = todayRows()[0]
    // A line of its own, after the row's own detail — never instead of it.
    const lines = within(knee).getAllByRole('paragraph').map((line) => line.textContent)
    expect(lines).toStrictEqual([
      'Knee Rehab',
      "Catch up: Wednesday's B · Strength",
      'Not done yet — you can still make it up today.',
      `Your session of ${formatShortDate('2031-06-09')} was left open. It can no longer be finished, and will be kept as not finished.`,
    ])
    expect(within(knee).getAllByRole('link').map((link) => link.getAttribute('href'))).toStrictEqual([
      '/patient/sessions/start/12',
    ])
  })

  // … or as a row of its own when today asks nothing of that program.
  it('says it in a row of its own when nothing is asked today', async () => {
    summaries[12] = () =>
      json({
        ...KNEE_SUMMARY,
        nextWorkout: null,
        openSession: { sessionId: 29, localDate: '2031-06-09', workoutId: 57 },
      })
    renderPage()
    await loaded()
    const knee = todayRows()[0]
    expect(knee.textContent).toBe(
      `Knee RehabYour session of ${formatShortDate('2031-06-09')} was left open. It can no longer be finished, and will be kept as not finished.`,
    )
  })
})

// After an ending (pass (c)): the confirmation handed over in navigation
// state, read defensively.
describe('PatientHomePage — the confirmation after an ending', () => {
  it('shows the notice it was handed', async () => {
    renderPage({ notice: 'Session finished. Well done!' })
    await loaded()
    expect(screen.getByRole('status')).toHaveTextContent('Session finished. Well done!')
  })

  it('shows none without one', async () => {
    renderPage({ from: '/elsewhere' })
    await loaded()
    expect(screen.queryByText(/Well done/)).not.toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })
})

describe('PatientHomePage — Upcoming', () => {
  it('lists the soonest days across programs, then what the weeks still need', async () => {
    renderPage()
    await loaded()
    const rows = within(section('Upcoming')).getAllByRole('listitem')
    expect(rows.map((row) => row.textContent)).toStrictEqual([
      `${formatShortDate('2031-06-13')}Knee Rehab: A · Mobility`,
      `${formatShortDate('2031-06-16')}Knee Rehab: A · Mobility`,
      `${formatShortDate('2031-06-18')}Knee Rehab: B · Strength`,
      `By ${formatShortDate('2031-06-15')}Lower Back: 1 more this week`,
    ])
  })

  it('names no workout for a program with only one', async () => {
    list = () => json([program(12, { title: 'Knee Rehab', endDate: '2031-06-29' })])
    summaries[12] = () =>
      json({ ...KNEE_SUMMARY, days: [day('2031-06-13', 57, 'upcoming')], nextWorkout: null })
    renderPage()
    await loaded()
    expect(within(section('Upcoming')).getByRole('listitem').textContent).toBe(
      `${formatShortDate('2031-06-13')}Knee Rehab`,
    )
  })

  it('says when nothing is planned', async () => {
    list = () => json([BACK])
    summaries[14] = () => json(summary({}))
    renderPage()
    await loaded()
    expect(within(section('Upcoming')).getByText('Nothing planned in the next two weeks.')).toBeInTheDocument()
  })

  it('leaves out a program whose summary failed', async () => {
    summaries[14] = () => json({ statusCode: 500, message: ['boom'] }, 500)
    renderPage()
    await loaded()
    expect(within(section('Upcoming')).getAllByRole('listitem')).toHaveLength(3)
  })
})

describe('PatientHomePage — My programs', () => {
  it('shows each program, who assigned it, and how it is going', async () => {
    renderPage()
    await loaded()
    const cards = within(section('My programs')).getAllByRole('listitem')
    expect(within(cards[0]).getByRole('heading', { level: 3, name: 'Knee Rehab' })).toBeInTheDocument()
    expect(cards[0]).toHaveTextContent('From Alex Chen')
    expect(cards[0]).toHaveTextContent('4 of 12 sessions done')
    // A bar with an end date: 4 fulfilled (3 done + 1 made up) of 12.
    const bar = within(cards[0]).getByRole('progressbar', { name: 'Knee Rehab progress' })
    expect(bar).toHaveAttribute('aria-valuenow', '4')
    expect(bar).toHaveAttribute('aria-valuemax', '12')
    expect((bar.firstElementChild as HTMLElement).style.width).toBe(`${(4 / 12) * 100}%`)

    // Open-ended: a count, no bar.
    expect(cards[1]).toHaveTextContent('From Sam Okafor')
    expect(cards[1]).toHaveTextContent('1 session done')
    expect(within(cards[1]).queryByRole('progressbar')).not.toBeInTheDocument()
  })

  // Each card leads to the program's own page (the hub's pass 2), named
  // with its program.
  it('links each program to its page', async () => {
    renderPage()
    await loaded()
    const links = within(section('My programs')).getAllByRole('link', { name: /^View program/ })
    expect(links.map((link) => [link.getAttribute('aria-label'), link.getAttribute('href')])).toStrictEqual([
      ['View program: Knee Rehab', '/patient/sessions/programs/12'],
      ['View program: Lower Back', '/patient/sessions/programs/14'],
    ])
  })

  it('never draws the bar past full', async () => {
    summaries[12] = () =>
      json({ ...KNEE_SUMMARY, totals: { ...TOTALS, expected: 2, done: 3 } })
    renderPage()
    await loaded()
    const bar = within(section('My programs')).getByRole('progressbar')
    expect((bar.firstElementChild as HTMLElement).style.width).toBe('100%')
  })

  // The pain trend (2026-10-18) on the card of the program it belongs to —
  // and only there: never mixed across programs (decisions §6).
  it("shows each program's own pain trend", async () => {
    sessionLists[12] = () =>
      json(
        [5, 4, 4, 2, 2, 3]
          .map((painAfter, i) => ({
            id: i + 1,
            assignedProgramId: 12,
            workoutId: 70,
            patientId: 6,
            localDate: `2031-06-0${i + 1}`,
            countsFor: null,
            status: 'completed',
            startedAt: null,
            completedAt: null,
            endedAt: null,
            endReason: null,
            endNote: null,
            painBefore: null,
            painAfter,
            mobilityAfter: null,
            totalDurationInSeconds: null,
            sessionFeedback: null,
          }))
          .reverse(),
      )
    renderPage()
    await loaded()
    const cards = within(section('My programs')).getAllByRole('listitem')
    expect(
      await within(cards[0]).findByText(`Pain after sessions: 3 (${formatShortDate('2031-06-06')})`),
    ).toBeInTheDocument()
    expect(cards[0]).toHaveTextContent('lower over your last 3 sessions')
    expect(cards[1]).not.toHaveTextContent('Pain after sessions')
  })

  it("a program whose summary failed: its card shows no progress — Today says it failed, once", async () => {
    summaries[14] = () => json({ statusCode: 500, message: ['boom'] }, 500)
    renderPage()
    await loaded()
    const cards = within(section('My programs')).getAllByRole('listitem')
    expect(within(cards[1]).queryByRole('alert')).not.toBeInTheDocument()
    expect(cards[1]).not.toHaveTextContent(/sessions? done/)
    expect(within(section('Today')).getAllByRole('alert')).toHaveLength(1)
  })
})

describe('PatientHomePage — no program', () => {
  it('greets the patient and explains an empty home', async () => {
    list = () => json([])
    renderPage()
    expect(screen.getByRole('heading', { name: 'Hello Pat,' })).toBeInTheDocument()
    expect(
      await screen.findByText(
        "You don't have a program yet. When your practitioner assigns you one, your sessions will show here.",
      ),
    ).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Today' })).not.toBeInTheDocument()
  })

  it('treats a list of closed programs as none', async () => {
    list = () => json([program(20, { status: 'cancelled' })])
    renderPage()
    expect(await screen.findByText(/You don't have a program yet/)).toBeInTheDocument()
  })

  it("says so when the programs can't be loaded; a retry that works focuses the greeting", async () => {
    const user = userEvent.setup()
    const good = list
    list = () => json({ statusCode: 500, message: ['boom'] }, 500)
    renderPage()
    await expectLoadError('your programs')
    list = good
    await retryThenExpectFocusOn(user, { level: 1, name: 'Hello Pat,' })
    await loaded()
  })

  it('says it is loading meanwhile', () => {
    // An answer that never comes.
    fetchMock.mockImplementation(() => new Promise<Response>(() => {}))
    renderPage()
    expectSkeleton('Loading your programs…')
  })

  // The list is in, the summaries aren't: each program's Today row, the
  // Upcoming list and each card's progress are skeletons — the titles
  // already known stay as text.
  it('while the summaries load: a skeleton per Today row, for Upcoming, and per card', async () => {
    summaries = { 12: () => new Promise<Response>(() => {}), 14: () => new Promise<Response>(() => {}) }
    renderPage()
    const today = await screen.findByRole('heading', { name: 'Today' })
    const todaySection = today.closest('section') as HTMLElement
    expectSkeleton("Loading today's plan for Knee Rehab…", todaySection)
    expectSkeleton("Loading today's plan for Lower Back…", todaySection)
    expect(within(todaySection).getAllByText('Knee Rehab', { selector: 'p' })).toHaveLength(1)
    expectSkeleton("Loading what's coming up…", section('Upcoming'))
    expectSkeleton('Loading the progress of Knee Rehab…', section('My programs'))
    expectSkeleton('Loading the progress of Lower Back…', section('My programs'))
  })
})

describe('PatientHomePage — late make-ups', () => {
  // Knee Rehab, Thursday 12: Monday 2's A and Wednesday 4's B were missed
  // and their windows have closed; late make-ups are allowed.
  const LATE_DAYS = [
    { forDay: '2031-06-02', workoutId: 57, until: '2031-06-14' },
    { forDay: '2031-06-04', workoutId: 58, until: '2031-06-16' },
  ]
  const FREE_DAY = summary({
    days: [day('2031-06-02', 57, 'missed'), day('2031-06-04', 58, 'missed'), day('2031-06-13', 57, 'upcoming')],
    nextWorkout: { workoutId: 57, forDay: '2031-06-13', programWeek: null, until: null },
    lateMakeUps: { days: LATE_DAYS, blockedToday: null },
  })

  function kneeRow() {
    return within(section('Today')).getAllByRole('listitem')[0]
  }

  it('offers the oldest with "Make it up", to the start page', async () => {
    summaries[12] = () => json(FREE_DAY)
    renderPage()
    await loaded()
    expect(kneeRow().textContent).toBe(
      `Knee RehabMake up: A · Mobility from ${formatShortDate('2031-06-02')}` +
        `Missed — you can still make it up today, or on another free day until ${formatShortDate('2031-06-14')}.` +
        'Make it up',
    )
    expect(within(kneeRow()).getByRole('link', { name: 'Make it up Knee Rehab' })).toHaveAttribute(
      'href',
      '/patient/sessions/start/12',
    )
  })

  // The late ones are allowed today too (2026-10-17): the home suggests the
  // on-time catch-up with its button, and says the others are there.
  it('suggests the on-time catch-up, and says late ones are possible too', async () => {
    summaries[12] = () =>
      json({ ...KNEE_SUMMARY, lateMakeUps: { days: LATE_DAYS, blockedToday: null } })
    renderPage()
    await loaded()
    const row = kneeRow()
    expect(row).toHaveTextContent("Catch up: Wednesday's B · Strength")
    expect(
      within(row).getByText(
        `You can also make up A · Mobility from ${formatShortDate('2031-06-02')} late, until ${formatShortDate('2031-06-14')}. 1 other missed session can be made up too.`,
      ),
    ).toBeInTheDocument()
    // The catch-up's own Start — the only button.
    expect(within(row).getAllByRole('link').map((link) => link.textContent)).toStrictEqual(['Start'])
  })

  // Nothing asked today, two things to say: the first becomes the row's
  // line, the second stays under it.
  it('keeps both notes on a row with nothing asked today (a session left open, one waiting)', async () => {
    summaries[12] = () =>
      json({
        ...FREE_DAY,
        openSession: { sessionId: 40, localDate: '2031-06-11', workoutId: 58 },
        lateMakeUps: { days: [LATE_DAYS[0]], blockedToday: 'session_done_today' },
      })
    renderPage()
    await loaded()
    expect(kneeRow().textContent).toBe(
      `Knee RehabYour session of ${formatShortDate('2031-06-11')} was left open. It can no longer be finished, and will be kept as not finished.` +
        `You can still make up A · Mobility from ${formatShortDate('2031-06-02')} on another free day, until ${formatShortDate('2031-06-14')}.`,
    )
  })

  it('says one waits on a day with nothing else to say (a session already done today)', async () => {
    summaries[12] = () =>
      json({ ...FREE_DAY, lateMakeUps: { days: [LATE_DAYS[0]], blockedToday: 'session_done_today' } })
    renderPage()
    await loaded()
    expect(kneeRow().textContent).toBe(
      `Knee RehabYou can still make up A · Mobility from ${formatShortDate('2031-06-02')} on another free day, until ${formatShortDate('2031-06-14')}.`,
    )
    expect(within(kneeRow()).queryByRole('link')).not.toBeInTheDocument()
  })
})