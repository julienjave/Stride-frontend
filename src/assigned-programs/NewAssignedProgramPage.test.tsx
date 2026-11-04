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

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router'
import { currentUserQueryKey } from '@/auth/useCurrentUser'
import { formatCalendarDate } from '@/common/formatCalendarDate'
import { formatShortDate } from '@/common/calendarDate'
import { expectLoadError, retryThenExpectFocusOn } from '@/common/loadFailureAssertions'
import { assignedProgramQueryKey, assignedProgramsListQueryKey } from './api'
import { NewAssignedProgramPage } from './NewAssignedProgramPage'

const fetchMock = vi.fn<typeof fetch>()
vi.stubGlobal('fetch', fetchMock)

// A fetch call's URL as a string — see CreateUserPage.test.tsx on why
// String(input) would be wrong for a Request object.
function urlOf(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input
  if (input instanceof URL) return input.toString()
  return input.url
}

const ME = { id: 3, firstName: 'Alex', lastName: 'Chen' }

function patient(id: number, firstName: string, lastName: string, dateOfBirth: string) {
  return {
    id,
    firstName,
    lastName,
    email: `${firstName.toLowerCase()}@example.com`,
    avatarUrl: null,
    roles: ['patient'],
    patientProfile: { dateOfBirth },
    clinics: [{ id: 1, name: 'Riverside Physio' }],
    isActive: true,
  }
}
const PAT = patient(6, 'Pat', 'Lee', '1988-04-12')
const JO = patient(7, 'Jo', 'Adams', '1975-11-02')
// On my care team, account deactivated (decisions §22): only in the list
// WITH the deactivated ones (GET /users?includeInactive=true).
const DEE = { ...patient(8, 'Dee', 'Moss', '1980-02-03'), isActive: false }

const KNEE = { id: 1, practitionerId: ME.id, title: 'Knee Rehab', description: null, isArchived: false }
const BACK = { id: 2, practitionerId: 99, title: 'Back Mobility', description: null, isArchived: false }
const EMPTY_B = { id: 3, practitionerId: ME.id, title: 'Half written', description: null, isArchived: false }

function exercise(id: number, templateId: number, workoutId: number) {
  return {
    id,
    templateId,
    workoutId,
    exerciseId: id,
    sets: 3,
    reps: 10,
    durationInSeconds: null,
    weight: null,
    weightUnit: null,
    sortOrder: 0,
    notes: null,
    exercise: { id, name: `Exercise ${id}`, primaryMuscles: [] },
  }
}

// Template details (GET /programs/:id): the knee template has two named
// workouts, the back template one unnamed, and "Half written" an empty B.
// The knee template's workouts are listed B first on purpose: the page
// must order them by sortOrder itself (A = the lowest), as the backend
// does when it turns positions into the program's workouts.
const DETAILS: Record<number, object> = {
  1: {
    ...KNEE,
    workouts: [
      { id: 12, templateId: 1, name: 'Strength', sortOrder: 1 },
      { id: 11, templateId: 1, name: 'Mobility', sortOrder: 0 },
    ],
    exercises: [exercise(101, 1, 11), exercise(102, 1, 12)],
  },
  2: {
    ...BACK,
    workouts: [{ id: 21, templateId: 2, name: null, sortOrder: 0 }],
    exercises: [exercise(201, 2, 21)],
  },
  3: {
    ...EMPTY_B,
    workouts: [
      { id: 31, templateId: 3, name: null, sortOrder: 0 },
      { id: 32, templateId: 3, name: null, sortOrder: 1 },
    ],
    exercises: [exercise(301, 3, 31)],
  },
}

const CREATED = {
  id: 42,
  patientId: 6,
  assignedBy: ME.id,
  basedOnTemplateId: 1,
  basedOnProgramId: null,
  title: 'Knee Rehab',
  startDate: '2031-06-05',
  endDate: null,
  status: 'active',
  isArchived: false,
  allowSwaps: true,
  schedules: [],
  workouts: [],
  exercises: [],
}

