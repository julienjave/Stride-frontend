import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router'
import { currentUserQueryKey } from '@/auth/useCurrentUser'
import { assignedProgramQueryKey } from './api'
import { NewAssignedProgramExercisePage } from './NewAssignedProgramExercisePage'
import { expectProgramLoadError, expectProgramNotAvailable } from './programNotAvailableAssertions'
import type { AssignedProgramDetail } from './types'

// The program's add page (step 3b-1b). The page itself — the picker round
// trip, the form, its validation, the workout in the address — is the
// template's NewWorkoutExerciseView, tested through NewProgramExercisePage.
// These tests cover what is the PROGRAM's: its route and request (no
// position sent), its cache entry, its address, and a closed program.

const fetchMock = vi.fn<typeof fetch>()
vi.stubGlobal('fetch', fetchMock)

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status })
}

function apiError(statusCode: number, message: string) {
  return json({ statusCode, message: [message], error: 'Error' }, statusCode)
}

// Two workouts: A (Mobility, one exercise) and B (Strength, empty).
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
  schedules: [],
  workouts: [
    { id: 57, assignedProgramId: 12, name: 'Mobility', sortOrder: 0 },
    { id: 58, assignedProgramId: 12, name: 'Strength', sortOrder: 1 },
  ],
  exercises: [],
  retiredExercises: [],
}

const SQUAT = {
  id: 5,
  externalId: null,
  name: 'Squat',
  primaryMuscles: ['legs'],
  secondaryMuscles: [],
  equipment: [],
  instructions: ['Bend your knees'],
  images: [],
  source: 'custom',
  createdBy: 7,
  isArchived: false,
  author: null,
}

// The program as the backend answers after the add.
const ANSWERED = { ...PROGRAM, title: 'Knee Rehab — Pat (answered)' }

// Every request, as [method, path, body].
let requests: [string, string, string | undefined][]
let program: () => Response
let addAnswer: () => Response

// GET /users/6 — the program's patient: only `isActive` matters here
// (decisions §22 — a deactivated patient's program can't change).
let patientActive: boolean
const patientAnswer = () =>
  json({ id: 6, firstName: 'Pat', lastName: 'Lee', roles: ['patient'], isActive: patientActive })

beforeEach(() => {
  fetchMock.mockReset()
  requests = []
  patientActive = true
  program = () => json(PROGRAM)
  addAnswer = () => json(ANSWERED, 201)
  fetchMock.mockImplementation((input, init) => {
    const path = new URL(input as string, 'http://x').pathname
    const method = init?.method ?? 'GET'
    requests.push([method, path, init?.body as string | undefined])
    if (method === 'GET' && path === '/assigned-programs/12') return Promise.resolve(program())
    if (method === 'GET' && path === '/users/6') return Promise.resolve(patientAnswer())
    if (method === 'GET' && path === '/exercises/5') return Promise.resolve(json(SQUAT))
    if (method === 'POST' && path === '/assigned-programs/12/exercises') {
      return Promise.resolve(addAnswer())
    }
    return Promise.reject(new Error(`Unhandled fetch in test: ${method} ${path}`))
  })
})

