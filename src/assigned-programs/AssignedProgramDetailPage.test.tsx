import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router'
import { currentUserQueryKey } from '@/auth/useCurrentUser'
import { formatShortDate } from '@/common/calendarDate'
import { formatCalendarDate } from '@/common/formatCalendarDate'
import { assignedProgramQueryKey, assignedProgramSummaryQueryKey } from './api'
import { AssignedProgramDetailPage } from './AssignedProgramDetailPage'
import type { AssignedProgramDetail, ScheduleSummary, ScheduleVersion } from './types'

const fetchMock = vi.fn<typeof fetch>()
vi.stubGlobal('fetch', fetchMock)

// A fetch call's URL as a string — see CreateUserPage.test.tsx on why
// String(input) would be wrong for a Request object.
function urlOf(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input
  if (input instanceof URL) return input.toString()
  return input.url
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status })
}

function apiError(statusCode: number, message: string) {
  return json({ statusCode, message: [message], error: 'Error' }, statusCode)
}

// "Today" is Thursday 12 June 2031 (far from the real today). The program
// started on Monday 2 June: week 1 is 2–8 June, week 2 (this week) 9–15.
const TODAY = '2031-06-12'
const ME = { id: 3, firstName: 'Alex', lastName: 'Chen' }

const PATIENT = {
  id: 6,
  firstName: 'Pat',
  lastName: 'Lee',
  email: 'pat@example.com',
  avatarUrl: null,
  roles: ['patient'],
  isActive: true,
  patientProfile: { dateOfBirth: '1988-04-12' },
  clinics: [{ id: 1, name: 'Riverside Physio' }],
}

function version(id: number, effectiveFrom: string, fields: Partial<ScheduleVersion> = {}) {
  return {
    id,
    assignedProgramId: 12,
    type: 'weekdays',
    timesPerWeek: null,
    effectiveFrom,
    createdBy: ME.id,
    createdAt: `${effectiveFrom}T08:00:00.000Z`,
    days: [
      { weekday: 1, workoutId: 57 },
      { weekday: 3, workoutId: 58 },
      { weekday: 5, workoutId: 57 },
    ],
    rotation: [],
    ...fields,
  } satisfies ScheduleVersion
}

function exercise(id: number, workoutId: number, name: string, fields: object = {}) {
  return {
    id,
    assignedProgramId: 12,
    workoutId,
    exerciseId: id,
    name,
    primaryMuscles: ['hamstrings'],
    secondaryMuscles: [],
    equipment: [],
    instructions: [],
    sets: 3,
    reps: 10,
    durationInSeconds: null,
    weight: null,
    weightUnit: null,
    sortOrder: 0,
    notes: null,
    retiredAt: null,
    retiredBy: null,
    ...fields,
  }
}

const PROGRAM: AssignedProgramDetail = {
  id: 12,
  patientId: 6,
  assignedBy: ME.id,
  basedOnTemplateId: 1,
  basedOnProgramId: null,
  title: 'Knee Rehab — Pat',
  startDate: '2031-06-02',
  endDate: null,
  status: 'active',
  isArchived: false,
  allowSwaps: true,
  schedules: [version(1, '2031-06-02')],
  workouts: [
    { id: 57, assignedProgramId: 12, name: 'Mobility', sortOrder: 0 },
    { id: 58, assignedProgramId: 12, name: 'Strength', sortOrder: 1 },
  ],
  exercises: [
    exercise(101, 57, 'Heel Slides'),
    exercise(102, 58, 'Glute Bridge', {
      reps: 8,
      weight: 20,
      weightUnit: 'kg',
      notes: 'Keep the pelvis level.',
    }),
  ],
  retiredExercises: [],
}

function day(date: string, workoutId: number, state: string, fields: object = {}) {
  return {
    date,
    workoutId,
    state,
    sessionId: null,
    madeUpBy: null,
    doneEarlyBy: null,
    swappedBy: null,
    ...fields,
  }
}

// Week 1: Monday done, Wednesday made up on Thursday, Friday missed, and an
// extra session on Monday. Week 2: Monday done; Wednesday not done yet but
// still in its make-up window (today is Thursday); Friday upcoming.
const SUMMARY: ScheduleSummary = {
  firstDay: '2031-06-02',
  lastDay: '2031-06-15',
  today: TODAY,
  totals: { expected: null, done: 2, madeUp: 1, doneEarly: 0, swapped: 0, missed: 1, extra: 1 },
  days: [
    day('2031-06-02', 57, 'done', { sessionId: 1 }),
    day('2031-06-04', 58, 'made_up', { madeUpBy: { sessionId: 2, date: '2031-06-05' } }),
    day('2031-06-06', 57, 'missed'),
    day('2031-06-09', 57, 'done', { sessionId: 3 }),
    day('2031-06-11', 58, 'due'),
    day('2031-06-13', 57, 'upcoming'),
  ] as ScheduleSummary['days'],
  weeks: [],
  extraSessions: [{ sessionId: 4, date: '2031-06-02', reason: 'same_day' }],
  pauses: [],
  nextWorkout: { workoutId: 58, forDay: '2031-06-11', programWeek: null },
}

// The patient's programs (GET /assigned-programs?patientId=6): this one,
// with its assigner.
function listRow(program: AssignedProgramDetail, assigner = ME) {
  const { workouts: _w, exercises: _e, ...row } = program
  return { ...row, assigner: { id: assigner.id, firstName: assigner.firstName, lastName: assigner.lastName } }
}

