import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
import { currentUserQueryKey } from '@/auth/useCurrentUser'
import { formatCalendarDate } from '@/common/formatCalendarDate'
import { formatShortDate } from '@/common/calendarDate'
import { expectLoadError, retryThenExpectFocusOn } from '@/common/loadFailureAssertions'
import type { AssignedProgramListItem, ScheduleVersion } from '@/assigned-programs/types'
import { SessionsHubPage } from './SessionsHubPage'
import { A, B, PAT, TODAY, json, scheduledDay, summary, urlOf } from './testData'

const fetchMock = vi.fn<typeof fetch>()
vi.stubGlobal('fetch', fetchMock)

// Today is Thursday 12 June 2031 (testData); the summaries are read two
// weeks ahead, through Wednesday 25 June — the home's own keys.
const THROUGH = '2031-06-25'

// Mon A · Wed B · Fri A, from the start.
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
    lateMakeUpDays: 14,
    schedules: [],
    assigner: { id: 3, firstName: 'Alex', lastName: 'Chen' },
    workouts: [{ id: 70, assignedProgramId: id, name: null, sortOrder: 0 }],
    ...fields,
  }
}

// Knee Rehab: two workouts, Mon/Wed/Fri, ends 29 June. Lower Back: one
// workout, started later (so listed second — the home's order).
const KNEE = program(12, {
  title: 'Knee Rehab',
  endDate: '2031-06-29',
  schedules: [MWF],
  workouts: [
    { id: A, assignedProgramId: 12, name: 'Mobility', sortOrder: 0 },
    { id: B, assignedProgramId: 12, name: 'Strength', sortOrder: 1 },
  ],
})
const BACK = program(14, {
  title: 'Lower Back',
  startDate: '2031-06-09',
  assigner: { id: 4, firstName: 'Sam', lastName: 'Okafor' },
})
const OLD = program(9, {
  title: 'Shoulder',
  status: 'completed',
  startDate: '2031-04-01',
  endDate: '2031-05-20',
})

// Thursday 12 is a free day. Knee: Wednesday 11's B on time (until Friday
// 13), and two late ones — Monday 2's A until Saturday 14, Wednesday 4's B
// until Sunday 15.
const MAKE_UPS = summary({
  totals: { ...summary().totals, expected: 12, done: 4, missed: 2 },
  days: [
    scheduledDay('2031-06-02', A, 'missed'),
    scheduledDay('2031-06-04', B, 'missed'),
    scheduledDay('2031-06-11', B, 'due'),
  ],
  nextWorkout: { workoutId: B, forDay: '2031-06-11', programWeek: null, until: '2031-06-13' },
  lateMakeUps: {
    days: [
      { forDay: '2031-06-02', workoutId: A, until: '2031-06-14' },
      { forDay: '2031-06-04', workoutId: B, until: '2031-06-15' },
    ],
    blockedToday: null,
  },
})
// Back: today is its scheduled day, nothing missed.
const DUE_TODAY = summary({ days: [scheduledDay(TODAY, 70, 'due')] })

let list: () => Response
let summaries: Record<number, () => Response>

beforeEach(() => {
  fetchMock.mockReset()
  list = () => json([KNEE, BACK, OLD])
  summaries = { 12: () => json(MAKE_UPS), 14: () => json(DUE_TODAY) }
  fetchMock.mockImplementation((input) => {
    const url = urlOf(input)
    if (/\/assigned-programs$/.test(url)) return Promise.resolve(list())
    const match = /\/assigned-programs\/(\d+)\/summary\?/.exec(url)
    if (match && summaries[Number(match[1])]) return Promise.resolve(summaries[Number(match[1])]())
    return Promise.reject(new Error(`unexpected request: ${url}`))
  })
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2031, 5, 12, 12, 0))
})

afterEach(() => {
  vi.useRealTimers()
})

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 30_000 } },
  })
  queryClient.setQueryData(currentUserQueryKey, PAT)
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/patient/sessions']}>
        <SessionsHubPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

function paths() {
  return fetchMock.mock.calls.map(([input]) => {
    const url = new URL(urlOf(input))
    return url.pathname + url.search
  })
}

// A program's card: the list item holding its title's heading.
async function card(title: string) {
  const heading = await screen.findByRole('heading', { name: title, level: 3 })
  return heading.closest('li')!
}

// The "To make up" list inside a card, once its summary has answered.
async function makeUpList(title: string) {
  const inCard = within(await card(title))
  return inCard.findByRole('region', { name: 'To make up' })
}

