import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { formatShortDate } from '@/common/calendarDate'
import { formatCalendarDate } from '@/common/formatCalendarDate'
import {
  assignedProgramQueryKey,
  assignedProgramSummaryQueryKey,
  assignedProgramsListQueryKey,
  closingPreviewQueryKey,
} from './api'
import { ProgramDetailsSection } from './ProgramDetailsSection'
import { workoutNames } from './programSchedule'
import type { AssignedProgramDetail, ScheduleVersion } from './types'
import { useAssignedProgram } from './useAssignedProgram'

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

// "Today" is Thursday 12 June 2031 (far from the real today), passed to the
// section as the page does — no clock to fake.
const TODAY = '2031-06-12'

function version(id: number, effectiveFrom: string, fields: Partial<ScheduleVersion> = {}) {
  return {
    id,
    assignedProgramId: 12,
    type: 'times_per_week',
    timesPerWeek: 3,
    effectiveFrom,
    createdBy: 3,
    createdAt: `${effectiveFrom}T08:00:00.000Z`,
    days: [],
    rotation: [57, 58],
    ...fields,
  } satisfies ScheduleVersion
}

// RUNNING: started Tuesday 3 June (weeks Tuesday → Monday), ends Monday 30
// June, 3 a week, a pause planned from Friday 27 June.
const RUNNING: AssignedProgramDetail = {
  id: 12,
  patientId: 6,
  assignedBy: 3,
  basedOnTemplateId: 1,
  basedOnProgramId: null,
  title: 'Knee Rehab — Pat',
  startDate: '2031-06-03',
  endDate: '2031-06-30',
  status: 'active',
  isArchived: false,
  allowSwaps: true,
  schedules: [
    version(1, '2031-06-03'),
    version(2, '2031-06-27', { type: 'paused', timesPerWeek: null, rotation: [] }),
  ],
  workouts: [
    { id: 57, assignedProgramId: 12, name: 'Mobility', sortOrder: 0 },
    { id: 58, assignedProgramId: 12, name: 'Strength', sortOrder: 1 },
  ],
  exercises: [],
  retiredExercises: [],
}

// NOT_STARTED: starts Monday 16 June, open-ended — specific days, Mon A /
// Thu B, then 3 a week planned from Monday 23 June.
const NOT_STARTED: AssignedProgramDetail = {
  ...RUNNING,
  startDate: '2031-06-16',
  endDate: null,
  schedules: [
    version(1, '2031-06-16', {
      type: 'weekdays',
      timesPerWeek: null,
      days: [
        { weekday: 1, workoutId: 57 },
        { weekday: 4, workoutId: 58 },
      ],
      rotation: [],
    }),
    version(2, '2031-06-23'),
  ],
}

// What the PATCH answers: by default the program with the change applied,
// as the backend does. A test can replace it.
let patchAnswer: (body: Record<string, unknown>) => Response

beforeEach(() => {
  fetchMock.mockReset()
  patchAnswer = (body) => json({ ...RUNNING, ...body })
  fetchMock.mockImplementation((input, init) => {
    const url = urlOf(input)
    if (init?.method === 'PATCH' && url.endsWith('/assigned-programs/12')) {
      return Promise.resolve(patchAnswer(JSON.parse(init.body as string) as Record<string, unknown>))
    }
    return Promise.reject(new Error(`unexpected request: ${init?.method ?? 'GET'} ${url}`))
  })
})

// The section as the page uses it, reading the program from the CACHE — so
// the PATCH's answer, written there by the hook, re-renders it (the page's
// own behaviour). The summary, the closing preview and a list are cached
// too, to see which ones a save marks stale.
function renderSection(program: AssignedProgramDetail = RUNNING) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 30_000 } },
  })
  queryClient.setQueryData(assignedProgramQueryKey(12), program)
  queryClient.setQueryData(assignedProgramSummaryQueryKey(12, TODAY), { stand: 'in' })
  queryClient.setQueryData(closingPreviewQueryKey(12, TODAY), { stand: 'in' })
  queryClient.setQueryData([...assignedProgramsListQueryKey, 'patient', 6], [])

  function Harness() {
    const { data } = useAssignedProgram(12)
    return data ? (
      <ProgramDetailsSection program={data} today={TODAY} names={workoutNames(data.workouts)} />
    ) : null
  }
  render(
    <QueryClientProvider client={queryClient}>
      <Harness />
    </QueryClientProvider>,
  )
  return queryClient
}

// Whether a cached query has been marked stale by a save.
function invalidated(queryClient: QueryClient, key: readonly unknown[]) {
  return queryClient.getQueryState(key)?.isInvalidated ?? false
}

function patchesSent() {
  return fetchMock.mock.calls
    .filter(([, init]) => init?.method === 'PATCH')
    .map(([, init]) => init?.body)
}