// What each GET answers — tests replace entries for their case.
let programs: Record<number, () => Response>
let summaries: Record<number, () => Response>
let patientList: () => Response
// GET …/closing (what closing WOULD do), and the writes: POST …/cancel or
// …/complete, PATCH the program. Each test can replace them.
// (A promise that never settles stands for an answer still on its way.)
let closingPreview: () => Response | Promise<Response>
let closeAnswer: (action: string) => Response
let patchAnswer: (body: { allowSwaps?: boolean }) => Response

beforeEach(() => {
  fetchMock.mockReset()
  programs = { 12: () => json(PROGRAM) }
  summaries = { 12: () => json(SUMMARY) }
  patientList = () => json([listRow(PROGRAM)])
  closingPreview = () =>
    json({
      cancel: { outcome: 'cancelled', endDate: '2031-06-11' },
      complete: { outcome: 'completed', endDate: '2031-06-11' },
    })
  // Closing works like the server: the program's later GETs answer it
  // closed (the page refetches after closing).
  closeAnswer = (action) => {
    const status = action === 'cancel' ? 'cancelled' : 'completed'
    const closed = { ...PROGRAM, status, endDate: '2031-06-11' }
    programs[12] = () => json(closed)
    return json({ outcome: status, program: closed })
  }
  patchAnswer = (body) => json({ ...PROGRAM, ...body })
  fetchMock.mockImplementation((input, init) => {
    const url = urlOf(input)
    const close = /\/assigned-programs\/12\/(cancel|complete)$/.exec(url)
    if (init?.method === 'POST' && close) return Promise.resolve(closeAnswer(close[1]))
    if (init?.method === 'PATCH' && url.endsWith('/assigned-programs/12')) {
      return Promise.resolve(patchAnswer(JSON.parse(init.body as string) as { allowSwaps?: boolean }))
    }
    if (/\/assigned-programs\/12\/closing\?today=/.test(url)) return Promise.resolve(closingPreview())
    const summary = /\/assigned-programs\/(\d+)\/summary\?today=/.exec(url)
    if (summary) return Promise.resolve(summaries[Number(summary[1])]())
    const one = /\/assigned-programs\/(\d+)$/.exec(url)
    if (one) return Promise.resolve(programs[Number(one[1])]())
    if (url.endsWith('/assigned-programs?patientId=6')) return Promise.resolve(patientList())
    if (url.endsWith('/users/6')) return Promise.resolve(json(PATIENT))
    return Promise.reject(new Error(`unexpected request: ${url}`))
  })
  // Only Date is faked (user-event's own timers keep running): Thursday
  // 12 June 2031, at noon local time.
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2031, 5, 12, 12, 0))
})

afterEach(() => {
  vi.useRealTimers()
})

