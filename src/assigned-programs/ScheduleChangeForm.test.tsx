/*
    Copyright 2026 Julien Javelaud

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

        http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
*/
// -----------------------------------------------------------------------------------------------------------

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { formatShortDate } from '@/common/calendarDate'
import {
  assignedProgramQueryKey,
  assignedProgramSummaryQueryKey,
  assignedProgramsListQueryKey,
} from './api'
import { ProgramScheduleProgress } from './ProgramScheduleProgress'
import { workoutNames } from './programSchedule'
import { useAssignedProgram } from './useAssignedProgram'
import type { AssignedProgramDetail, ScheduleVersion } from './types'

// "Change schedule", "Pause" and "Resume", through the section that shows
// them ("Schedule & progress") — rendered on its own, with the program and
// the cache it writes to. The page's other parts have their own tests
// (AssignedProgramDetailPage.test.tsx).

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

// "Today" is Thursday 12 June 2031. The program started on Monday 2 June,
// so program weeks run Monday to Sunday; the next one starts on the 16th.
const TODAY = '2031-06-12'

function version(id: number, effectiveFrom: string, fields: Partial<ScheduleVersion> = {}) {
  return {
    id,
    assignedProgramId: 12,
    type: 'weekdays',
    timesPerWeek: null,
    effectiveFrom,
    createdBy: 3,
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

const PAUSED = { type: 'paused' as const, days: [] }

const PROGRAM: AssignedProgramDetail = {
  id: 12,
  patientId: 6,
  assignedBy: 3,
  basedOnTemplateId: 1,
  basedOnProgramId: null,
  title: 'Knee Rehab — Pat',
  startDate: '2031-06-02',
  endDate: null,
  status: 'active',
  isArchived: false,
  allowSwaps: true,
  lateMakeUpDays: null,
  schedules: [version(1, '2031-06-02')],
  workouts: [
    { id: 57, assignedProgramId: 12, name: 'Mobility', sortOrder: 0 },
    { id: 58, assignedProgramId: 12, name: 'Strength', sortOrder: 1 },
  ],
  exercises: [],
  retiredExercises: [],
}

// The answer to POST …/schedules — each test may replace it. By default,
// like the server: the program with the new version (the versions from
// that day on replaced). The body's fields are those of a version.
type SentVersion = Partial<ScheduleVersion> & { effectiveFrom: string }
let scheduleAnswer: (body: SentVersion) => Response | Promise<Response>

beforeEach(() => {
  fetchMock.mockReset()
  scheduleAnswer = (body) =>
    json({
      ...PROGRAM,
      schedules: [
        ...PROGRAM.schedules.filter((v) => v.effectiveFrom < body.effectiveFrom),
        version(9, body.effectiveFrom, body),
      ],
    })
  fetchMock.mockImplementation((input, init) => {
    const url = urlOf(input)
    if (init?.method === 'POST' && url.endsWith('/assigned-programs/12/schedules')) {
      return Promise.resolve(scheduleAnswer(JSON.parse(init.body as string) as SentVersion))
    }
    return Promise.reject(new Error(`unexpected request: ${init?.method} ${url}`))
  })
})

// The section as the page feeds it: the program read from the CACHE, so
// what saving writes there (the answer) is what it shows next — as on the
// real page. (Seeded below with staleTime 30 s: no request is made.)
function Section({ isOpen }: { isOpen: boolean }) {
  const program = useAssignedProgram(12).data
  if (!program) return null
  return (
    <ProgramScheduleProgress
      program={program}
      today={TODAY}
      isOpen={isOpen}
      canChange={isOpen}
      names={workoutNames(program.workouts)}
      summary={undefined}
      summaryLoading={false}
      summaryFailure={null}
    />
  )
}

function renderSection(program: AssignedProgramDetail = PROGRAM, { isOpen = true } = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 30_000 } },
  })
  // What the page has cached: the program, its summary, the lists — to see
  // what saving does to each.
  queryClient.setQueryData(assignedProgramQueryKey(12), program)
  queryClient.setQueryData(assignedProgramSummaryQueryKey(12, TODAY), { stand: 'in' })
  queryClient.setQueryData(assignedProgramsListQueryKey, [])
  render(
    <QueryClientProvider client={queryClient}>
      <Section isOpen={isOpen} />
    </QueryClientProvider>,
  )
  return queryClient
}