// A date input gets its whole value at once: user-event types character by
// character, and jsdom empties a date input whose text isn't a full date.
function setDate(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } })
}

describe('ProgramDetailsSection — reading', () => {
  it('shows the title and dates, each with its Edit button, in a named section', () => {
    renderSection(NOT_STARTED)
    const section = screen.getByRole('region', { name: 'Details' })
    expect(within(section).getByText('Knee Rehab — Pat')).toBeInTheDocument()
    expect(within(section).getByText(formatCalendarDate('2031-06-16'))).toBeInTheDocument()
    expect(within(section).getByText('No end date')).toBeInTheDocument()
    for (const label of ['Title', 'Start date', 'End date']) {
      expect(within(section).getByRole('button', { name: `Edit ${label}` })).toBeInTheDocument()
    }
  })

  // Started on the 3rd: its start is history. No Edit button — the reason
  // and what to do instead.
  it('shows a started program’s start date read-only, saying why', () => {
    renderSection(RUNNING)
    expect(screen.queryByRole('button', { name: 'Edit Start date' })).not.toBeInTheDocument()
    expect(screen.getByText(formatCalendarDate('2031-06-03'))).toBeInTheDocument()
    expect(
      screen.getByText(
        "It can't change once the program has started: its weeks are counted from it. To start over on another day, cancel the program and assign it again.",
      ),
    ).toBeInTheDocument()
  })

  // Starting TODAY: nothing judged yet, so it can still move.
  it('lets a program starting today move its start', () => {
    renderSection({ ...NOT_STARTED, startDate: TODAY, schedules: [version(1, TODAY)] })
    expect(screen.getByRole('button', { name: 'Edit Start date' })).toBeInTheDocument()
  })
})

describe('ProgramDetailsSection — the title', () => {
  it('renames the program with one key, trimmed, and shows the answer', async () => {
    const user = userEvent.setup()
    const queryClient = renderSection()
    await user.click(screen.getByRole('button', { name: 'Edit Title' }))
    const input = screen.getByLabelText('Title')
    await user.clear(input)
    await user.type(input, '  Knee Rehab — phase 2  {Enter}')

    expect(await screen.findByText('Knee Rehab — phase 2')).toBeInTheDocument()
    expect(patchesSent()).toStrictEqual(['{"title":"Knee Rehab — phase 2"}'])
    expect(queryClient.getQueryData<AssignedProgramDetail>(assignedProgramQueryKey(12))?.title).toBe(
      'Knee Rehab — phase 2',
    )
    // The lists show titles; the summary and the closing preview don't
    // depend on one.
    expect(invalidated(queryClient, [...assignedProgramsListQueryKey, 'patient', 6])).toBe(true)
    expect(invalidated(queryClient, assignedProgramSummaryQueryKey(12, TODAY))).toBe(false)
    expect(invalidated(queryClient, closingPreviewQueryKey(12, TODAY))).toBe(false)
  })

  it('refuses a blank title before any request', async () => {
    const user = userEvent.setup()
    renderSection()
    await user.click(screen.getByRole('button', { name: 'Edit Title' }))
    await user.clear(screen.getByLabelText('Title'))
    await user.type(screen.getByLabelText('Title'), '   ')
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(screen.getByText('Give the program a title')).toBeInTheDocument()
    expect(patchesSent()).toStrictEqual([])
  })

  // The backend's refusals are written for people: shown as they come.
  it("shows the backend's refusal as it is, and stays open", async () => {
    patchAnswer = () =>
      json(
        { statusCode: 409, message: ['This program is closed, so it can no longer change'], error: 'Conflict' },
        409,
      )
    const user = userEvent.setup()
    renderSection()
    await user.click(screen.getByRole('button', { name: 'Edit Title' }))
    await user.type(screen.getByLabelText('Title'), '!{Enter}')
    expect(
      await screen.findByText('This program is closed, so it can no longer change'),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Title')).toBeInTheDocument()
  })
})

describe('ProgramDetailsSection — the start date', () => {
  it('offers only days from today to the end, and says the schedule moves with it', async () => {
    const user = userEvent.setup()
    renderSection({ ...NOT_STARTED, endDate: '2031-07-31' })
    await user.click(screen.getByRole('button', { name: 'Edit Start date' }))
    const input = screen.getByLabelText('Start date')
    expect(input).toHaveAttribute('min', TODAY)
    expect(input).toHaveAttribute('max', '2031-07-31')
    // The stored day: nothing to say yet.
    expect(input).toHaveAccessibleDescription('')

    // Past the planned "3 a week": the program will start with it, its weeks
    // running from the new day (a Wednesday), and the first schedule will
    // never apply.
    setDate('Start date', '2031-06-25')
    expect(input).toHaveAccessibleDescription(
      `The schedule moves with it: From ${formatShortDate('2031-06-25')}: 3× a week · weeks start Wednesday · A → B ` +
        `What was set to begin before that day will never apply: From ${formatShortDate('2031-06-16')}: Mon A · Thu B`,
    )
  })

  it('moves it with one key, and refreshes what the dates judge', async () => {
    patchAnswer = (body) => json({ ...NOT_STARTED, ...body })
    const user = userEvent.setup()
    const queryClient = renderSection(NOT_STARTED)
    await user.click(screen.getByRole('button', { name: 'Edit Start date' }))
    setDate('Start date', '2031-06-18')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByText(formatCalendarDate('2031-06-18'))).toBeInTheDocument()
    expect(patchesSent()).toStrictEqual(['{"startDate":"2031-06-18"}'])
    expect(invalidated(queryClient, assignedProgramSummaryQueryKey(12, TODAY))).toBe(true)
    expect(invalidated(queryClient, closingPreviewQueryKey(12, TODAY))).toBe(true)
    expect(invalidated(queryClient, [...assignedProgramsListQueryKey, 'patient', 6])).toBe(true)
  })

  it('refuses a day the backend would refuse, before any request', async () => {
    const user = userEvent.setup()
    renderSection({
      ...NOT_STARTED,
      schedules: [
        NOT_STARTED.schedules[0],
        version(2, '2031-06-23', { type: 'paused', timesPerWeek: null, rotation: [] }),
      ],
    })
    await user.click(screen.getByRole('button', { name: 'Edit Start date' }))
    const input = screen.getByLabelText('Start date')

    setDate('Start date', '2031-06-11')
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(
      screen.getByText("The start date can't be moved into the past: choose today or later"),
    ).toBeInTheDocument()

    setDate('Start date', '2031-06-24')
    // A refused day gets no "what saving would do" — it won't happen.
    expect(input).toHaveAccessibleDescription('')
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(
      screen.getByText("A program can't start paused: the new start date falls in a planned pause"),
    ).toBeInTheDocument()
    expect(patchesSent()).toStrictEqual([])
  })
})