function renderPage(id: string | number = 12) {
  // staleTime as in the app (deep-dive §8: with 0, a missing cache rule
  // can't show).
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 30_000 } },
  })
  queryClient.setQueryData(currentUserQueryKey, {
    ...ME,
    activeRole: 'practitioner',
    roles: ['practitioner'],
    preferredWeightUnit: 'kg',
  })
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/practitioner/programs/assigned/${id}`]}>
        <Routes>
          <Route path="/practitioner/programs/assigned/:id" element={<AssignedProgramDetailPage />} />
          <Route path="/practitioner/patients/:id" element={<p>Patient page</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return queryClient
}

function requested(match: (url: string) => boolean) {
  return fetchMock.mock.calls.map(([input]) => urlOf(input)).filter(match)
}

// The bodies sent with one method to URLs that match — as LITERAL strings
// (the project's rule: a body built with the same JSON.stringify as the
// code would hide a missing or undefined key).
function bodiesSent(method: string, match: (url: string) => boolean) {
  return fetchMock.mock.calls
    .filter(([input, init]) => init?.method === method && match(urlOf(input)))
    .map(([, init]) => init?.body)
}

// A <details> by the week title its <summary> shows.
function weekDetails(programWeek: number) {
  const summary = screen.getByText(new RegExp(`^Week ${programWeek} · `))
  return summary.closest('details') as HTMLDetailsElement
}

describe('AssignedProgramDetailPage — the header', () => {
  it('says what, for whom, when, and who assigned it', async () => {
    renderPage()
    expect(await screen.findByRole('heading', { level: 1, name: 'Knee Rehab — Pat' })).toBeInTheDocument()
    expect(screen.getByText('Yours')).toBeInTheDocument()
    expect(screen.getByText('Active')).toBeInTheDocument()
    // Name AND date of birth (two identifiers).
    const forLine = (await screen.findByText(/^For/)).closest('p') as HTMLElement
    expect(forLine).toHaveTextContent(`For Pat Lee, born ${formatCalendarDate('1988-04-12')}`)
    expect(within(forLine).getByRole('link', { name: 'Pat Lee' })).toHaveAttribute(
      'href',
      '/practitioner/patients/6',
    )
    expect(screen.getByText(`From ${formatCalendarDate('2031-06-02')}, no end date`)).toBeInTheDocument()
    expect(screen.getByText('Assigned by you')).toBeInTheDocument()
  })

  it('leads back to the patient', async () => {
    renderPage()
    expect(await screen.findByRole('link', { name: '← Pat Lee' })).toHaveAttribute(
      'href',
      '/practitioner/patients/6',
    )
  })

  it("names a colleague who assigned it, with no Yours badge, and both dates of a bounded program", async () => {
    const colleagues = { ...PROGRAM, assignedBy: 5, endDate: '2031-07-27' }
    programs[12] = () => json(colleagues)
    patientList = () => json([listRow(colleagues, { id: 5, firstName: 'Sam', lastName: 'Okafor' })])
    renderPage()
    expect(await screen.findByText('Assigned by Sam Okafor')).toBeInTheDocument()
    expect(screen.queryByText('Yours')).not.toBeInTheDocument()
    expect(
      screen.getByText(`${formatCalendarDate('2031-06-02')} – ${formatCalendarDate('2031-07-27')}`),
    ).toBeInTheDocument()
  })

  it('links the program it continues and the one continuing it', async () => {
    const continued = { ...PROGRAM, basedOnProgramId: 9 }
    const source = {
      ...listRow(PROGRAM),
      id: 9,
      title: 'Knee Rehab — block 1',
      status: 'cancelled',
      endDate: '2031-06-01',
      basedOnProgramId: null,
    }
    const next = { ...listRow(PROGRAM), id: 13, title: 'Knee Rehab — block 3', basedOnProgramId: 12 }
    programs[12] = () => json(continued)
    patientList = () => json([listRow(continued), source, next])
    renderPage()

    const continues = await screen.findByRole('link', { name: 'Knee Rehab — block 1' })
    expect(continues).toHaveAttribute('href', '/practitioner/programs/assigned/9')
    expect(continues.closest('p')).toHaveTextContent(
      `Continues Knee Rehab — block 1 (cancelled, ended ${formatCalendarDate('2031-06-01')})`,
    )
    const continuedIn = screen.getByRole('link', { name: 'Knee Rehab — block 3' })
    expect(continuedIn).toHaveAttribute('href', '/practitioner/programs/assigned/13')
    expect(continuedIn.closest('p')).toHaveTextContent('Continued in Knee Rehab — block 3')
  })

  it("still links the program it continues when the patient's list can't be loaded", async () => {
    programs[12] = () => json({ ...PROGRAM, basedOnProgramId: 9 })
    patientList = () => apiError(500, 'Internal server error')
    renderPage()
    expect(await screen.findByRole('link', { name: 'an earlier program' })).toHaveAttribute(
      'href',
      '/practitioner/programs/assigned/9',
    )
  })

  it('says a cancelled program ended and is read-only, with nothing up next', async () => {
    programs[12] = () => json({ ...PROGRAM, status: 'cancelled', endDate: '2031-06-11' })
    summaries[12] = () => json({ ...SUMMARY, lastDay: '2031-06-11', nextWorkout: null })
    renderPage()
    expect(
      await screen.findByText(
        `Cancelled: this program ended on ${formatCalendarDate('2031-06-11')} and is now read-only.`,
      ),
    ).toBeInTheDocument()
    expect(screen.getByText('Cancelled')).toBeInTheDocument()
    // Wait for the summary before checking what it leaves out.
    expect(await screen.findByText('Last week of the program')).toBeInTheDocument()
    expect(screen.queryByText(/Up next/)).not.toBeInTheDocument()
  })

  it('says a completed program ended and is read-only', async () => {
    programs[12] = () => json({ ...PROGRAM, status: 'completed', endDate: '2031-06-11' })
    renderPage()
    expect(
      await screen.findByText(
        `Completed: this program ended on ${formatCalendarDate('2031-06-11')} and is now read-only.`,
      ),
    ).toBeInTheDocument()
  })

  it('says a deleted program is gone, whatever its status', async () => {
    programs[12] = () => json({ ...PROGRAM, isArchived: true })
    renderPage()
    expect(await screen.findByText('Deleted')).toBeInTheDocument()
    expect(screen.queryByText('Active')).not.toBeInTheDocument()
    expect(
      screen.getByText(
        'This program was deleted before any session was done. It no longer appears in any list and can no longer change.',
      ),
    ).toBeInTheDocument()
    // Deleted because nothing happened in it: no progress to show, and none
    // asked for (the schedule module would judge its weeks as running).
    expect(
      screen.getByText("Deleted before any session: there's no progress to show."),
    ).toBeInTheDocument()
    expect(screen.queryByText(/Up next/)).not.toBeInTheDocument()
    expect(requested((url) => url.includes('/summary'))).toStrictEqual([])
  })
})

describe('AssignedProgramDetailPage — the schedule', () => {
  it('words the schedule with its workout letters', async () => {
    renderPage()
    const line = (await screen.findByText('Schedule:')).closest('p')
    expect(line).toHaveTextContent('Schedule: Mon A · Wed B · Fri A')
    // The first version starts with the program: no "since".
    expect(line).not.toHaveTextContent('since')
  })

  it("says since when the schedule changed, and lists the planned changes", async () => {
    // 2 June Mon/Wed/Fri, paused from Tuesday 10 June, back on Mondays and
    // Wednesdays from Monday 16 June.
    programs[12] = () =>
      json({
        ...PROGRAM,
        schedules: [
          version(1, '2031-06-02'),
          version(2, '2031-06-10', { type: 'paused', days: [] }),
          version(3, '2031-06-16', {
            days: [
              { weekday: 1, workoutId: 57 },
              { weekday: 3, workoutId: 58 },
            ],
          }),
        ],
      })
    summaries[12] = () =>
      json({ ...SUMMARY, pauses: [{ from: '2031-06-10', to: '2031-06-15' }], nextWorkout: null })
    renderPage()

    expect((await screen.findByText('Schedule:')).closest('p')).toHaveTextContent(
      `Schedule: Paused (since ${formatShortDate('2031-06-10')})`,
    )
    expect(screen.getByText('Paused', { selector: 'span.rounded-full' })).toBeInTheDocument()
    expect(screen.queryByText('Active')).not.toBeInTheDocument()
    const planned = screen.getByText('Planned changes').closest('div') as HTMLElement
    expect(within(planned).getAllByRole('listitem').map((item) => item.textContent)).toStrictEqual([
      `From ${formatShortDate('2031-06-16')}: Mon A · Wed B`,
    ])
    expect((await screen.findByText('Up next:')).closest('p')).toHaveTextContent(
      'Up next: Nothing while the program is paused.',
    )
    // The pause, cut to this week.
    expect(
      within(weekDetails(2)).getByText(
        `Paused ${formatShortDate('2031-06-10')} – ${formatShortDate('2031-06-15')}`,
      ),
    ).toBeInTheDocument()
  })

  it('names no workouts in a one-workout program', async () => {
    programs[12] = () =>
      json({
        ...PROGRAM,
        workouts: [PROGRAM.workouts[0]],
        exercises: [PROGRAM.exercises[0]],
        schedules: [
          version(1, '2031-06-02', {
            days: [
              { weekday: 1, workoutId: 57 },
              { weekday: 3, workoutId: 57 },
            ],
          }),
        ],
      })
    summaries[12] = () => json({ ...SUMMARY, nextWorkout: { workoutId: 57, forDay: TODAY, programWeek: null } })
    renderPage()
    expect((await screen.findByText('Schedule:')).closest('p')).toHaveTextContent('Schedule: Mon · Wed')
    expect((await screen.findByText('Up next:')).closest('p')).toHaveTextContent(
      'Up next: A session, today',
    )
    // The days say their date only — no "· A" after each.
    expect(within(weekDetails(2)).getAllByRole('listitem')[0]).toHaveTextContent(
      new RegExp(`^${formatShortDate('2031-06-09')}Done$`),
    )
  })
})

describe('AssignedProgramDetailPage — progress', () => {
  it("asks for the summary as of the viewer's today", async () => {
    renderPage()
    await screen.findByText('This week')
    expect(requested((url) => url.includes('/summary'))).toStrictEqual([
      expect.stringMatching(/\/assigned-programs\/12\/summary\?today=2031-06-12$/),
    ])
  })

  it("says what's next — here, a make-up of Wednesday's workout", async () => {
    renderPage()
    expect((await screen.findByText('Up next:')).closest('p')).toHaveTextContent(
      `Up next: B · Strength, to make up ${formatShortDate('2031-06-11')}`,
    )
  })

  it('says when nothing is left to do in an active program', async () => {
    summaries[12] = () => json({ ...SUMMARY, nextWorkout: null })
    renderPage()
    expect((await screen.findByText('Up next:')).closest('p')).toHaveTextContent(
      'Up next: Nothing left to do in this program.',
    )
  })

  it('reads today once: past midnight, the page keeps the day it opened on', async () => {
    const queryClient = renderPage()
    await screen.findByText('This week')
    // Midnight passes while the page is open; then something re-renders it
    // (here, the program changed in the cache — its new title proves the
    // page rendered again, so a recomputed "today" would have had its
    // chance to ask for the 13th's summary).
    vi.setSystemTime(new Date(2031, 5, 13, 0, 30))
    queryClient.setQueryData(assignedProgramQueryKey(12), { ...PROGRAM, title: 'Knee Rehab — renamed' })
    await screen.findByRole('heading', { level: 1, name: 'Knee Rehab — renamed' })
    // Still the 12th's summary: no request for the 13th mid-reading.
    expect(requested((url) => url.includes('today=2031-06-13'))).toStrictEqual([])
  })

  it('totals what was done, without "of" for an open-ended program', async () => {
    renderPage()
    expect(await screen.findByText('3 sessions done')).toBeInTheDocument()
    expect(screen.getByText('1 made up · 1 missed · 1 extra')).toBeInTheDocument()
  })

  it('shows this week open, each day with its workout and state, and why a past day is still to do', async () => {
    renderPage()
    expect(await screen.findByRole('heading', { level: 3, name: 'This week' })).toBeInTheDocument()
    const thisWeek = weekDetails(2)
    expect(thisWeek.open).toBe(true)
    expect(within(thisWeek).getByText('1 of 3 done')).toBeVisible()

    const rows = within(thisWeek).getAllByRole('listitem')
    expect(rows.map((row) => row.textContent)).toStrictEqual([
      `${formatShortDate('2031-06-09')} · A · MobilityDone`,
      `${formatShortDate('2031-06-11')} · B · StrengthNot done yet — can still be made up before the next sessionTo do`,
      `${formatShortDate('2031-06-13')} · A · MobilityUpcoming`,
    ])
  })

  it('marks today among the days', async () => {
    summaries[12] = () =>
      json({ ...SUMMARY, days: [day(TODAY, 57, 'due')], nextWorkout: null })
    renderPage()
    expect(await screen.findByText(`${formatShortDate(TODAY)} (today) · A · Mobility`)).toBeInTheDocument()
  })

  it('folds earlier weeks, newest first, and opens one on demand', async () => {
    const user = userEvent.setup()
    renderPage()
    const earlier = (await screen.findByRole('heading', { level: 3, name: 'Earlier weeks' }))
      .parentElement as HTMLElement
    expect(within(earlier).getAllByText(/^Week \d/).map((title) => title.textContent)).toStrictEqual([
      `Week 1 · ${formatShortDate('2031-06-02')} – ${formatShortDate('2031-06-08')}`,
    ])

    const lastWeek = weekDetails(1)
    expect(lastWeek.open).toBe(false)
    // Its result shows while folded…
    expect(within(lastWeek).getByText('2 of 3 done · 1 missed')).toBeVisible()
    // …its days don't.
    const madeUp = within(lastWeek).getByText(`Made up on ${formatShortDate('2031-06-05')}`)
    expect(madeUp).not.toBeVisible()

    await user.click(within(lastWeek).getByText(/^Week 1/))
    expect(lastWeek.open).toBe(true)
    expect(madeUp).toBeVisible()
    expect(within(lastWeek).getByText('Missed')).toBeVisible()
    expect(
      within(lastWeek).getByText(`${formatShortDate('2031-06-02')} — Another session the same day`),
    ).toBeVisible()
  })

  it('lists later weeks after this one, soonest first', async () => {
    // An end date three weeks out: weeks 3 and 4 are still to come.
    programs[12] = () => json({ ...PROGRAM, endDate: '2031-06-29' })
    summaries[12] = () =>
      json({ ...SUMMARY, lastDay: '2031-06-29', totals: { ...SUMMARY.totals, expected: 12 } })
    renderPage()
    const later = (await screen.findByRole('heading', { level: 3, name: 'Later weeks' }))
      .parentElement as HTMLElement
    expect(within(later).getAllByText(/^Week \d/).map((title) => title.textContent?.slice(0, 6))).toStrictEqual([
      'Week 3',
      'Week 4',
    ])
    expect(screen.getByText('3 of 12 sessions done')).toBeInTheDocument()
  })

  it('shows a weekly count, its slots, and a stretch cut short', async () => {
    // One workout, three a week, weeks starting on a Friday (6 June); the
    // count changed on Monday 9, so week 1 holds two stretches.
    programs[12] = () =>
      json({
        ...PROGRAM,
        startDate: '2031-06-06',
        workouts: [PROGRAM.workouts[0]],
        exercises: [PROGRAM.exercises[0]],
        schedules: [
          version(1, '2031-06-06', { type: 'times_per_week', timesPerWeek: 3, days: [], rotation: [57] }),
        ],
      })
    const stretch = {
      programWeek: 1,
      timesPerWeek: 3,
      start: '2031-06-06',
      end: '2031-06-08',
      target: 1,
      workouts: [{ workoutId: 57, sessionId: 7 }],
      done: 1,
      state: 'met',
      sessionIds: [7],
    }
    summaries[12] = () =>
      json({
        ...SUMMARY,
        firstDay: '2031-06-06',
        lastDay: '2031-06-12',
        days: [],
        extraSessions: [],
        weeks: [
          stretch,
          {
            ...stretch,
            start: '2031-06-09',
            end: '2031-06-12',
            target: 2,
            workouts: [
              { workoutId: 57, sessionId: null },
              { workoutId: 57, sessionId: null },
            ],
            done: 0,
            state: 'in_progress',
            sessionIds: [],
          },
        ],
        nextWorkout: { workoutId: 57, forDay: null, programWeek: 1 },
      })
    renderPage()

    expect((await screen.findByText('Schedule:')).closest('p')).toHaveTextContent(
      'Schedule: 3× a week · weeks start Friday',
    )
    expect((await screen.findByText('Up next:')).closest('p')).toHaveTextContent(
      'Up next: A session, for week 1',
    )
    const week = weekDetails(1)
    expect(within(week).getByText('3× a week: 1 of 1 done')).toBeInTheDocument()
    expect(within(week).getByText('3× a week: 0 of 2 done')).toBeInTheDocument()
    // Both stretches are shorter than the week: the first ends early, the
    // second starts late — each says its dates.
    expect(
      within(week).getByText(
        `${formatShortDate('2031-06-06')} – ${formatShortDate('2031-06-08')}: target 1 for these 3 days`,
      ),
    ).toBeInTheDocument()
    expect(
      within(week).getByText(
        `${formatShortDate('2031-06-09')} – ${formatShortDate('2031-06-12')}: target 2 for these 4 days`,
      ),
    ).toBeInTheDocument()
    expect(within(week).getAllByText(/^Session \d/).map((slot) => slot.textContent)).toStrictEqual([
      'Session 1: done',
      'Session 1: not yet',
      'Session 2: not yet',
    ])
    expect(within(week).getByText('Met')).toBeInTheDocument()
    expect(within(week).getByText('In progress')).toBeInTheDocument()
  })

  it('names each slot of a weekly count by its workout when there are several', async () => {
    programs[12] = () =>
      json({
        ...PROGRAM,
        schedules: [
          version(1, '2031-06-02', { type: 'times_per_week', timesPerWeek: 2, days: [], rotation: [57, 58] }),
        ],
      })
    summaries[12] = () =>
      json({
        ...SUMMARY,
        days: [],
        extraSessions: [],
        weeks: [
          {
            programWeek: 2,
            timesPerWeek: 2,
            start: '2031-06-09',
            end: '2031-06-15',
            target: 2,
            workouts: [
              { workoutId: 57, sessionId: 9 },
              { workoutId: 58, sessionId: null },
            ],
            done: 1,
            state: 'in_progress',
            sessionIds: [9],
          },
        ],
      })
    renderPage()
    expect(await screen.findByText('A · Mobility: done')).toBeInTheDocument()
    expect(screen.getByText('B · Strength: not yet')).toBeInTheDocument()
    // A full week: no "these N days" line.
    expect(screen.queryByText(/target 2 for these/)).not.toBeInTheDocument()
  })

  it("lists sessions outside the program's dates apart", async () => {
    summaries[12] = () =>
      json({
        ...SUMMARY,
        extraSessions: [{ sessionId: 8, date: '2031-06-01', reason: 'outside_program' }],
      })
    renderPage()
    const outside = (
      await screen.findByRole('heading', { level: 3, name: "Sessions outside the program's dates" })
    ).parentElement as HTMLElement
    expect(within(outside).getByRole('listitem')).toHaveTextContent(
      `${formatShortDate('2031-06-01')} — Outside the program's dates`,
    )
  })

  it("says so when the progress can't be loaded, and still shows the rest", async () => {
    summaries[12] = () => apiError(500, 'Internal server error')
    renderPage()
    expect(await screen.findByText("Couldn't load the progress. Try refreshing.")).toBeInTheDocument()
    expect(screen.getByText('Schedule:')).toBeInTheDocument()
    expect(screen.getByText('Heel Slides')).toBeInTheDocument()
  })
})

