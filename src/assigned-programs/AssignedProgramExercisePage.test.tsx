import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router'
import { currentUserQueryKey } from '@/auth/useCurrentUser'
import { AssignedProgramExercisePage } from './AssignedProgramExercisePage'
import type { AssignedProgramDetail, AssignedProgramExercise } from './types'

// One exercise of a program, and its prescription (step 3b-1b). The
// per-field editors are the template page's (tested with a mock `save` in
// src/programs/Editable*Field.test); here, what the PROGRAM's page adds:
// the request each save becomes (literal bodies), the answer written where
// the page reads it, the program's own copy of the description, a closed
// program, removed exercises, and a safe way back.

const fetchMock = vi.fn<typeof fetch>()
vi.stubGlobal('fetch', fetchMock)

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status })
}

function apiError(statusCode: number, message: string) {
  return json({ statusCode, message: [message], error: 'Error' }, statusCode)
}

function exercise(id: number, fields: Partial<AssignedProgramExercise> = {}): AssignedProgramExercise {
  return {
    id,
    assignedProgramId: 12,
    workoutId: 57,
    exerciseId: 5,
    name: 'Glute Bridge',
    primaryMuscles: ['glutes'],
    secondaryMuscles: ['hamstrings'],
    equipment: [],
    instructions: ['Lie on your back', 'Lift your hips'],
    sets: 3,
    reps: 10,
    durationInSeconds: null,
    weight: 20,
    weightUnit: 'kg',
    sortOrder: 0,
    notes: 'Keep the pelvis level.',
    retiredAt: null,
    retiredBy: null,
    ...fields,
  }
}

const BRIDGE = exercise(101)
const REMOVED = exercise(102, {
  name: 'Heel Slides',
  retiredAt: '2031-06-10T09:00:00Z',
  retiredBy: 3,
})

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
  schedules: [],
  workouts: [{ id: 57, assignedProgramId: 12, name: null, sortOrder: 0 }],
  exercises: [BRIDGE],
  retiredExercises: [REMOVED],
}

let requests: [string, string, string | undefined][]
let program: () => Response
// The PATCH's answer: by default the program with the change applied, as
// the backend would answer.
let patchAnswer: (body: Record<string, unknown>) => Response