describe('SessionsHubPage — the programs', () => {
  it('lists the active programs as cards, in the home’s order — and reads only their summaries', async () => {
    renderPage()
    expect(screen.getByRole('heading', { name: 'Sessions', level: 1 })).toBeInTheDocument()
    const current = await screen.findByRole('heading', { name: 'Current programs' })
    const cards = within(current.closest('section')!).getAllByRole('heading', { level: 3 })
    expect(cards.map((heading) => heading.textContent)).toStrictEqual(['Knee Rehab', 'Lower Back'])
    await within(await card('Lower Back')).findByText('Today')
    // The list, then the two ACTIVE programs' summaries — the home's keys
    // (through two weeks ahead); never the completed program's.
    expect(paths().sort()).toStrictEqual([
      '/assigned-programs',
      `/assigned-programs/12/summary?today=${TODAY}&through=${THROUGH}`,
      `/assigned-programs/14/summary?today=${TODAY}&through=${THROUGH}`,
    ])
  })

  it('shows who it is from, its schedule in words, and how far it has got', async () => {
    renderPage()
    const knee = within(await card('Knee Rehab'))
    expect(knee.getByText('From Alex Chen')).toBeInTheDocument()
    expect(knee.getByText('Mon A · Wed B · Fri A')).toBeInTheDocument()
    expect(await knee.findByText('4 of 12 sessions done')).toBeInTheDocument()
    expect(knee.getByRole('progressbar', { name: 'Knee Rehab progress' })).toHaveAttribute(
      'aria-valuenow',
      '4',
    )
    expect(knee.getByRole('link', { name: 'View program: Knee Rehab' })).toHaveAttribute(
      'href',
      '/patient/sessions/programs/12',
    )
  })

  // The way in doesn't wait for the summary: it's the program's page.
  it('links a card to its program even when its summary failed', async () => {
    summaries[12] = () => json({ statusCode: 500, message: ['Boom'] }, 500)
    renderPage()
    const knee = within(await card('Knee Rehab'))
    await knee.findByRole('alert')
    expect(knee.getByRole('link', { name: 'View program: Knee Rehab' })).toBeInTheDocument()
  })

  it("offers today's own session as the home does: Start and Skip today", async () => {
    renderPage()
    const back = within(await card('Lower Back'))
    expect(await back.findByRole('link', { name: 'Start Lower Back' })).toHaveAttribute(
      'href',
      '/patient/sessions/start/14',
    )
    expect(back.getByRole('link', { name: 'Skip today: Lower Back' })).toHaveAttribute(
      'href',
      '/patient/sessions/skip/14',
    )
    expect(back.getByText("Today's session")).toBeInTheDocument()
    // Nothing missed: no list, and no "nothing scheduled".
    expect(back.queryByRole('region', { name: 'To make up' })).not.toBeInTheDocument()
    expect(back.queryByText('Nothing scheduled today')).not.toBeInTheDocument()
  })

  it('says a free day has nothing scheduled — the catch-up is in the list, not offered twice', async () => {
    renderPage()
    const knee = within(await card('Knee Rehab'))
    expect(await knee.findByText('Nothing scheduled today')).toBeInTheDocument()
    expect(knee.queryByText(/^Catch up:/)).not.toBeInTheDocument()
    expect(knee.queryByRole('link', { name: /^Start/ })).not.toBeInTheDocument()
  })

  it('says when one summary could not be loaded, with its reason, keeping the others', async () => {
    summaries[12] = () => json({ statusCode: 500, message: ['Boom'] }, 500)
    renderPage()
    expect(await within(await card('Knee Rehab')).findByRole('alert')).toHaveTextContent(
      /^Couldn't load this program's sessions\. Something went wrong on our side\. Try again in a moment\.$/,
    )
    expect(await within(await card('Lower Back')).findByText("Today's session")).toBeInTheDocument()
  })

  it("a retry of that card's summary that works: focus goes to the card's title", async () => {
    const user = userEvent.setup()
    const good = summaries[12]
    summaries[12] = () => json({ statusCode: 500, message: ['Boom'] }, 500)
    renderPage()
    const knee = within(await card('Knee Rehab'))
    await knee.findByRole('alert')
    summaries[12] = good
    await user.click(knee.getByRole('button', { name: 'Try again' }))
    const title = knee.getByRole('heading', { name: 'Knee Rehab' })
    await waitFor(() => expect(title).toHaveFocus())
    expect(knee.queryByRole('alert')).not.toBeInTheDocument()
  })
})