// The request bodies sent to POST …/schedules, as sent (literal strings:
// the exact JSON — key order included — is what the backend receives).
function bodiesSent(): unknown[] {
  return fetchMock.mock.calls
    .filter(([input, init]) => init?.method === 'POST' && urlOf(input).endsWith('/schedules'))
    .map(([, init]) => init?.body)
}

describe('ScheduleChangeForm — which buttons', () => {
  it('offers "Change schedule" and "Pause" on a running program', () => {
    renderSection()
    expect(screen.getByRole('button', { name: 'Change schedule' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Resume' })).not.toBeInTheDocument()
  })

  it('offers only "Resume" while paused', () => {
    renderSection({ ...PROGRAM, schedules: [version(1, '2031-06-02'), version(2, '2031-06-10', PAUSED)] })
    expect(screen.getByRole('button', { name: 'Resume' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Change schedule' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Pause' })).not.toBeInTheDocument()
  })

  it('offers nothing on a closed program', () => {
    renderSection(PROGRAM, { isOpen: false })
    expect(screen.queryByRole('button', { name: 'Change schedule' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Pause' })).not.toBeInTheDocument()
  })

  it('offers nothing once the end date has passed', () => {
    renderSection({ ...PROGRAM, endDate: '2031-06-11' })
    expect(screen.queryByRole('button', { name: 'Change schedule' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Pause' })).not.toBeInTheDocument()
  })
})

describe('ScheduleChangeForm — changing the schedule', () => {
  it('opens from today with the current schedule, and saves the edited one', async () => {
    const user = userEvent.setup()
    const queryClient = renderSection()
    await user.click(screen.getByRole('button', { name: 'Change schedule' }))

    const from = screen.getByLabelText('From')
    expect(from).toHaveValue(TODAY)
    expect(from).toHaveFocus()
    expect(from).toHaveAttribute('min', TODAY)
    expect(screen.getByText('New schedule:').closest('p')).toHaveTextContent(
      'New schedule: Mon A · Wed B · Fri A',
    )

    await user.click(screen.getByRole('checkbox', { name: 'Friday' }))
    expect(screen.getByText('New schedule:').closest('p')).toHaveTextContent(
      'New schedule: Mon A · Wed B',
    )
    await user.click(screen.getByRole('button', { name: 'Save schedule' }))

    // Closed once saved, and focus back on the button that opened it.
    expect(await screen.findByRole('button', { name: 'Change schedule' })).toHaveFocus()
    expect(bodiesSent()).toEqual([
      '{"effectiveFrom":"2031-06-12","type":"weekdays","days":[{"weekday":1,"workoutId":57},{"weekday":3,"workoutId":58}]}',
    ])
    // The answer replaced the cached program; the summary and the lists
    // were marked stale (they depend on the schedule).
    expect(
      queryClient.getQueryData<AssignedProgramDetail>(assignedProgramQueryKey(12))?.schedules.map(
        (v) => v.id,
      ),
    ).toEqual([1, 9])
    expect(queryClient.getQueryState(assignedProgramSummaryQueryKey(12, TODAY))?.isInvalidated).toBe(
      true,
    )
    expect(queryClient.getQueryState(assignedProgramsListQueryKey)?.isInvalidated).toBe(true)
    // The program itself was NOT invalidated: its answer is already there.
    expect(queryClient.getQueryState(assignedProgramQueryKey(12))?.isInvalidated).toBe(false)
  })

  it('stays open, disabled, while saving', async () => {
    scheduleAnswer = () => new Promise<Response>(() => {})
    const user = userEvent.setup()
    renderSection()
    await user.click(screen.getByRole('button', { name: 'Change schedule' }))
    await user.click(screen.getByRole('button', { name: 'Save schedule' }))

    expect(await screen.findByRole('button', { name: 'Saving…' })).toBeDisabled()
    expect(screen.getByRole('button', { name: "Don't change" })).toBeDisabled()
  })

  it("says what it replaces — and nothing once the day is after it", async () => {
    const user = userEvent.setup()
    renderSection({
      ...PROGRAM,
      schedules: [version(1, '2031-06-02'), version(2, '2031-06-16', { days: [{ weekday: 2, workoutId: 58 }] })],
    })
    await user.click(screen.getByRole('button', { name: 'Change schedule' }))
    expect(screen.getByText('Saving replaces what was already set from that day on:')).toBeInTheDocument()
    // Inside the form: the "Planned changes" list above words it the same way.
    const form = screen.getByRole('form', { name: 'Change schedule' })
    expect(within(form).getByText(`From ${formatShortDate('2031-06-16')}: Tue B`)).toBeInTheDocument()

    const from = screen.getByLabelText('From')
    await user.clear(from)
    await user.type(from, '2031-06-17')
    expect(screen.queryByText(/^Saving replaces/)).not.toBeInTheDocument()
  })

  it('explains what is wrong and sends nothing', async () => {
    const user = userEvent.setup()
    renderSection()
    await user.click(screen.getByRole('button', { name: 'Change schedule' }))
    const from = screen.getByLabelText('From')
    await user.clear(from)
    await user.type(from, '2031-06-11')
    for (const weekday of ['Monday', 'Wednesday', 'Friday']) {
      await user.click(screen.getByRole('checkbox', { name: weekday }))
    }
    // Nothing said before trying to save.
    expect(screen.queryByText('That day has passed: choose today or later')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Save schedule' }))
    expect(screen.getByText('That day has passed: choose today or later')).toBeInTheDocument()
    expect(from).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByText('Tick at least one day')).toBeInTheDocument()
    expect(bodiesSent()).toEqual([])
  })

  it("shows the backend's refusal and stays open", async () => {
    scheduleAnswer = () =>
      json(
        {
          statusCode: 409,
          message: ['Someone else changed this schedule at the same moment. Reload the program and try again.'],
          error: 'Conflict',
        },
        409,
      )
    const user = userEvent.setup()
    renderSection()
    await user.click(screen.getByRole('button', { name: 'Change schedule' }))
    await user.click(screen.getByRole('button', { name: 'Save schedule' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Someone else changed this schedule at the same moment. Reload the program and try again.',
    )
    expect(screen.getByRole('button', { name: 'Save schedule' })).toBeEnabled()
  })

  // No answer at all: nothing came back to show — the form's own sentence.
  it('says to check the connection when no answer comes, and stays open', async () => {
    scheduleAnswer = () => Promise.reject(new TypeError('Failed to fetch'))
    const user = userEvent.setup()
    renderSection()
    await user.click(screen.getByRole('button', { name: 'Change schedule' }))
    await user.click(screen.getByRole('button', { name: 'Save schedule' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      /^Couldn't save\. Check your connection and try again\.$/,
    )
    expect(screen.getByRole('button', { name: 'Save schedule' })).toBeEnabled()
  })

  it("closes on \"Don't change\", sending nothing, focus back on its button", async () => {
    const user = userEvent.setup()
    renderSection()
    await user.click(screen.getByRole('button', { name: 'Change schedule' }))
    await user.click(screen.getByRole('button', { name: "Don't change" }))
    expect(screen.getByRole('button', { name: 'Change schedule' })).toHaveFocus()
    expect(screen.queryByLabelText('From')).not.toBeInTheDocument()
    expect(bodiesSent()).toEqual([])
  })

  it('offers the next program week for N a week, and sends the rotation only if edited', async () => {
    const user = userEvent.setup()
    renderSection()
    await user.click(screen.getByRole('button', { name: 'Change schedule' }))
    // Specific days: no program weeks to speak of.
    expect(screen.queryByRole('button', { name: /^Next program week/ })).not.toBeInTheDocument()

    await user.click(screen.getByRole('radio', { name: 'A number of times a week' }))
    await user.click(
      screen.getByRole('button', { name: `Next program week (${formatShortDate('2031-06-16')})` }),
    )
    expect(screen.getByLabelText('From')).toHaveValue('2031-06-16')
    // Already a week's first day: nothing more to offer.
    expect(screen.queryByRole('button', { name: /^Next program week/ })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Save schedule' }))
    await screen.findByRole('button', { name: 'Change schedule' })
    expect(bodiesSent()).toEqual(['{"effectiveFrom":"2031-06-16","type":"times_per_week","timesPerWeek":3}'])
  })
})

describe('ScheduleChangeForm — pausing and resuming', () => {
  it('pauses from a day: no schedule to edit, only the day is sent', async () => {
    const user = userEvent.setup()
    renderSection()
    await user.click(screen.getByRole('button', { name: 'Pause' }))
    expect(screen.getByLabelText('Pause from')).toHaveValue(TODAY)
    expect(screen.queryByRole('group', { name: 'Schedule' })).not.toBeInTheDocument()
    expect(
      screen.getByText(/^From that day, nothing is due and no day counts as missed\./),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Pause program' }))
    // Paused now: "Pause" is gone, so focus goes to the button that took
    // its place.
    expect(await screen.findByRole('button', { name: 'Resume' })).toHaveFocus()
    expect(bodiesSent()).toEqual(['{"effectiveFrom":"2031-06-12","type":"paused"}'])
  })

  // Roadmap Phase 6.5: "Pause from … back on …" in one request.
  it('pauses with a back-on day: says what comes back, and sends resumeOn', async () => {
    const user = userEvent.setup()
    renderSection()
    await user.click(screen.getByRole('button', { name: 'Pause' }))
    const backOn = screen.getByLabelText('Back on (optional)')
    // Not before the day after the pause starts.
    expect(backOn).toHaveAttribute('min', '2031-06-13')
    await user.type(backOn, '2031-06-23')

    expect(
      screen.getByText(
        `From that day, nothing is due and no day counts as missed. From ${formatShortDate('2031-06-23')}, the schedule comes back: Mon A · Wed B · Fri A.`,
      ),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Pause program' }))
    await vi.waitFor(() =>
      expect(bodiesSent()).toEqual([
        '{"effectiveFrom":"2031-06-12","type":"paused","resumeOn":"2031-06-23"}',
      ]),
    )
  })

  it('refuses a back-on day that is not after the pause, sending nothing', async () => {
    const user = userEvent.setup()
    renderSection()
    await user.click(screen.getByRole('button', { name: 'Pause' }))
    await user.type(screen.getByLabelText('Back on (optional)'), '2031-06-12')
    await user.click(screen.getByRole('button', { name: 'Pause program' }))

    expect(screen.getByText('Choose a day after the pause starts')).toBeInTheDocument()
    expect(screen.getByLabelText('Back on (optional)')).toHaveAttribute('aria-invalid', 'true')
    expect(bodiesSent()).toEqual([])
  })

  it('returns focus to "Pause" when the pause is dismissed', async () => {
    const user = userEvent.setup()
    renderSection()
    await user.click(screen.getByRole('button', { name: 'Pause' }))
    await user.click(screen.getByRole('button', { name: "Don't pause" }))
    expect(screen.getByRole('button', { name: 'Pause' })).toHaveFocus()
  })

  it('resumes with the schedule from before the pause', async () => {
    const user = userEvent.setup()
    renderSection({
      ...PROGRAM,
      schedules: [
        version(1, '2031-06-02'),
        version(2, '2031-06-09', { days: [{ weekday: 2, workoutId: 58 }] }),
        version(3, '2031-06-10', PAUSED),
      ],
    })
    await user.click(screen.getByRole('button', { name: 'Resume' }))
    const form = screen.getByRole('form', { name: 'Resume the program' })
    expect(within(form).getByLabelText('Resume from')).toHaveValue(TODAY)
    expect(within(form).getByText('New schedule:').closest('p')).toHaveTextContent(
      'New schedule: Tue B',
    )
    await user.click(within(form).getByRole('button', { name: 'Resume program' }))
    await vi.waitFor(() =>
      expect(bodiesSent()).toEqual([
        '{"effectiveFrom":"2031-06-12","type":"weekdays","days":[{"weekday":2,"workoutId":58}]}',
      ]),
    )
  })

  it("can't pause on the start date: the earliest day offered is the next one", async () => {
    const user = userEvent.setup()
    renderSection({ ...PROGRAM, startDate: TODAY, schedules: [version(1, TODAY)] })
    await user.click(screen.getByRole('button', { name: 'Pause' }))
    expect(screen.getByLabelText('Pause from')).toHaveValue('2031-06-13')
    expect(screen.getByLabelText('Pause from')).toHaveAttribute('min', '2031-06-13')
  })
})