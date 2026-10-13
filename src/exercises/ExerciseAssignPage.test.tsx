import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router'
import { ExerciseAssignPage } from './ExerciseAssignPage'
import { currentUserQueryKey } from '@/auth/useCurrentUser'
import type { ProgramTemplate, ProgramTemplateDetail } from '@/programs/types'
import type {
  AssignedProgram,
  AssignedProgramDetail,
} from '@/assigned-programs/types'

const fetchMock = vi.fn<typeof fetch>()
vi.stubGlobal('fetch', fetchMock)

beforeEach(() => {
  fetchMock.mockReset()
})

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status })
}

// Both usePrograms() and useAssignedPrograms() mount and fetch in
// PARALLEL regardless of which toggle is active, and confirming an
// assignment fires a THIRD, different request (GET the target's detail,
// then POST the add) — sequential mockResolvedValueOnce chaining would
// be fragile given no guaranteed ordering between the two parallel list
// fetches. Dispatching on the URL itself is deterministic regardless of
// which request actually happens first.
function setupFetchMock(config: {
  templates?: ProgramTemplate[]
  assignedPrograms?: AssignedProgram[]
  templateDetail?: ProgramTemplateDetail
  assignedDetail?: AssignedProgramDetail
  addExerciseResponse?: Response
}) {
  fetchMock.mockImplementation((input, init) => {
    // apiRequest (api/client.ts) always calls fetch with a plain
    // template-string URL, never a URL or Request object — an assertion
    // here, not String(input), since a Request has no meaningful
    // toString() and could silently stringify to "[object Object]"
    // (exactly what @typescript-eslint/no-base-to-string is warning
    // about); this reflects what's actually true about the one real
    // caller in this codebase, not a loophole around the check.
    const url = input as string
    const method = init?.method ?? 'GET'

    if (method === 'GET' && url.endsWith('/programs')) {
      return Promise.resolve(jsonResponse(config.templates ?? []))
    }
    if (method === 'GET' && url.endsWith('/assigned-programs')) {
      return Promise.resolve(jsonResponse(config.assignedPrograms ?? []))
    }
    if (method === 'GET' && /\/programs\/\d+$/.test(url)) {
      return Promise.resolve(jsonResponse(config.templateDetail))
    }
    if (method === 'GET' && /\/assigned-programs\/\d+$/.test(url)) {
      return Promise.resolve(jsonResponse(config.assignedDetail))
    }
    if (
      method === 'POST' &&
      (/\/programs\/\d+\/exercises$/.test(url) ||
        /\/assigned-programs\/\d+\/exercises$/.test(url))
    ) {
      return Promise.resolve(
        config.addExerciseResponse ?? jsonResponse({}, 201),
      )
    }
    return Promise.reject(new Error(`Unhandled fetch in test: ${url}`))
  })
}