describe('SessionsHubPage — to make up', () => {
  it('lists the on-time catch-up and EVERY late one, each with its own button', async () => {
    renderPage()
    const listed = within(await makeUpList('Knee Rehab'))
    // Under the card's title (an h3) in the outline, not beside it.
    expect(listed.getByRole('heading', { name: 'To make up' }).tagName).toBe('H4')
    const rows = listed.getAllByRole('listitem')
    expect(rows.map((row) => within(row).getAllByRole('paragraph').map((p) => p.textContent))).toStrictEqual([
      [`B · Strength from ${formatShortDate('2031-06-11')}`, `On time · until ${formatShortDate('2031-06-13')}`],
      [`A · Mobility from ${formatShortDate('2031-06-02')}`, `Late · until ${formatShortDate('2031-06-14')}`],
      [`B · Strength from ${formatShortDate('2031-06-04')}`, `Late · until ${formatShortDate('2031-06-15')}`],
    ])
    // Each button leads to the start page with ITS day; nothing is written
    // by the tap. Named with the session and the program.
    const links = listed.getAllByRole('link')
    expect(links.map((link) => [link.getAttribute('aria-label'), link.getAttribute('href')])).toStrictEqual([
      [
        `Make it up: B · Strength from ${formatShortDate('2031-06-11')} (Knee Rehab)`,
        '/patient/sessions/start/12?for=2031-06-11',
      ],
      [
        `Make it up: A · Mobility from ${formatShortDate('2031-06-02')} (Knee Rehab)`,
        '/patient/sessions/start/12?for=2031-06-02',
      ],
      [
        `Make it up: B · Strength from ${formatShortDate('2031-06-04')} (Knee Rehab)`,
        '/patient/sessions/start/12?for=2031-06-04',
      ],
    ])
    expect(links.every((link) => link.textContent === 'Make it up')).toBe(true)
    // Nothing blocks today, and the catch-up has a day left: no reason, no
    // warning.
    expect(listed.queryByText(/free day|in progress|already done/)).not.toBeInTheDocument()
    expect(listed.queryByText(/^Today is the last day/)).not.toBeInTheDocument()
  })

  it("warns, on the catch-up's last day, that choosing a late one leaves it missed", async () => {
    summaries[12] = () =>
      json({ ...MAKE_UPS, nextWorkout: { ...MAKE_UPS.nextWorkout, until: TODAY } })
    renderPage()
    const listed = within(await makeUpList('Knee Rehab'))
    expect(
      listed.getByText(
        `Today is the last day to make up B · Strength from ${formatShortDate('2031-06-11')} on time. If you make up a late one today instead, it will be missed.`,
      ),
    ).toBeInTheDocument()
    expect(listed.getByText('On time · until today')).toBeInTheDocument()
    // A heads-up, not a refusal: every button still works.
    expect(listed.getAllByRole('link')).toHaveLength(3)
  })

  it('gives no warning on the last day when there is no late one to choose instead', async () => {
    summaries[12] = () =>
      json({
        ...MAKE_UPS,
        nextWorkout: { ...MAKE_UPS.nextWorkout, until: TODAY },
        lateMakeUps: { days: [], blockedToday: null },
      })
    renderPage()
    const listed = within(await makeUpList('Knee Rehab'))
    expect(listed.getAllByRole('link')).toHaveLength(1)
    expect(listed.queryByText(/^Today is the last day/)).not.toBeInTheDocument()
  })

  it('disables every button when today is blocked, and says why — the reason read with each', async () => {
    summaries[12] = () =>
      json({
        ...MAKE_UPS,
        // A scheduled day today: no catch-up (the window closed), the late
        // ones wait for a free day.
        days: [...MAKE_UPS.days.slice(0, 2), scheduledDay(TODAY, A, 'due')],
        nextWorkout: { workoutId: A, forDay: TODAY, programWeek: null, until: TODAY },
        lateMakeUps: { ...MAKE_UPS.lateMakeUps, blockedToday: 'not_a_free_day' },
      })
    renderPage()
    const region = await makeUpList('Knee Rehab')
    const listed = within(region)
    const reason = listed.getByText(
      "Missed sessions are made up on a free day — a day with nothing scheduled — and today isn't one. You can make them up on another free day.",
    )
    expect(listed.queryByRole('link')).not.toBeInTheDocument()
    const buttons = listed.getAllByRole('button')
    expect(buttons.map((button) => button.getAttribute('aria-label'))).toStrictEqual([
      `Make it up: A · Mobility from ${formatShortDate('2031-06-02')} (Knee Rehab)`,
      `Make it up: B · Strength from ${formatShortDate('2031-06-04')} (Knee Rehab)`,
    ])
    for (const button of buttons) {
      expect(button).toBeDisabled()
      expect(button).toHaveAttribute('aria-describedby', reason.id)
    }
    // Today's own session is still offered, in the Today row.
    expect(
      within(await card('Knee Rehab')).getByRole('link', { name: 'Start Knee Rehab' }),
    ).toBeInTheDocument()
  })

  // The open session may itself be one of the make-ups — the list goes
  // while it runs; the Today row offers Resume.
  it('shows no list while a session of the program is in progress today', async () => {
    summaries[12] = () =>
      json({ ...MAKE_UPS, openSession: { sessionId: 31, localDate: TODAY, workoutId: A } })
    renderPage()
    const knee = within(await card('Knee Rehab'))
    expect(await knee.findByRole('link', { name: 'Resume Knee Rehab' })).toHaveAttribute(
      'href',
      '/patient/sessions/31',
    )
    expect(knee.queryByRole('region', { name: 'To make up' })).not.toBeInTheDocument()
    expect(knee.queryByRole('button', { name: /^Make it up/ })).not.toBeInTheDocument()
  })

  it('says "it" for a single session that is blocked', async () => {
    summaries[12] = () =>
      json({
        ...MAKE_UPS,
        nextWorkout: null,
        lateMakeUps: { days: [MAKE_UPS.lateMakeUps.days[1]], blockedToday: 'session_done_today' },
      })
    renderPage()
    const listed = within(await makeUpList('Knee Rehab'))
    expect(
      listed.getByText(
        "You've already done a session of this program today, and it's one session a day. You can make it up on another free day.",
      ),
    ).toBeInTheDocument()
  })
})

