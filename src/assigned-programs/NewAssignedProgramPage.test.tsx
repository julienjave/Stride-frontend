import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router'
import { currentUserQueryKey } from '@/auth/useCurrentUser'
import { formatCalendarDate } from '@/common/formatCalendarDate'
import { formatShortDate } from '@/common/calendarDate'
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
  }
}
const PAT = patient(6, 'Pat', 'Lee', '1988-04-12')
const JO = patient(7, 'Jo', 'Adams', '1975-11-02')

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

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status })
}

// What POST /assigned-programs answers — replaced by a test that needs a
// refusal.
let createResponse: () => Response

beforeEach(() => {
  fetchMock.mockReset()
  createResponse = () => json(CREATED, 201)
  fetchMock.mockImplementation((input, init) => {
    const url = urlOf(input)
    if (init?.method === 'POST' && url.endsWith('/assigned-programs')) {
      return Promise.resolve(createResponse())
    }
    if (url.endsWith('/users')) return Promise.resolve(json([PAT, JO]))
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
          <Route path="/practitioner/programs/assigned/new" element={<NewAssignedProgramPage />} />
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