function renderAt(
  path: string,
  currentUser: { id: number; activeRole: string } = {
    id: 7,
    activeRole: 'practitioner',
  },
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  queryClient.setQueryData(currentUserQueryKey, currentUser)
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route
            path="/practitioner/library/:id/assign"
            element={<ExerciseAssignPage />}
          />
          <Route
            path="/practitioner/library/:id"
            element={<div>Exercise detail page</div>}
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('ExerciseAssignPage', () => {
  it('shows an invalid-exercise message for a non-numeric id, without fetching', () => {
    renderAt('/practitioner/library/not-a-number/assign')
    expect(screen.getByText('Invalid exercise.')).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('shows the title and both toggle buttons, Template active by default', async () => {
    setupFetchMock({})
    renderAt('/practitioner/library/42/assign')
    expect(screen.getByText('Assign Exercise to')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Template' }),
    ).toHaveAttribute('aria-pressed', 'true')
    expect(
      screen.getByRole('button', { name: 'Assigned Program' }),
    ).toHaveAttribute('aria-pressed', 'false')
    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
  })

  it('shows only templates the current practitioner can modify, not every template returned', async () => {
    setupFetchMock({
      templates: [
        { id: 1, practitionerId: 7, title: 'My Template', description: null, isArchived: false },
        { id: 2, practitionerId: 999, title: "Someone Else's Template", description: null, isArchived: false },
      ],
    })
    renderAt('/practitioner/library/42/assign')

    expect(await screen.findByText('My Template')).toBeInTheDocument()
    expect(
      screen.queryByText("Someone Else's Template"),
    ).not.toBeInTheDocument()
  })

  it('shows an admin every template, since assertCanModify allows admins on anything', async () => {
    setupFetchMock({
      templates: [
        { id: 1, practitionerId: 7, title: 'Practitioner A Template', description: null, isArchived: false },
        { id: 2, practitionerId: 999, title: 'Practitioner B Template', description: null, isArchived: false },
      ],
    })
    renderAt('/practitioner/library/42/assign', { id: 1, activeRole: 'admin' })

    expect(
      await screen.findByText('Practitioner A Template'),
    ).toBeInTheDocument()
    expect(screen.getByText('Practitioner B Template')).toBeInTheDocument()
  })

  it('shows every assigned program returned, with no client-side filtering', async () => {
    setupFetchMock({
      assignedPrograms: [
        {
          id: 1,
          patientId: 50,
          assignedBy: 7,
          basedOnTemplateId: null,
          title: 'Patient A Program',
          startDate: '2026-01-01',
          endDate: null,
          status: 'active',
          isArchived: false,
          basedOnProgramId: null,
          allowSwaps: true,
          schedules: [],
        },
      ],
    })
    const user = userEvent.setup()
    renderAt('/practitioner/library/42/assign')
    await user.click(screen.getByRole('button', { name: 'Assigned Program' }))

    expect(await screen.findByText('Patient A Program')).toBeInTheDocument()
  })

  it('shows an empty-state message when there is nothing to show', async () => {
    setupFetchMock({ templates: [] })
    renderAt('/practitioner/library/42/assign')
    expect(
      await screen.findByText('No templates available yet.'),
    ).toBeInTheDocument()
  })

  it('clicking a template opens a confirmation dialog naming it', async () => {
    setupFetchMock({
      templates: [
        { id: 1, practitionerId: 7, title: 'Shoulder Rehab', description: null, isArchived: false },
      ],
    })
    const user = userEvent.setup()
    renderAt('/practitioner/library/42/assign')
    await user.click(await screen.findByText('Shoulder Rehab'))

    expect(
      await screen.findByText('Assign to Shoulder Rehab?'),
    ).toBeInTheDocument()
  })

  it('Cancel closes the dialog without calling the assign endpoint', async () => {
    setupFetchMock({
      templates: [
        { id: 1, practitionerId: 7, title: 'Shoulder Rehab', description: null, isArchived: false },
      ],
    })
    const user = userEvent.setup()
    renderAt('/practitioner/library/42/assign')
    await user.click(await screen.findByText('Shoulder Rehab'))
    await screen.findByText('Assign to Shoulder Rehab?')

    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    await waitFor(() =>
      expect(
        screen.queryByText('Assign to Shoulder Rehab?'),
      ).not.toBeInTheDocument(),
    )
    expect(
      fetchMock.mock.calls.some(([, init]) => init?.method === 'POST'),
    ).toBe(false)
  })

  it('confirming a template assignment fetches the current exercise count, POSTs with the right sortOrder, and navigates to the exercise page', async () => {
    setupFetchMock({
      templates: [
        { id: 1, practitionerId: 7, title: 'Shoulder Rehab', description: null, isArchived: false },
      ],
      templateDetail: {
        id: 1,
        practitionerId: 7,
        title: 'Shoulder Rehab',
        description: null,
        isArchived: false,
        workouts: [{ id: 1, templateId: 1, name: null, sortOrder: 0 }],
        exercises: [
          { id: 10, templateId: 1, workoutId: 1, exerciseId: 5, sets: null, reps: null, durationInSeconds: null, weight: null, weightUnit: null, sortOrder: 0, notes: null, exercise: null },
          { id: 11, templateId: 1, workoutId: 1, exerciseId: 6, sets: null, reps: null, durationInSeconds: null, weight: null, weightUnit: null, sortOrder: 1, notes: null, exercise: null },
        ],
      },
    })
    const user = userEvent.setup()
    renderAt('/practitioner/library/42/assign')
    await user.click(await screen.findByText('Shoulder Rehab'))
    await screen.findByText('Assign to Shoulder Rehab?')

    await user.click(screen.getByRole('button', { name: 'Confirm' }))

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/programs/1/exercises'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ exerciseId: 42, sortOrder: 2 }),
        }),
      ),
    )
    expect(
      await screen.findByText('Exercise detail page'),
    ).toBeInTheDocument()
  })

  it("on a two-workout template, adds it after the LAST exercise of workout A — not at the template's count", async () => {
    // A holds positions 0 and 2 (one was removed); B has two more. The end of
    // A is 3; the template's count (4) would be wrong too as soon as gaps
    // or B's exercises are counted.
    const row = (id: number, workoutId: number, sortOrder: number) => ({
      id, templateId: 1, workoutId, exerciseId: id, sets: null, reps: null, durationInSeconds: null,
      weight: null, weightUnit: null, sortOrder, notes: null, exercise: null,
    })
    setupFetchMock({
      templates: [
        { id: 1, practitionerId: 7, title: 'Knee Rehab', description: null, isArchived: false },
      ],
      templateDetail: {
        id: 1,
        practitionerId: 7,
        title: 'Knee Rehab',
        description: null,
        isArchived: false,
        workouts: [
          { id: 57, templateId: 1, name: 'Mobility', sortOrder: 0 },
          { id: 58, templateId: 1, name: null, sortOrder: 1 },
        ],
        exercises: [row(10, 57, 0), row(11, 57, 2), row(12, 58, 0), row(13, 58, 1)],
      },
    })
    const user = userEvent.setup()
    renderAt('/practitioner/library/42/assign')
    await user.click(await screen.findByText('Knee Rehab'))
    await screen.findByText('Assign to Knee Rehab?')

    await user.click(screen.getByRole('button', { name: 'Confirm' }))

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/programs/1/exercises'),
        expect.objectContaining({ method: 'POST', body: '{"exerciseId":42,"sortOrder":3}' }),
      ),
    )
  })

  // One request, no position: the backend appends to the first workout
  // (step 3b-0). The program is not read first any more.
  it('confirming an assigned-program assignment POSTs just the exercise to the assigned-programs endpoint', async () => {
    setupFetchMock({
      assignedPrograms: [
        {
          id: 9,
          patientId: 50,
          assignedBy: 7,
          basedOnTemplateId: null,
          title: 'Patient A Program',
          startDate: '2026-01-01',
          endDate: null,
          status: 'active',
          isArchived: false,
          basedOnProgramId: null,
          allowSwaps: true,
          schedules: [],
        },
      ],
    })
    const user = userEvent.setup()
    renderAt('/practitioner/library/42/assign')
    await user.click(screen.getByRole('button', { name: 'Assigned Program' }))
    await user.click(await screen.findByText('Patient A Program'))
    await screen.findByText('Assign to Patient A Program?')

    await user.click(screen.getByRole('button', { name: 'Confirm' }))

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/assigned-programs/9/exercises'),
        expect.objectContaining({ method: 'POST', body: '{"exerciseId":42}' }),
      ),
    )
    expect(
      fetchMock.mock.calls.filter(([url]) =>
        /\/assigned-programs\/9$/.test(url as string),
      ),
    ).toEqual([])
  })

  it('shows the API error and keeps the dialog open when confirming fails', async () => {
    setupFetchMock({
      templates: [
        { id: 1, practitionerId: 7, title: 'Shoulder Rehab', description: null, isArchived: false },
      ],
      templateDetail: {
        id: 1,
        practitionerId: 7,
        title: 'Shoulder Rehab',
        description: null,
        isArchived: false,
        workouts: [{ id: 1, templateId: 1, name: null, sortOrder: 0 }],
        exercises: [],
      },
      addExerciseResponse: jsonResponse(
        { statusCode: 500, message: ['Internal error'] },
        500,
      ),
    })
    const user = userEvent.setup()
    renderAt('/practitioner/library/42/assign')
    await user.click(await screen.findByText('Shoulder Rehab'))
    await user.click(screen.getByRole('button', { name: 'Confirm' }))

    expect(await screen.findByText('Internal error')).toBeInTheDocument()
    expect(screen.getByText('Assign to Shoulder Rehab?')).toBeInTheDocument()
  })

  it('the Back button links to the exercise detail page without calling any assign endpoint', async () => {
    setupFetchMock({})
    renderAt('/practitioner/library/42/assign')
    await waitFor(() => expect(fetchMock).toHaveBeenCalled())

    expect(screen.getByRole('link', { name: 'Back' })).toHaveAttribute(
      'href',
      '/practitioner/library/42',
    )
  })
})