describe('AssignedProgramDetailPage — exercises', () => {
  // A CLOSED program's exercises are read-only (the backend refuses every
  // write on it). An open program's are the editor (step 3b-1) — tested in
  // ProgramExercisesSection.test.tsx.
  it("lists a closed program's own exercises under their workouts, read-only", async () => {
    programs[12] = () => json({ ...PROGRAM, status: 'completed' })
    renderPage()
    const section = (await screen.findByRole('heading', { level: 2, name: 'Exercises' }))
      .parentElement as HTMLElement
    expect(within(section).getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toStrictEqual([
      'A · Mobility',
      'B · Strength',
    ])
    const bridge = within(section).getByText('Glute Bridge').closest('li') as HTMLElement
    expect(bridge).toHaveTextContent('Glute Bridge')
    expect(within(bridge).getByText('3 sets · 8 reps · 20 kg')).toBeInTheDocument()
    expect(within(bridge).getByText('Keep the pelvis level.')).toBeInTheDocument()
    // Read-only: no rename, no delete, no drag.
    expect(within(section).queryByRole('button')).not.toBeInTheDocument()
  })

  it('has no workout headings with one workout', async () => {
    programs[12] = () =>
      json({ ...PROGRAM, workouts: [PROGRAM.workouts[0]], exercises: [PROGRAM.exercises[0]] })
    renderPage()
    const section = (await screen.findByRole('heading', { level: 2, name: 'Exercises' }))
      .parentElement as HTMLElement
    expect(within(section).getByText('Heel Slides')).toBeInTheDocument()
    expect(within(section).queryByRole('heading', { level: 3 })).not.toBeInTheDocument()
  })

  it('says when a closed program has no exercises at all', async () => {
    programs[12] = () => json({ ...PROGRAM, status: 'cancelled', exercises: [] })
    renderPage()
    expect(await screen.findByText('No exercises in this program.')).toBeInTheDocument()
    expect(screen.queryByText('No exercises in this workout.')).not.toBeInTheDocument()
  })

  it('says when a workout has no exercises', async () => {
    programs[12] = () => json({ ...PROGRAM, exercises: [PROGRAM.exercises[0]] })
    renderPage()
    expect(await screen.findByText('No exercises in this workout.')).toBeInTheDocument()
  })
})

describe('AssignedProgramDetailPage — when it can’t be shown', () => {
  it("explains a 404 — no program, or not this practitioner's patient — and asks nothing more", async () => {
    programs[12] = () => apiError(404, 'Assigned program 12 not found')
    renderPage()
    expect(await screen.findByRole('heading', { name: 'Program not found' })).toBeInTheDocument()
    expect(
      screen.getByText(
        "This program doesn't exist, or it belongs to a patient whose care team you're not on. Only a patient's care team can open their programs.",
      ),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'My patients' })).toHaveAttribute('href', '/practitioner/patients')
    // Only the program was asked for: no summary, no patient, no list.
    expect(requested(() => true)).toHaveLength(1)
  })

  it('reports any other failure as a failure to load', async () => {
    programs[12] = () => apiError(500, 'Internal server error')
    renderPage()
    expect(await screen.findByText("Couldn't load this program. Try refreshing.")).toBeInTheDocument()
  })

  it('refuses an id that is not a program id', () => {
    renderPage('abc')
    expect(screen.getByText('Invalid program.')).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('AssignedProgramDetailPage — going to another program', () => {
  it('starts the next program fresh — its week open again (key)', async () => {
    const user = userEvent.setup()
    const next = { ...PROGRAM, id: 13, title: 'Knee Rehab — block 2', basedOnProgramId: 12 }
    patientList = () => json([listRow(PROGRAM), listRow(next)])
    const queryClient = renderPage()
    // Program 13 already cached — the case where React would otherwise
    // REUSE the page's elements (an uncached program shows "Loading…" first,
    // which unmounts everything anyway: deep-dive §8).
    queryClient.setQueryData(assignedProgramQueryKey(13), next)
    queryClient.setQueryData(assignedProgramSummaryQueryKey(13, TODAY), SUMMARY)

    // The summary arrives after the program: wait for its week.
    await screen.findByText(/^Week 2 · /)
    // The practitioner folds this week…
    await user.click(within(weekDetails(2)).getByText(/^Week 2/))
    expect(weekDetails(2).open).toBe(false)

    // …then opens the program that continues it.
    await user.click(await screen.findByRole('link', { name: 'Knee Rehab — block 2' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Knee Rehab — block 2' })).toBeInTheDocument()
    expect(weekDetails(2).open).toBe(true)
  })
})

describe('AssignedProgramDetailPage — closing the program', () => {
  it('offers Complete and Cancel on an open program only', async () => {
    renderPage()
    expect(await screen.findByRole('button', { name: 'Complete program' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancel program' })).toBeInTheDocument()
  })

  it.each([
    ['completed', { status: 'completed', endDate: '2031-06-11' }],
    ['cancelled', { status: 'cancelled', endDate: '2031-06-11' }],
    ['deleted', { isArchived: true }],
  ])('offers neither on a %s program', async (_label, state) => {
    programs[12] = () => json({ ...PROGRAM, ...state })
    renderPage()
    await screen.findByRole('heading', { level: 1, name: 'Knee Rehab — Pat' })
    expect(screen.queryByRole('button', { name: 'Complete program' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Cancel program' })).not.toBeInTheDocument()
  })

  it("asks the server what closing would do only once the dialog opens, and says it", async () => {
    const user = userEvent.setup()
    renderPage()
    const complete = await screen.findByRole('button', { name: 'Complete program' })
    expect(requested((url) => url.includes('/closing'))).toStrictEqual([])

    await user.click(complete)
    const dialog = await screen.findByRole('dialog', { name: 'Complete this program?' })
    expect(
      await within(dialog).findByText(
        `It will end on ${formatShortDate('2031-06-11')}, and become read-only. Its sessions and progress stay on the patient's record; to go on with it later, assign it again.`,
      ),
    ).toBeInTheDocument()
    expect(requested((url) => url.includes('/closing'))).toStrictEqual([
      expect.stringMatching(/\/assigned-programs\/12\/closing\?today=2031-06-12$/),
    ])
  })

  it('completes it with today, then shows it closed', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(await screen.findByRole('button', { name: 'Complete program' }))
    const dialog = await screen.findByRole('dialog')
    await user.click(await within(dialog).findByRole('button', { name: 'Complete program' }))

    expect(
      await screen.findByText(
        `Completed: this program ended on ${formatCalendarDate('2031-06-11')} and is now read-only.`,
      ),
    ).toBeInTheDocument()
    expect(bodiesSent('POST', (url) => url.endsWith('/assigned-programs/12/complete'))).toStrictEqual([
      '{"today":"2031-06-12"}',
    ])
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    // The actions are gone with the open state; Assign again is offered.
    expect(screen.queryByRole('button', { name: 'Cancel program' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Assign again' })).toHaveAttribute(
      'href',
      '/practitioner/programs/assigned/new?basedOnProgramId=12',
    )
  })

  it('says cancelling deletes a program with no session, and the page then shows it deleted', async () => {
    const user = userEvent.setup()
    closingPreview = () =>
      json({
        cancel: { outcome: 'archived', endDate: null },
        complete: { outcome: 'completed', endDate: '2031-06-11' },
      })
    closeAnswer = () => {
      programs[12] = () => json({ ...PROGRAM, isArchived: true })
      return json({ outcome: 'archived', program: null })
    }
    renderPage()
    await user.click(await screen.findByRole('button', { name: 'Cancel program' }))
    const dialog = await screen.findByRole('dialog', { name: 'Delete this program?' })
    await user.click(within(dialog).getByRole('button', { name: 'Delete program' }))

    expect(await screen.findByText('Deleted')).toBeInTheDocument()
    expect(bodiesSent('POST', (url) => url.endsWith('/assigned-programs/12/cancel'))).toStrictEqual([
      '{"today":"2031-06-12"}',
    ])
    // A deleted program can't be continued.
    expect(screen.queryByRole('link', { name: 'Assign again' })).not.toBeInTheDocument()
  })

  // While the request runs, the button can't be pressed again (a second
  // press would close an already closed program: a 409) — and says so.
  it('disables the confirm button while closing', async () => {
    const user = userEvent.setup()
    closeAnswer = () => {
      throw new Error('unreachable')
    }
    renderPage()
    await user.click(await screen.findByRole('button', { name: 'Cancel program' }))
    const dialog = await screen.findByRole('dialog')
    const confirm = await within(dialog).findByRole('button', { name: 'Cancel program' })
    // From now on, the close request never settles.
    fetchMock.mockImplementationOnce(() => new Promise(() => {}))
    await user.click(confirm)
    expect(await within(dialog).findByRole('button', { name: 'Cancelling…' })).toBeDisabled()
    expect(within(dialog).getByRole('button', { name: 'Keep it' })).toBeDisabled()
  })

  // Every list shows the program's status: the patient's list (which the
  // header reads too) is asked again.
  it("refreshes the patient's programs after closing", async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(await screen.findByRole('button', { name: 'Complete program' }))
    const dialog = await screen.findByRole('dialog')
    const listRequests = () => requested((url) => url.endsWith('/assigned-programs?patientId=6')).length
    const before = listRequests()
    await user.click(await within(dialog).findByRole('button', { name: 'Complete program' }))
    await screen.findByText(/^Completed: this program ended/)
    expect(listRequests()).toBeGreaterThan(before)
  })

  it("never asks to confirm what it couldn't check", async () => {
    const user = userEvent.setup()
    closingPreview = () => apiError(500, 'Internal server error')
    renderPage()
    await user.click(await screen.findByRole('button', { name: 'Cancel program' }))
    const dialog = await screen.findByRole('dialog', { name: 'Cancel this program?' })
    expect(
      await within(dialog).findByText("Couldn't check what this would do. Close this and try again."),
    ).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Cancel program' })).toBeDisabled()
  })

  it('waits for the answer before allowing to confirm', async () => {
    const user = userEvent.setup()
    closingPreview = () => new Promise<Response>(() => {})
    renderPage()
    await user.click(await screen.findByRole('button', { name: 'Cancel program' }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText('Checking what this would do…')).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Cancel program' })).toBeDisabled()
  })

  it('asks again each time the dialog opens — a session may have started since', async () => {
    const user = userEvent.setup()
    renderPage()
    const button = await screen.findByRole('button', { name: 'Complete program' })
    await user.click(button)
    await within(await screen.findByRole('dialog')).findByText(/It will end on/)
    await user.click(screen.getByRole('button', { name: 'Keep it' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    await user.click(button)
    await within(await screen.findByRole('dialog')).findByText(/It will end on/)
    await vi.waitFor(() =>
      expect(requested((url) => url.includes('/closing'))).toHaveLength(2),
    )
  })

  it("shows the server's refusal, and forgets it when the dialog closes", async () => {
    const user = userEvent.setup()
    closeAnswer = () => apiError(409, 'This program is completed, so it can no longer change')
    renderPage()
    const button = await screen.findByRole('button', { name: 'Cancel program' })
    await user.click(button)
    const dialog = await screen.findByRole('dialog')
    await user.click(await within(dialog).findByRole('button', { name: 'Cancel program' }))
    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      'This program is completed, so it can no longer change',
    )

    await user.click(within(dialog).getByRole('button', { name: 'Keep it' }))
    await user.click(button)
    const reopened = await screen.findByRole('dialog')
    await within(reopened).findByText(/It will end on/)
    expect(within(reopened).queryByRole('alert')).not.toBeInTheDocument()
  })
})

describe('AssignedProgramDetailPage — letting the patient rearrange the week', () => {
  it("shows the program's setting, and saves a change", async () => {
    const user = userEvent.setup()
    renderPage()
    const box = await screen.findByRole('checkbox', { name: 'Let the patient rearrange the week' })
    expect(box).toBeChecked()

    await user.click(box)
    await vi.waitFor(() => expect(box).not.toBeChecked())
    expect(bodiesSent('PATCH', (url) => url.endsWith('/assigned-programs/12'))).toStrictEqual([
      '{"allowSwaps":false}',
    ])
  })

  it('saves the other way too', async () => {
    const user = userEvent.setup()
    programs[12] = () => json({ ...PROGRAM, allowSwaps: false })
    renderPage()
    const box = await screen.findByRole('checkbox', { name: 'Let the patient rearrange the week' })
    expect(box).not.toBeChecked()
    await user.click(box)
    await vi.waitFor(() => expect(box).toBeChecked())
    expect(bodiesSent('PATCH', (url) => url.endsWith('/assigned-programs/12'))).toStrictEqual([
      '{"allowSwaps":true}',
    ])
  })

  it('is disabled while saving, and refreshes the lists after', async () => {
    const user = userEvent.setup()
    let answer: (response: Response) => void = () => {}
    patchAnswer = () => {
      throw new Error('unreachable')
    }
    renderPage()
    const box = await screen.findByRole('checkbox', { name: 'Let the patient rearrange the week' })
    const listRequests = () => requested((url) => url.endsWith('/assigned-programs?patientId=6')).length
    const before = listRequests()
    fetchMock.mockImplementationOnce(
      () => new Promise<Response>((resolve) => (answer = resolve)),
    )
    await user.click(box)
    await vi.waitFor(() => expect(box).toBeDisabled())

    answer(json({ ...PROGRAM, allowSwaps: false }))
    await vi.waitFor(() => expect(box).toBeEnabled())
    expect(box).not.toBeChecked()
    await vi.waitFor(() => expect(listRequests()).toBeGreaterThan(before))
  })

  // The box shows what the SERVER holds: refused, it stays as it was.
  it('stays as it was, with the reason, when the change is refused', async () => {
    const user = userEvent.setup()
    patchAnswer = () => apiError(409, 'This program is completed, so it can no longer change')
    renderPage()
    const box = await screen.findByRole('checkbox', { name: 'Let the patient rearrange the week' })
    await user.click(box)
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This program is completed, so it can no longer change',
    )
    expect(box).toBeChecked()
  })

  it('is not offered on a closed program', async () => {
    programs[12] = () => json({ ...PROGRAM, status: 'cancelled', endDate: '2031-06-11' })
    renderPage()
    await screen.findByRole('heading', { level: 1, name: 'Knee Rehab — Pat' })
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
  })
})