function sourceVersion(id: number, effectiveFrom: string, fields: object) {
  return {
    id,
    assignedProgramId: 9,
    type: 'weekdays',
    timesPerWeek: null,
    effectiveFrom,
    createdBy: ME.id,
    createdAt: `${effectiveFrom}T08:00:00.000Z`,
    days: [],
    rotation: [],
    ...fields,
  }
}

// "Assign again": Pat's cancelled program 9, with two workouts — ids 57 / 58,
// listed B first on purpose (the positions must come from sortOrder) — and
// its schedule history: Mon B · Thu A, then Tue A · Fri B, then a pause.
// The form starts from the LAST schedule that isn't a pause: Tue A · Fri B
// (not the first one, and not the pause).
const CONTINUED = {
  ...CREATED,
  id: 9,
  title: 'Knee Rehab — Pat',
  status: 'cancelled',
  startDate: '2031-05-01',
  endDate: '2031-06-01',
  basedOnTemplateId: 1,
  workouts: [
    { id: 58, assignedProgramId: 9, name: 'Strength', sortOrder: 1 },
    { id: 57, assignedProgramId: 9, name: 'Mobility', sortOrder: 0 },
  ],
  exercises: [
    { ...exercise(901, 9, 57), assignedProgramId: 9 },
    { ...exercise(902, 9, 58), assignedProgramId: 9 },
  ],
  schedules: [
    sourceVersion(1, '2031-05-01', {
      days: [
        { weekday: 1, workoutId: 58 },
        { weekday: 4, workoutId: 57 },
      ],
    }),
    sourceVersion(2, '2031-05-12', {
      days: [
        { weekday: 2, workoutId: 57 },
        { weekday: 5, workoutId: 58 },
      ],
    }),
    sourceVersion(3, '2031-05-20', { type: 'paused' }),
  ],
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status })
}

// What POST /assigned-programs answers — replaced by a test that needs a
// refusal.
let createResponse: () => Response | Promise<Response>
// GET /assigned-programs/:id — the program to continue ("Assign again").
let sourcePrograms: Record<number, () => Response>

beforeEach(() => {
  fetchMock.mockReset()
  createResponse = () => json(CREATED, 201)
  sourcePrograms = { 9: () => json(CONTINUED) }
  fetchMock.mockImplementation((input, init) => {
    const url = urlOf(input)
    const source = /\/assigned-programs\/(\d+)$/.exec(url)
    if (init?.method === 'GET' && source) {
      const answer = sourcePrograms[Number(source[1])]
      return Promise.resolve(
        answer ? answer() : json({ statusCode: 404, message: ['Assigned program not found'], error: 'Not Found' }, 404),
      )
    }
    if (init?.method === 'POST' && url.endsWith('/assigned-programs')) {
      return Promise.resolve(createResponse())
    }
    if (url.endsWith('/users')) return Promise.resolve(json([PAT, JO]))
    if (url.endsWith('/users?includeInactive=true')) return Promise.resolve(json([PAT, JO, DEE]))
    if (url.endsWith('/programs')) return Promise.resolve(json([KNEE, BACK, EMPTY_B]))
    const detail = /\/programs\/(\d+)$/.exec(url)
    if (detail) return Promise.resolve(json(DETAILS[Number(detail[1])]))
    return Promise.reject(new Error(`unexpected request: ${url}`))
  })
  // Only Date is faked: "today" is Thursday 5 June 2031, far from the real
  // today, while user-event's own timers keep running normally.
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2031, 5, 5, 12, 0))
})

afterEach(() => {
  vi.useRealTimers()
})

// A stand-in for the program page, with a Back button: proves where the
// form went, and — by going back — what it left in the history.
function ProgramPageStub() {
  const navigate = useNavigate()
  return (
    <div>
      <p>Program page</p>
      <button type="button" onClick={() => void navigate(-1)}>
        test: back
      </button>
    </div>
  )
}

// A link to the plain form that stays on the SAME route: the page isn't
// remounted, only its query string changes — as with the browser's Back
// from "Assign again" to a plain form.
function PlainFormLink() {
  const navigate = useNavigate()
  return (
    <button type="button" onClick={() => void navigate('/practitioner/programs/assigned/new')}>
      test: plain form
    </button>
  )
}