describe('SessionsHubPage — past programs', () => {
  it('keeps them behind "Show 1 past program", worded as on the practitioner side', async () => {
    const user = userEvent.setup()
    renderPage()
    await card('Knee Rehab')
    expect(screen.queryByRole('list', { name: 'Past programs' })).not.toBeInTheDocument()
    expect(screen.queryByText('Shoulder')).not.toBeInTheDocument()

    await user.click(screen.getByRole('checkbox', { name: 'Show 1 past program' }))
    const past = within(screen.getByRole('list', { name: 'Past programs' }))
    expect(past.getAllByRole('listitem').map((row) => row.textContent)).toStrictEqual([
      `ShoulderCompleted · ended ${formatCalendarDate('2031-05-20')} · ran from ${formatCalendarDate('2031-04-01')}`,
    ])
    // Its title is the way to its page.
    expect(past.getByRole('link', { name: 'Shoulder' })).toHaveAttribute(
      'href',
      '/patient/sessions/programs/9',
    )
  })

  it('offers no toggle when nothing is past', async () => {
    list = () => json([KNEE, BACK])
    renderPage()
    await card('Knee Rehab')
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
  })

  it('says "No current program." when every program is past', async () => {
    list = () => json([OLD])
    renderPage()
    expect(await screen.findByText('No current program.')).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Show 1 past program' })).toBeInTheDocument()
    expect(screen.queryByText(/You don't have a program yet/)).not.toBeInTheDocument()
    expect(paths()).toStrictEqual(['/assigned-programs'])
  })
})

describe('SessionsHubPage — nothing, or not yet', () => {
  it('says so when the patient has no program at all', async () => {
    list = () => json([])
    renderPage()
    expect(
      await screen.findByText(
        "You don't have a program yet. When your practitioner assigns you one, it will show here.",
      ),
    ).toBeInTheDocument()
    expect(screen.queryByText('No current program.')).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Current programs' })).not.toBeInTheDocument()
  })

  it('says it is loading, then that the list failed; a retry that works focuses the heading', async () => {
    const user = userEvent.setup()
    const good = list
    list = () => json({ statusCode: 500, message: ['Boom'] }, 500)
    renderPage()
    expect(screen.getByText('Loading your programs…')).toBeInTheDocument()
    await expectLoadError('your programs')
    expect(screen.queryByText('Loading your programs…')).not.toBeInTheDocument()
    list = good
    await retryThenExpectFocusOn(user, { level: 1, name: 'Sessions' })
    expect(await screen.findByRole('heading', { name: 'Current programs' })).toBeInTheDocument()
  })
})