function renderAt(path: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  queryClient.setQueryData(currentUserQueryKey, { id: 3, preferredWeightUnit: 'kg' })
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route
            path="/practitioner/programs/assigned/:id/exercises/new"
            element={<NewAssignedProgramExercisePage />}
          />
          <Route path="/practitioner/programs/assigned/:id" element={<p>Program page</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return { queryClient, user: userEvent.setup() }
}

const posts = () => requests.filter(([method]) => method === 'POST')

describe('NewAssignedProgramExercisePage', () => {
  it('says an address whose id is not a program id is not available — asking nothing', async () => {
    renderAt('/practitioner/programs/assigned/abc/exercises/new')
    await expectProgramNotAvailable()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('names the program and its workout, and sends the picker back here with the workout', async () => {
    renderAt('/practitioner/programs/assigned/12/exercises/new?workoutId=58')

    expect(await screen.findByRole('heading', { name: 'Knee Rehab — Pat' })).toBeInTheDocument()
    expect(screen.getByText(/To workout/)).toHaveTextContent('To workout B · Strength')
    expect(screen.getByRole('link', { name: 'Select from Library' })).toHaveAttribute(
      'href',
      '/practitioner/library/pick?returnTo=' +
        encodeURIComponent('/practitioner/programs/assigned/12/exercises/new?workoutId=58'),
    )
    expect(screen.getByRole('link', { name: 'Cancel' })).toHaveAttribute(
      'href',
      '/practitioner/programs/assigned/12',
    )
  })

  // The literal body: the workout and the prescription, and NO sortOrder —
  // the backend appends (3b-0). A JSON.stringify of an object with
  // undefined keys would hide a missing field; a literal can't.
  it('adds it to the workout with its prescription, no position, then shows the program as answered', async () => {
    const { queryClient, user } = renderAt(
      '/practitioner/programs/assigned/12/exercises/new?workoutId=58&exerciseId=5',
    )
    await screen.findByRole('heading', { name: 'Squat' })
    await user.type(screen.getByLabelText('Sets'), '3')
    await user.type(screen.getByLabelText('Reps'), '12')
    await user.type(screen.getByLabelText('Weight'), '20')
    await user.click(screen.getByRole('button', { name: 'Add' }))

    expect(await screen.findByText('Program page')).toBeInTheDocument()
    expect(posts()).toStrictEqual([
      [
        'POST',
        '/assigned-programs/12/exercises',
        '{"exerciseId":5,"workoutId":58,"sets":3,"reps":12,"weight":20,"weightUnit":"kg"}',
      ],
    ])
    // The answer is in the program's cache entry: the program page shows
    // the new card without asking again.
    expect(queryClient.getQueryData(assignedProgramQueryKey(12))).toStrictEqual(ANSWERED)
  })

  it('names no workout when the address names none (a one-workout program)', async () => {
    const { user } = renderAt('/practitioner/programs/assigned/12/exercises/new?exerciseId=5')
    await screen.findByRole('heading', { name: 'Squat' })
    await user.click(screen.getByRole('button', { name: 'Add' }))

    await waitFor(() =>
      expect(posts()).toStrictEqual([['POST', '/assigned-programs/12/exercises', '{"exerciseId":5}']]),
    )
  })

  it("says the workout is no longer the program's, rather than adding it elsewhere", async () => {
    renderAt('/practitioner/programs/assigned/12/exercises/new?workoutId=999&exerciseId=5')
    await screen.findByRole('heading', { name: 'Squat' })

    expect(screen.getByRole('alert')).toHaveTextContent(
      'This workout is no longer part of the program. Go back to the program and use the Add card of the workout you want.',
    )
    expect(screen.getByRole('button', { name: 'Add' })).toBeDisabled()
  })

  it("shows the backend's refusal and stays on the page", async () => {
    addAnswer = () => apiError(409, 'This program is completed: it can no longer change')
    const { user } = renderAt('/practitioner/programs/assigned/12/exercises/new?exerciseId=5')
    await screen.findByRole('heading', { name: 'Squat' })
    await user.click(screen.getByRole('button', { name: 'Add' }))

    expect(
      await screen.findByText('This program is completed: it can no longer change'),
    ).toBeInTheDocument()
    expect(screen.queryByText('Program page')).not.toBeInTheDocument()
  })

  it.each([
    ['completed', { status: 'completed' }],
    ['cancelled', { status: 'cancelled' }],
    ['deleted', { isArchived: true }],
  ])('says a %s program can no longer change, with no form', async (_label, change) => {
    program = () => json({ ...PROGRAM, ...change })
    renderAt('/practitioner/programs/assigned/12/exercises/new?exerciseId=5')

    expect(await screen.findByRole('alert')).toHaveTextContent(
      "This program is closed: its exercises can't change any more.",
    )
    expect(screen.getByRole('link', { name: 'Back to the program' })).toHaveAttribute(
      'href',
      '/practitioner/programs/assigned/12',
    )
    expect(screen.queryByRole('button', { name: 'Add' })).not.toBeInTheDocument()
  })

  it("says a deactivated patient's open program takes no new exercise, with no form", async () => {
    patientActive = false
    renderAt('/practitioner/programs/assigned/12/exercises/new?exerciseId=5')

    expect(await screen.findByRole('alert')).toHaveTextContent(
      "This patient's account is deactivated: no exercise can be added until an admin reactivates it.",
    )
    expect(screen.queryByRole('button', { name: 'Add' })).not.toBeInTheDocument()
  })

  it("says so when the program doesn't exist, or isn't the practitioner's to see", async () => {
    program = () => apiError(404, 'Assigned program not found')
    renderAt('/practitioner/programs/assigned/12/exercises/new')

    await expectProgramNotAvailable()
    expect(screen.queryByRole('button', { name: 'Add' })).not.toBeInTheDocument()
  })

  it('reports any other failure as a failure to load this program', async () => {
    program = () => apiError(500, 'Internal server error')
    renderAt('/practitioner/programs/assigned/12/exercises/new')
    await expectProgramLoadError('this program')
  })
})