function renderPage(query = '', { openedDirectly = false } = {}) {
  // staleTime as in the app (see PatientPage.test.tsx on why).
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 30_000 } },
  })
  queryClient.setQueryData(currentUserQueryKey, { ...ME, activeRole: 'practitioner', roles: ['practitioner'] })
  render(
    <QueryClientProvider client={queryClient}>
      {/* Two entries — where the practitioner came from, then the form —
          or the form alone, as when its address is opened directly. */}
      <MemoryRouter
        initialEntries={[
          ...(openedDirectly ? [] : ['/came-from']),
          `/practitioner/programs/assigned/new${query}`,
        ]}
        initialIndex={openedDirectly ? 0 : 1}
      >
        <Routes>
          <Route path="/came-from" element={<p>Where I came from</p>} />
          <Route path="/practitioner/programs" element={<p>Programs page</p>} />
          <Route path="/practitioner/programs/assigned/new" element={
              <>
                <NewAssignedProgramPage />
                <PlainFormLink />
              </>
            }
          />
          <Route path="/practitioner/programs/assigned/:id" element={<ProgramPageStub />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return queryClient
}

function requests(match: (url: string, init?: RequestInit) => boolean) {
  return fetchMock.mock.calls.filter(([input, init]) => match(urlOf(input), init))
}

function postedBodies(): unknown[] {
  return requests((url, init) => init?.method === 'POST' && url.endsWith('/assigned-programs')).map(
    ([, init]) => JSON.parse(init!.body as string) as unknown,
  )
}

function optionTexts(select: HTMLElement) {
  return within(select).getAllByRole('option').map((option) => option.textContent)
}

// The first GET whose URL `matches` fails (a 500); every other request is
// answered by the fake backend above.
function failOnce(matches: (url: string) => boolean) {
  const backend = fetchMock.getMockImplementation()!
  let failures = 1
  fetchMock.mockImplementation((input, init) => {
    if (failures > 0 && init?.method === 'GET' && matches(urlOf(input))) {
      failures -= 1
      return Promise.resolve(json({ statusCode: 500, message: ['Boom'] }, 500))
    }
    return backend(input, init)
  })
}

describe('NewAssignedProgramPage — when something fails to load', () => {
  it('the lists: one load error with its reason; a retry that works focuses the heading', async () => {
    const user = userEvent.setup()
    failOnce((url) => url.endsWith('/users'))
    renderPage()
    await expectLoadError('your patients and templates')
    await retryThenExpectFocusOn(user, { level: 1, name: 'Assign a program' })
    expect(await screen.findByLabelText('Template')).toBeInTheDocument()
    // Only the list that failed was asked again.
    expect(requests((url) => url.endsWith('/programs'))).toHaveLength(1)
  })

  it("a template's details: the load error at the field; a retry that works focuses the field", async () => {
    const user = userEvent.setup()
    failOnce((url) => url.endsWith('/programs/1'))
    renderPage()
    await user.selectOptions(await screen.findByLabelText('Template'), '1')
    await expectLoadError('this template')
    await user.click(screen.getByRole('button', { name: 'Try again' }))
    await waitFor(() => expect(screen.getByLabelText('Template')).toHaveFocus())
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it("assigning again: a failure that isn't a 404 is a load error — never \"can't be found\"", async () => {
    const user = userEvent.setup()
    failOnce((url) => url.endsWith('/assigned-programs/9'))
    renderPage('?basedOnProgramId=9')
    await expectLoadError('the program and your patients')
    expect(screen.queryByText(/can't be found/)).not.toBeInTheDocument()
    await retryThenExpectFocusOn(user, { level: 1, name: 'Assign again' })
    expect(await screen.findByText('Continues')).toBeInTheDocument()
  })

  it('assigning again: the patients failing is the same load error', async () => {
    failOnce((url) => url.endsWith('/users?includeInactive=true'))
    renderPage('?basedOnProgramId=9')
    await expectLoadError('the program and your patients')
  })
})

describe('NewAssignedProgramPage — choosing who and what', () => {
  it('lists my patients by name with their date of birth, and every template, mine marked', async () => {
    renderPage()
    const patientSelect = await screen.findByLabelText('Patient')
    expect(optionTexts(patientSelect)).toEqual([
      'Choose a patient',
      `Jo Adams · born ${formatCalendarDate('1975-11-02')}`,
      `Pat Lee · born ${formatCalendarDate('1988-04-12')}`,
    ])
    expect(optionTexts(screen.getByLabelText('Template'))).toEqual([
      'Choose a template',
      'Knee Rehab (yours)',
      'Back Mobility',
      'Half written (yours)',
    ])
  })

  it('loads a template only once one is chosen, then shows its workouts', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByLabelText('Template')
    expect(requests((url) => /\/programs\/\d+$/.test(url))).toHaveLength(0)
    expect(screen.getByText(/Choose a template first/)).toBeInTheDocument()

    await user.selectOptions(screen.getByLabelText('Template'), '1')

    expect(await screen.findByText('Workouts: A · Mobility, B · Strength')).toBeInTheDocument()
    expect(requests((url) => url.endsWith('/programs/1'))).toHaveLength(1)
  })

  it('opened from a template: that template is chosen and gives the title', async () => {
    renderPage('?templateId=1')
    expect(await screen.findByLabelText('Template')).toHaveValue('1')
    expect(screen.getByLabelText('Title')).toHaveValue('Knee Rehab')
    expect(await screen.findByText('Workouts: A · Mobility, B · Strength')).toBeInTheDocument()
  })

  it('opened from a patient: the patient is fixed, shown as text', async () => {
    renderPage('?patientId=6')
    expect(await screen.findByText(`Pat Lee · born ${formatCalendarDate('1988-04-12')}`)).toBeInTheDocument()
    expect(screen.queryByLabelText('Patient')).not.toBeInTheDocument()
  })

  it('opened for someone who is not my patient: says so and offers the choice', async () => {
    renderPage('?patientId=99')
    expect(await screen.findByText(/That patient isn't one of your patients/)).toBeInTheDocument()
    expect(screen.getByLabelText('Patient')).toHaveValue('')
  })

  it('the title follows the template until the practitioner types one', async () => {
    const user = userEvent.setup()
    renderPage()
    const template = await screen.findByLabelText('Template')
    const title = screen.getByLabelText('Title')

    await user.selectOptions(template, '1')
    expect(title).toHaveValue('Knee Rehab')
    await user.selectOptions(template, '2')
    expect(title).toHaveValue('Back Mobility')

    await user.clear(title)
    await user.type(title, 'Back plan for Pat')
    await user.selectOptions(template, '1')
    expect(title).toHaveValue('Back plan for Pat')
  })

  it('explains a template with an empty workout, and sends nothing', async () => {
    const user = userEvent.setup()
    renderPage('?patientId=6&templateId=1')
    // A day ticked with a good template first, so the rest of the form is
    // complete and valid: only the template's problem can stop the request.
    await user.click(await screen.findByLabelText('Monday'))
    await user.selectOptions(screen.getByLabelText('Template'), '3')
    expect(
      await screen.findByText(/Workout B of this template has no exercises yet/),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Assign program' }))
    expect(postedBodies()).toHaveLength(0)
  })
})

describe('NewAssignedProgramPage — dates', () => {
  it("starts today (the viewer's day), with a shortcut to next Monday", async () => {
    const user = userEvent.setup()
    renderPage()
    const start = await screen.findByLabelText('Start date')
    expect(start).toHaveValue('2031-06-05')

    await user.click(
      screen.getByRole('button', { name: `Start next Monday (${formatShortDate('2031-06-09')})` }),
    )
    expect(start).toHaveValue('2031-06-09')
  })

  it('"after a number of weeks" shows the end date it gives', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(await screen.findByLabelText('After a number of weeks'))
    await user.type(screen.getByLabelText('Number of weeks'), '2')
    // Thursday 5 June + 2 program weeks → Wednesday 18 June.
    expect(screen.getByText(`Ends ${formatShortDate('2031-06-18')}`)).toBeInTheDocument()
  })
})

describe('NewAssignedProgramPage — the schedule', () => {
  it('suggests a workout per ticked day, follows a choice, and sums it up', async () => {
    const user = userEvent.setup()
    renderPage('?templateId=1')
    await screen.findByText('Workouts: A · Mobility, B · Strength')

    await user.click(screen.getByLabelText('Monday'))
    await user.click(screen.getByLabelText('Wednesday'))
    await user.click(screen.getByLabelText('Friday'))
    expect(screen.getByLabelText('Workout on Monday')).toHaveValue('0')
    expect(screen.getByLabelText('Workout on Wednesday')).toHaveValue('1')
    expect(screen.getByLabelText('Workout on Friday')).toHaveValue('0')
    expect(screen.getByText('Mon A · Wed B · Fri A')).toBeInTheDocument()

    // Wednesday becomes A: Friday's suggestion moves on to B.
    await user.selectOptions(screen.getByLabelText('Workout on Wednesday'), '0')
    expect(screen.getByLabelText('Workout on Friday')).toHaveValue('1')
    expect(screen.getByText('Mon A · Wed A · Fri B')).toBeInTheDocument()
  })

  it('shows no workout pickers for a one-workout template', async () => {
    const user = userEvent.setup()
    renderPage('?templateId=2')
    await user.click(await screen.findByLabelText('Monday'))
    await user.click(screen.getByLabelText('Thursday'))
    expect(screen.queryByLabelText('Workout on Monday')).not.toBeInTheDocument()
    expect(screen.getByText('Mon · Thu')).toBeInTheDocument()
    // Nor a list of one workout.
    expect(screen.queryByText(/^Workouts:/)).not.toBeInTheDocument()
  })

  it('changing the template drops the workout choices made for the previous one', async () => {
    const user = userEvent.setup()
    renderPage('?templateId=1')
    await user.click(await screen.findByLabelText('Monday'))
    await user.selectOptions(screen.getByLabelText('Workout on Monday'), '1')
    expect(screen.getByText('Mon B')).toBeInTheDocument()

    await user.selectOptions(screen.getByLabelText('Template'), '3')
    await user.selectOptions(screen.getByLabelText('Template'), '1')
    // Monday is still ticked, its workout back to the suggestion (A).
    expect(await screen.findByLabelText('Workout on Monday')).toHaveValue('0')
  })

  it('N a week: says how program weeks run, and edits the rotation', async () => {
    const user = userEvent.setup()
    renderPage('?templateId=1')
    await screen.findByText('Workouts: A · Mobility, B · Strength')
    expect(screen.queryByText(/Weeks will run/)).not.toBeInTheDocument()

    await user.click(screen.getByLabelText('A number of times a week'))
    expect(screen.getByText('Weeks will run Thursday to Wednesday.')).toBeInTheDocument()
    expect(screen.getByText('(suggested)')).toBeInTheDocument()
    expect(screen.getByText('3× a week · weeks start Thursday · A → B')).toBeInTheDocument()

    await user.selectOptions(screen.getByLabelText('Sessions per week'), '2')
    expect(screen.getByText('2× a week · weeks start Thursday · A → B')).toBeInTheDocument()
    await user.selectOptions(screen.getByLabelText('Sessions per week'), '3')

    await user.click(screen.getByRole('button', { name: 'Edit order' }))
    await user.click(screen.getByRole('button', { name: 'Add a workout to the order' }))
    await user.selectOptions(screen.getByLabelText('Workout 3 in the order'), '1')
    await user.click(screen.getByRole('button', { name: 'Remove workout 1 from the order' }))
    expect(screen.getByText('3× a week · weeks start Thursday · B → B')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Use the suggested order' }))
    expect(screen.getByText('3× a week · weeks start Thursday · A → B')).toBeInTheDocument()
  })

  it('the week hint follows the start date', async () => {
    const user = userEvent.setup()
    renderPage('?templateId=1')
    await user.click(await screen.findByLabelText('A number of times a week'))
    // A date input is changed in one go, as a browser's date picker does.
    fireEvent.change(screen.getByLabelText('Start date'), { target: { value: '2031-06-01' } })
    expect(screen.getByText('Weeks will run Sunday to Saturday.')).toBeInTheDocument()
  })

  it('stops adding to the order at 14 workouts, and says why', async () => {
    const user = userEvent.setup()
    renderPage('?templateId=1')
    await user.click(await screen.findByLabelText('A number of times a week'))
    await user.click(screen.getByRole('button', { name: 'Edit order' }))
    const add = screen.getByRole('button', { name: 'Add a workout to the order' })
    // From A → B (2 positions) to 14.
    for (let i = 0; i < 12; i++) await user.click(add)
    expect(screen.getByLabelText('Workout 14 in the order')).toBeInTheDocument()
    expect(add).toBeDisabled()
    expect(screen.getByText('An order can hold up to 14 workouts.')).toBeInTheDocument()
  })

  it('cannot remove the last workout of the order', async () => {
    const user = userEvent.setup()
    renderPage('?templateId=1')
    await user.click(await screen.findByLabelText('A number of times a week'))
    await user.click(screen.getByRole('button', { name: 'Edit order' }))
    await user.click(screen.getByRole('button', { name: 'Remove workout 1 from the order' }))
    expect(screen.getByRole('button', { name: 'Remove workout 1 from the order' })).toBeDisabled()
  })
})

describe('NewAssignedProgramPage — saving', () => {
  it('says what is missing and sends nothing', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(await screen.findByRole('button', { name: 'Assign program' }))
    expect(await screen.findByText('Select who this program is for')).toBeInTheDocument()
    expect(screen.getByText('Select the template to start from')).toBeInTheDocument()
    expect(postedBodies()).toHaveLength(0)
  })

  it('needs at least one day', async () => {
    const user = userEvent.setup()
    renderPage('?patientId=6&templateId=1')
    await screen.findByText('Workouts: A · Mobility, B · Strength')
    await user.click(screen.getByRole('button', { name: 'Assign program' }))
    expect(await screen.findByText('Tick at least one day')).toBeInTheDocument()
    expect(postedBodies()).toHaveLength(0)
  })

  it('sends the assignment, opens the new program in place of the form, and refreshes the lists', async () => {
    const user = userEvent.setup()
    const queryClient = renderPage('?patientId=6&templateId=1')
    queryClient.setQueryData(assignedProgramsListQueryKey, [])
    await screen.findByText('Workouts: A · Mobility, B · Strength')
    await user.click(screen.getByLabelText('After a number of weeks'))
    await user.type(screen.getByLabelText('Number of weeks'), '6')
    await user.click(screen.getByLabelText('Monday'))
    await user.click(screen.getByLabelText('Thursday'))

    await user.click(screen.getByRole('button', { name: 'Assign program' }))

    expect(await screen.findByText('Program page')).toBeInTheDocument()
    // A literal string, not JSON.stringify(sameObject) — see
    // deferred-improvements.md ("Clearing sets/reps…") on why.
    const [, init] = requests((url, i) => i?.method === 'POST' && url.endsWith('/assigned-programs'))[0]
    expect(init!.body).toBe(
      '{"patientId":6,"basedOnTemplateId":1,"title":"Knee Rehab","startDate":"2031-06-05",' +
        '"endDate":"2031-07-16","schedule":{"type":"weekdays","days":' +
        '[{"weekday":1,"workoutIndex":0},{"weekday":4,"workoutIndex":1}]}}',
    )
    expect(queryClient.getQueryData(assignedProgramQueryKey(42))).toEqual(CREATED)
    expect(queryClient.getQueryState(assignedProgramsListQueryKey)?.isInvalidated).toBe(true)

    // `replace`: Back from the new program skips the filled-in form.
    await user.click(screen.getByRole('button', { name: 'test: back' }))
    expect(await screen.findByText('Where I came from')).toBeInTheDocument()
  })

  it('while saving, says so and cannot be sent twice', async () => {
    const user = userEvent.setup()
    renderPage('?patientId=6&templateId=2')
    await user.click(await screen.findByLabelText('Monday'))
    // From here on, requests never answer: the form stays "saving".
    fetchMock.mockImplementation(() => new Promise<Response>(() => {}))

    await user.click(screen.getByRole('button', { name: 'Assign program' }))

    const saving = await screen.findByRole('button', { name: 'Assigning…' })
    expect(saving).toBeDisabled()
    await user.click(saving)
    expect(postedBodies()).toHaveLength(1)
  })

  it("shows the backend's refusal as it comes, and stays on the form", async () => {
    createResponse = () =>
      json(
        {
          statusCode: 400,
          message: ['Archived program templates cannot be assigned'],
          error: 'Bad Request',
          timestamp: '',
          path: '/assigned-programs',
        },
        400,
      )
    const user = userEvent.setup()
    renderPage('?patientId=6&templateId=2')
    await user.click(await screen.findByLabelText('Monday'))
    await user.click(screen.getByRole('button', { name: 'Assign program' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Archived program templates cannot be assigned',
    )
    expect(screen.getByRole('button', { name: 'Assign program' })).toBeEnabled()
    expect(screen.queryByText('Program page')).not.toBeInTheDocument()
  })

  // No answer at all: the page's own sentence, and the form stays.
  it('says to check the connection when no answer comes, and stays on the form', async () => {
    createResponse = () => Promise.reject(new TypeError('Failed to fetch'))
    const user = userEvent.setup()
    renderPage('?patientId=6&templateId=2')
    await user.click(await screen.findByLabelText('Monday'))
    await user.click(screen.getByRole('button', { name: 'Assign program' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /^Couldn't assign the program\. Check your connection and try again\.$/,
    )
    expect(screen.getByRole('button', { name: 'Assign program' })).toBeEnabled()
  })

  it('Cancel goes back where the practitioner came from', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(await screen.findByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(screen.getByText('Where I came from')).toBeInTheDocument())
  })

  it('Cancel on a form opened directly (nothing to go back to) goes to the Programs page', async () => {
    const user = userEvent.setup()
    renderPage('', { openedDirectly: true })
    await user.click(await screen.findByRole('button', { name: 'Cancel' }))
    expect(await screen.findByText('Programs page')).toBeInTheDocument()
  })
})

describe('NewAssignedProgramPage — assigning again', () => {
  it('continues the program: its patient, its title, its last schedule — no template to choose', async () => {
    renderPage('?basedOnProgramId=9')
    expect(await screen.findByRole('heading', { name: 'Assign again' })).toBeInTheDocument()
    expect(await screen.findByText('Continues')).toBeInTheDocument()
    expect(
      screen.getByText(`(cancelled, ended ${formatCalendarDate('2031-06-01')})`, { exact: false }),
    ).toBeInTheDocument()
    // The patient is fixed: text, no select.
    expect(screen.getByText(`Pat Lee · born ${formatCalendarDate('1988-04-12')}`)).toBeInTheDocument()
    expect(screen.queryByLabelText('Patient')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Template')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Title')).toHaveValue('Knee Rehab — Pat')
    // The last schedule that isn't a pause, its workouts by position.
    expect(screen.getByText('Schedule:').closest('p')).toHaveTextContent('Schedule: Tue A · Fri B')
    // No template list asked for: it has no use here.
    expect(requests((url) => url.endsWith('/programs'))).toEqual([])
  })

  // The page only chooses between two components: switching modes on the
  // same page must not change the hooks a component calls (React would
  // throw "Rendered more hooks than during the previous render").
  it('switches to the plain form on the same page without breaking', async () => {
    const user = userEvent.setup()
    renderPage('?basedOnProgramId=9')
    expect(await screen.findByRole('heading', { name: 'Assign again' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'test: plain form' }))
    expect(await screen.findByRole('heading', { name: 'Assign a program' })).toBeInTheDocument()
    expect(await screen.findByLabelText('Template')).toBeInTheDocument()
  })

  it('sends the continued program as the only source', async () => {
    const user = userEvent.setup()
    renderPage('?basedOnProgramId=9')
    await user.click(await screen.findByRole('button', { name: 'Assign program' }))

    await screen.findByText('Program page')
    expect(
      requests((url, init) => init?.method === 'POST' && url.endsWith('/assigned-programs')).map(
        ([, init]) => init?.body,
      ),
    ).toEqual([
      '{"patientId":6,"basedOnProgramId":9,"title":"Knee Rehab — Pat","startDate":"2031-06-05","schedule":{"type":"weekdays","days":[{"weekday":2,"workoutIndex":0},{"weekday":5,"workoutIndex":1}]}}',
    ])
  })

  // A weekly count whose order is the suggestion comes back as "suggested":
  // no rotation is sent (the backend's default is the same order).
  it('keeps a suggested order as suggested', async () => {
    sourcePrograms[9] = () =>
      json({
        ...CONTINUED,
        schedules: [
          {
            ...CONTINUED.schedules[0],
            type: 'times_per_week',
            timesPerWeek: 2,
            days: [],
            rotation: [57, 58],
          },
        ],
      })
    const user = userEvent.setup()
    renderPage('?basedOnProgramId=9')
    // Shown as the suggestion: "Edit order" is offered, not the editor's
    // "Use the suggested order" (which only an edited order has).
    expect(await screen.findByRole('button', { name: 'Edit order' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Use the suggested order' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Assign program' }))
    await screen.findByText('Program page')
    expect(
      requests((url, init) => init?.method === 'POST' && url.endsWith('/assigned-programs')).map(
        ([, init]) => JSON.parse(init?.body as string) as { schedule: unknown },
      )[0].schedule,
    ).toStrictEqual({ type: 'times_per_week', timesPerWeek: 2 })
  })

  it('explains a program that can\'t be continued, and sends nothing', async () => {
    sourcePrograms[9] = () =>
      json({ ...CONTINUED, exercises: [CONTINUED.exercises[0]] })
    const user = userEvent.setup()
    renderPage('?basedOnProgramId=9')
    expect(
      await screen.findByText(
        "Workout B of the program to continue has no exercises, so it can't be assigned again. Assign a template instead.",
      ),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Assign program' }))
    expect(requests((_url, init) => init?.method === 'POST')).toEqual([])
  })

  it.each<[string, () => void, string, string]>([
    [
      'a program still running',
      () => (sourcePrograms[9] = () => json({ ...CONTINUED, status: 'active', endDate: null })),
      '?basedOnProgramId=9',
      'That program is still running: complete or cancel it first, then assign it again.',
    ],
    [
      'a deleted program',
      () => (sourcePrograms[9] = () => json({ ...CONTINUED, status: 'active', isArchived: true })),
      '?basedOnProgramId=9',
      'That program was deleted before any session, so there is nothing to continue.',
    ],
    [
      'another practitioner\'s patient',
      () => (sourcePrograms[9] = () => json({ ...CONTINUED, patientId: 99 })),
      '?basedOnProgramId=9',
      "That program's patient isn't one of your patients any more, so you can't continue it.",
    ],
    [
      // Not "isn't one of your patients": she is — her account is what's in
      // the way, and the page says so (the backend would answer 409).
      'a deactivated patient\'s program',
      () => (sourcePrograms[9] = () => json({ ...CONTINUED, patientId: 8 })),
      '?basedOnProgramId=9',
      "This patient's account is deactivated: the program can be assigned again once an admin reactivates it.",
    ],
    [
      'a program that can\'t be found',
      () => {},
      '?basedOnProgramId=404',
      "That program can't be found — it doesn't exist, or it belongs to a patient whose care team you're not on.",
    ],
    ['a link without a program id', () => {}, '?basedOnProgramId=abc', "That link doesn't name a program."],
  ])('refuses %s, with the reason and no form', async (_label, arrange, query, message) => {
    arrange()
    renderPage(query)
    expect(await screen.findByText(message)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Assign program' })).not.toBeInTheDocument()
  })
})