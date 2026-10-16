import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
import { currentUserQueryKey } from '@/auth/useCurrentUser'
import { formatShortDate } from '@/common/calendarDate'
import type { AssignedProgramListItem, ScheduleSummary, ScheduledDay } from '@/assigned-programs/types'
import { PatientHomePage } from './PatientHomePage'

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
    doneEarlyBy: null,
    swappedBy: null,
    attempts: [],
  }
}

const TOTALS = {
  expected: null,
  done: 0,
  madeUp: 0,
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
  nextWorkout: { workoutId: 58, forDay: '2031-06-11', programWeek: null },
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
  nextWorkout: { workoutId: 70, forDay: null, programWeek: 1 },
})

// What each GET answers — tests replace entries for their case.
let list: () => Response
let summaries: Record<number, () => Response>

beforeEach(() => {
  fetchMock.mockReset()
  list = () => json([KNEE, BACK])
  summaries = { 12: () => json(KNEE_SUMMARY), 14: () => json(BACK_SUMMARY) }
  fetchMock.mockImplementation((input) => {
    const url = urlOf(input)
    if (url.endsWith('/assigned-programs')) return Promise.resolve(list())
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

function renderPage() {
  // staleTime as in the app (deep-dive §8).
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 30_000 } },
  })
  queryClient.setQueryData(currentUserQueryKey, PAT)
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
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
  // "Loading…" disappears once every summary is in.
  expect(await screen.findByRole('heading', { name: 'My programs' })).toBeInTheDocument()
  await vi.waitFor(() => expect(screen.queryByText('Loading…')).not.toBeInTheDocument())
}

describe('PatientHomePage — what it asks for', () => {
  it("asks for the patient's programs, then each active one's summary as of today, two weeks ahead", async () => {
    renderPage()
    await loaded()
    expect(requested()).toStrictEqual([
      expect.stringMatching(/\/assigned-programs$/),
      expect.stringMatching(new RegExp(`/assigned-programs/12/summary\\?today=${TODAY}&through=${THROUGH}$`)),
      expect.stringMatching(new RegExp(`/assigned-programs/14/summary\\?today=${TODAY}&through=${THROUGH}$`)),
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
    expect(rows[0]).toHaveTextContent("Knee RehabCouldn't load today's plan. Try refreshing.")
    expect(rows[1]).toHaveTextContent('Lower Back1 of 3 done this week')
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

  it("offers Start on today's scheduled day", async () => {
    summaries[12] = () =>
      json({ ...KNEE_SUMMARY, days: [day(TODAY, 57, 'due')], nextWorkout: null })
    renderPage()
    await loaded()
    expect(within(todayRows()[0]).getByRole('link', { name: 'Start Knee Rehab' })).toBeInTheDocument()
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

  it('never draws the bar past full', async () => {
    summaries[12] = () =>
      json({ ...KNEE_SUMMARY, totals: { ...TOTALS, expected: 2, done: 3 } })
    renderPage()
    await loaded()
    const bar = within(section('My programs')).getByRole('progressbar')
    expect((bar.firstElementChild as HTMLElement).style.width).toBe('100%')
  })

  it("says so when a program's progress can't be loaded", async () => {
    summaries[14] = () => json({ statusCode: 500, message: ['boom'] }, 500)
    renderPage()
    await loaded()
    const cards = within(section('My programs')).getAllByRole('listitem')
    expect(cards[1]).toHaveTextContent("Couldn't load the progress. Try refreshing.")
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

  it("says so when the programs can't be loaded", async () => {
    list = () => json({ statusCode: 500, message: ['boom'] }, 500)
    renderPage()
    expect(
      await screen.findByText("Couldn't load your programs. Try refreshing the page."),
    ).toBeInTheDocument()
  })

  it('says it is loading meanwhile', () => {
    // An answer that never comes.
    fetchMock.mockImplementation(() => new Promise<Response>(() => {}))
    renderPage()
    expect(screen.getByText('Loading your programs…')).toBeInTheDocument()
  })
})