beforeEach(() => {
  fetchMock.mockReset()
  requests = []
  program = () => json(PROGRAM)
  patchAnswer = (body) => json({ ...PROGRAM, exercises: [{ ...BRIDGE, ...body }] })
  fetchMock.mockImplementation((input, init) => {
    const path = new URL(input as string, 'http://x').pathname
    const method = init?.method ?? 'GET'
    const body = init?.body as string | undefined
    requests.push([method, path, body])
    if (method === 'GET' && path === '/assigned-programs/12') return Promise.resolve(program())
    if (method === 'PATCH' && path === '/assigned-programs/12/exercises/101') {
      return Promise.resolve(patchAnswer(JSON.parse(body ?? '{}') as Record<string, unknown>))
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
            path="/practitioner/programs/assigned/:id/exercises/:rowId"
            element={<AssignedProgramExercisePage />}
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return userEvent.setup()
}

const PAGE = '/practitioner/programs/assigned/12/exercises/101'
const patches = () => requests.filter(([method]) => method === 'PATCH')

describe('AssignedProgramExercisePage — reading', () => {
  it.each([['/practitioner/programs/assigned/abc/exercises/101'], ['/practitioner/programs/assigned/12/exercises/0']])(
    'refuses an address that names no exercise (%s)',
    (path) => {
      renderAt(path)
      expect(screen.getByText('Invalid exercise.')).toBeInTheDocument()
      expect(fetchMock).not.toHaveBeenCalled()
    },
  )

  it("shows the program's own copy of the exercise and its prescription", async () => {
    renderAt(PAGE)

    expect(await screen.findByRole('heading', { name: 'Knee Rehab — Pat' })).toBeInTheDocument()
    expect(screen.getByText('- Edit Exercise -')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Glute Bridge' })).toBeInTheDocument()
    expect(screen.getByText('glutes')).toBeInTheDocument()
    expect(screen.getByText('hamstrings')).toBeInTheDocument()
    expect(screen.getByText('None')).toBeInTheDocument() // no equipment
    expect(screen.getByText('Lift your hips')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('10')).toBeInTheDocument()
    expect(screen.getByText('20 kg')).toBeInTheDocument()
    expect(screen.getByText('Keep the pelvis level.')).toBeInTheDocument()
    // What a change does to sessions already done (3b-0's copies).
    expect(
      screen.getByText(
        'Changes apply to the next sessions. Sessions already done keep the prescription they were given.',
      ),
    ).toBeInTheDocument()
  })

  it.each([
    ['completed', { status: 'completed' }],
    ['cancelled', { status: 'cancelled' }],
    ['deleted', { isArchived: true }],
  ])('is read-only on a %s program', async (_label, change) => {
    program = () => json({ ...PROGRAM, ...change })
    renderAt(PAGE)

    expect(await screen.findByText('- View Exercise -')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Edit / })).not.toBeInTheDocument()
    expect(screen.getByText('This program is closed: its exercises can no longer change.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back' })).toBeInTheDocument()
  })

  // Removed exercises are part of the record, never edited (decided
  // 2026-10-13) — even reached by an old link.
  it('says an exercise was removed, with no editors', async () => {
    renderAt('/practitioner/programs/assigned/12/exercises/102')

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This exercise was removed from the program. It stays in the records of the sessions that used it.',
    )
    expect(screen.queryByRole('button', { name: /^Edit / })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to the program' })).toHaveAttribute(
      'href',
      '/practitioner/programs/assigned/12',
    )
  })

  it("says so when the id isn't one of the program's exercises", async () => {
    renderAt('/practitioner/programs/assigned/12/exercises/999')
    expect(await screen.findByRole('alert')).toHaveTextContent("This exercise isn't part of the program.")
  })

  it("says so when the program doesn't exist, or isn't the practitioner's to see", async () => {
    program = () => apiError(404, 'Assigned program not found')
    renderAt(PAGE)
    expect(
      await screen.findByText("This program doesn't exist, or isn't one you can see."),
    ).toBeInTheDocument()
  })
})

describe('AssignedProgramExercisePage — the way back', () => {
  it('Done goes back to where the practitioner came from', async () => {
    renderAt(`${PAGE}?returnTo=${encodeURIComponent('/practitioner/programs/assigned/12?tab=x')}`)
    expect(await screen.findByRole('link', { name: 'Done' })).toHaveAttribute(
      'href',
      '/practitioner/programs/assigned/12?tab=x',
    )
  })

  it("Done goes to the program's page when no returnTo is given", async () => {
    renderAt(PAGE)
    expect(await screen.findByRole('link', { name: 'Done' })).toHaveAttribute(
      'href',
      '/practitioner/programs/assigned/12',
    )
  })

  // An open redirect closed: another site's address keeps only its path.
  it('never sends the practitioner to another site', async () => {
    renderAt(`${PAGE}?returnTo=${encodeURIComponent('https://elsewhere.example/login')}`)
    expect(await screen.findByRole('link', { name: 'Done' })).toHaveAttribute('href', '/login')
  })

  it('links to the exercise in the library, which comes back to this page', async () => {
    renderAt(`${PAGE}?returnTo=${encodeURIComponent('/practitioner/programs/assigned/12')}`)
    const link = await screen.findByRole('link', { name: 'Find it in Library' })
    const href = link.getAttribute('href') ?? ''
    expect(href.startsWith('/practitioner/library/5?returnTo=')).toBe(true)
    const back = new URL(href, 'http://x').searchParams.get('returnTo')
    expect(back).toBe(`${PAGE}?returnTo=${encodeURIComponent('/practitioner/programs/assigned/12')}`)
  })
})

describe('AssignedProgramExercisePage — changing the prescription', () => {
  // Literal bodies: what the backend receives, null included.
  it('saves a field to the program and shows the value the server answered', async () => {
    const user = renderAt(PAGE)
    await user.click(await screen.findByRole('button', { name: 'Edit Sets' }))
    await user.clear(screen.getByLabelText('Sets'))
    await user.type(screen.getByLabelText('Sets'), '4')
    await user.click(screen.getByRole('button', { name: 'Save Sets' }))

    // The page reads the program's cache entry, which now holds the answer.
    expect(await screen.findByText('4')).toBeInTheDocument()
    expect(patches()).toStrictEqual([['PATCH', '/assigned-programs/12/exercises/101', '{"sets":4}']])
  })

  it('clears a field with an explicit null', async () => {
    const user = renderAt(PAGE)
    await user.click(await screen.findByRole('button', { name: 'Edit Reps' }))
    await user.clear(screen.getByLabelText('Reps'))
    await user.click(screen.getByRole('button', { name: 'Save Reps' }))

    await waitFor(() =>
      expect(patches()).toStrictEqual([['PATCH', '/assigned-programs/12/exercises/101', '{"reps":null}']]),
    )
  })

  it('saves the weight and its unit together', async () => {
    const user = renderAt(PAGE)
    await user.click(await screen.findByRole('button', { name: 'Edit Weight' }))
    await user.clear(screen.getByLabelText('Weight'))
    await user.type(screen.getByLabelText('Weight'), '25')
    await user.click(screen.getByRole('button', { name: 'lbs' }))
    await user.click(screen.getByRole('button', { name: 'Save Weight' }))

    await waitFor(() =>
      expect(patches()).toStrictEqual([
        ['PATCH', '/assigned-programs/12/exercises/101', '{"weight":25,"weightUnit":"lbs"}'],
      ]),
    )
  })

  it('saves the notes', async () => {
    const user = renderAt(PAGE)
    await user.click(await screen.findByRole('button', { name: 'Edit Notes' }))
    await user.clear(screen.getByLabelText('Notes'))
    await user.type(screen.getByLabelText('Notes'), 'Slow on the way down')
    await user.click(screen.getByRole('button', { name: 'Save Notes' }))

    expect(await screen.findByText('Slow on the way down')).toBeInTheDocument()
    expect(patches()).toStrictEqual([
      ['PATCH', '/assigned-programs/12/exercises/101', '{"notes":"Slow on the way down"}'],
    ])
  })

  it("shows the backend's refusal under the field, which stays open", async () => {
    patchAnswer = () => apiError(409, 'This program is completed: it can no longer change')
    const user = renderAt(PAGE)
    await user.click(await screen.findByRole('button', { name: 'Edit Sets' }))
    await user.click(screen.getByRole('button', { name: 'Save Sets' }))

    expect(
      await screen.findByText('This program is completed: it can no longer change'),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save Sets' })).toBeInTheDocument()
  })
})