describe('ProgramDetailsSection — the end date', () => {
  it('offers days from today on, and warns what a shorter end cuts off', async () => {
    const user = userEvent.setup()
    renderSection(RUNNING)
    await user.click(screen.getByRole('button', { name: 'Edit End date' }))
    const input = screen.getByLabelText('End date')
    expect(input).toHaveAttribute('min', TODAY)

    setDate('End date', '2031-06-19')
    expect(input).toHaveAccessibleDescription(
      `The change planned after that day will never apply: From ${formatShortDate('2031-06-27')}: Paused ` +
        `The last program week will be ${formatShortDate('2031-06-17')} – ${formatShortDate('2031-06-19')} (3 days), so its target becomes 1 session instead of 3.`,
    )

    // Later than before: nothing is cut off, nothing to say.
    setDate('End date', '2031-07-14')
    expect(input).toHaveAccessibleDescription('')
  })

  it('saves a shorter end with one key, and refreshes what the dates judge', async () => {
    const user = userEvent.setup()
    const queryClient = renderSection(RUNNING)
    await user.click(screen.getByRole('button', { name: 'Edit End date' }))
    setDate('End date', '2031-06-19')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByText(formatCalendarDate('2031-06-19'))).toBeInTheDocument()
    expect(patchesSent()).toStrictEqual(['{"endDate":"2031-06-19"}'])
    expect(invalidated(queryClient, assignedProgramSummaryQueryKey(12, TODAY))).toBe(true)
    expect(invalidated(queryClient, closingPreviewQueryKey(12, TODAY))).toBe(true)
  })

  // null, not a missing key: JSON drops undefined, and an empty body would
  // change nothing.
  it('removes the end date — the program becomes open-ended', async () => {
    const user = userEvent.setup()
    const queryClient = renderSection(RUNNING)
    await user.click(screen.getByRole('button', { name: 'Edit End date' }))
    await user.click(screen.getByRole('button', { name: 'Remove end date' }))

    expect(await screen.findByText('No end date')).toBeInTheDocument()
    expect(patchesSent()).toStrictEqual(['{"endDate":null}'])
    expect(invalidated(queryClient, assignedProgramSummaryQueryKey(12, TODAY))).toBe(true)
  })

  it("refuses a day in the past, with the backend's words, before any request", async () => {
    const user = userEvent.setup()
    renderSection(RUNNING)
    await user.click(screen.getByRole('button', { name: 'Edit End date' }))
    setDate('End date', '2031-06-11')
    // A refused day gets no "what saving would do" (it would describe a cut
    // that can't happen — here, the planned pause "never applying").
    expect(screen.getByLabelText('End date')).toHaveAccessibleDescription('')
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(
      screen.getByText(
        "The end date can't be moved into the past: to end the program now, complete or cancel it",
      ),
    ).toBeInTheDocument()
    expect(patchesSent()).toStrictEqual([])
  })
})