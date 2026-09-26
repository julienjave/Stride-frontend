import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router'
import { currentUserQueryKey } from '@/auth/useCurrentUser'
import type { WeightUnit } from '@/common/weight'
import { NewProgramExercisePage } from './NewProgramExercisePage'

const fetchMock = vi.fn<typeof fetch>()
vi.stubGlobal('fetch', fetchMock)

beforeEach(() => {
  fetchMock.mockReset()
})

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status })
}

const template = {
  id: 1,
  practitionerId: 7,
  title: 'Shoulder Rehab',
  description: null,
  isArchived: false,
  exercises: [
    {
      id: 50,
      templateId: 1,
      exerciseId: 99,
      name: 'Existing',
      primaryMuscles: [],
      secondaryMuscles: [],
      equipment: [],
      instructions: [],
      sets: null,
      reps: null,
      durationInSeconds: null,
      weight: null,
      weightUnit: null,
      sortOrder: 0,
      notes: null,
      exercise: null,
    },
  ],
}

const pickedExercise = {
  id: 5,
  externalId: null,
  name: 'Squat',
  primaryMuscles: ['legs'],
  secondaryMuscles: ['core'],
  equipment: ['barbell'],
  instructions: ['Stand up straight', 'Bend your knees'],
  images: [{ objectKey: 'a.jpg', url: 'https://example.com/a.jpg' }],
  source: 'custom',
  createdBy: 7,
  isArchived: false,
  author: null,
}

function setupFetchMock(config: {
  templateOverride?: unknown
  addExerciseResponse?: Response
}) {
  fetchMock.mockImplementation((input, init) => {
    const url = input as string
    const method = init?.method ?? 'GET'

    if (method === 'GET' && /\/programs\/\d+$/.test(url)) {
      return Promise.resolve(
        jsonResponse(config.templateOverride ?? template),
      )
    }
    if (method === 'GET' && /\/exercises\/\d+$/.test(url)) {
      return Promise.resolve(jsonResponse(pickedExercise))
    }
    if (method === 'POST' && /\/programs\/\d+\/exercises$/.test(url)) {
      return Promise.resolve(
        config.addExerciseResponse ?? jsonResponse(template, 201),
      )
    }
    return Promise.reject(new Error(`Unhandled fetch in test: ${url}`))
  })
}

// The practitioner's own unit setting, seeded as the current user — which
// also keeps useCurrentUser() from fetching /auth/me during the test.
function renderAt(path: string, preferredWeightUnit: WeightUnit = 'kg') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  queryClient.setQueryData(currentUserQueryKey, { id: 7, preferredWeightUnit })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route
            path="/practitioner/programs/templates/:id/exercises/new"
            element={<NewProgramExercisePage />}
          />
          <Route
            path="/practitioner/programs/templates/:id"
            element={<div>Template detail page</div>}
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('NewProgramExercisePage', () => {
  it('shows an invalid-template message for a non-numeric id', () => {
    renderAt('/practitioner/programs/templates/not-a-number/exercises/new')
    expect(screen.getByText('Invalid template.')).toBeInTheDocument()
  })

  it('shows the template title, subtitle, and a Select from Library link with the correct returnTo when nothing is picked', async () => {
    setupFetchMock({})
    renderAt('/practitioner/programs/templates/1/exercises/new')

    expect(
      await screen.findByRole('heading', { name: 'Shoulder Rehab' }),
    ).toBeInTheDocument()
    expect(screen.getByText('- Add Exercise -')).toBeInTheDocument()
    expect(screen.getByText('No exercise selected yet')).toBeInTheDocument()

    const pickerLink = screen.getByRole('link', { name: 'Select from Library' })
    expect(pickerLink).toHaveAttribute(
      'href',
      '/practitioner/library/pick?returnTo=' +
        encodeURIComponent(
          '/practitioner/programs/templates/1/exercises/new',
        ),
    )
  })

  it('fetches and shows the picked exercise once exerciseId is in the URL', async () => {
    setupFetchMock({})
    renderAt(
      '/practitioner/programs/templates/1/exercises/new?exerciseId=5',
    )

    expect(
      await screen.findByRole('heading', { name: 'Squat' }),
    ).toBeInTheDocument()
    expect(screen.getByText('legs')).toBeInTheDocument()
    expect(screen.getByText('core')).toBeInTheDocument()
    expect(screen.getByText('barbell')).toBeInTheDocument()
    expect(screen.getByText('Stand up straight')).toBeInTheDocument()
    expect(screen.getByAltText('Squat photo 1')).toBeInTheDocument()
  })

  it('the submit button is disabled until an exercise is picked', async () => {
    setupFetchMock({})
    renderAt('/practitioner/programs/templates/1/exercises/new')
    await screen.findByRole('heading', { name: 'Shoulder Rehab' })
    expect(screen.getByRole('button', { name: 'Add' })).toBeDisabled()
  })

  it('submits with all prescription fields left empty — every field is optional', async () => {
    setupFetchMock({})
    const user = userEvent.setup()
    renderAt(
      '/practitioner/programs/templates/1/exercises/new?exerciseId=5',
    )
    await screen.findByRole('heading', { name: 'Squat' })

    await user.click(screen.getByRole('button', { name: 'Add' }))

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/programs/1/exercises'),
        expect.objectContaining({
          method: 'POST',
          // sortOrder: 1 — the template fixture already has one
          // exercise (sortOrder 0), so this one appends after it.
          body: JSON.stringify({
            exerciseId: 5,
            sortOrder: 1,
          }),
        }),
      ),
    )
    expect(
      await screen.findByText('Template detail page'),
    ).toBeInTheDocument()
  })

  it('submits sets/reps/duration/weight when filled in', async () => {
    setupFetchMock({})
    const user = userEvent.setup()
    renderAt(
      '/practitioner/programs/templates/1/exercises/new?exerciseId=5',
    )
    await screen.findByRole('heading', { name: 'Squat' })

    await user.type(screen.getByLabelText('Sets'), '3')
    await user.type(screen.getByLabelText('Reps'), '10')
    await user.type(screen.getByLabelText('Weight'), '62.5')
    await user.click(screen.getByRole('button', { name: 'kg' }))
    await user.click(screen.getByRole('button', { name: 'Add' }))

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/programs/1/exercises'),
        expect.objectContaining({
          body: JSON.stringify({
            exerciseId: 5,
            sets: 3,
            reps: 10,
            weight: 62.5,
            weightUnit: 'kg',
            sortOrder: 1,
          }),
        }),
      ),
    )
  })

  it("pre-selects the practitioner's preferred unit, and a typed weight is saved in it", async () => {
    setupFetchMock({})
    const user = userEvent.setup()
    renderAt(
      '/practitioner/programs/templates/1/exercises/new?exerciseId=5',
      'lbs',
    )
    await screen.findByRole('heading', { name: 'Squat' })

    expect(screen.getByRole('button', { name: 'lbs' })).toHaveAttribute('aria-pressed', 'true')

    // No click on the toggle: the pre-selected unit is what's sent.
    await user.type(screen.getByLabelText('Weight'), '45')
    await user.click(screen.getByRole('button', { name: 'Add' }))

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/programs/1/exercises'),
        expect.objectContaining({
          body: JSON.stringify({ exerciseId: 5, weight: 45, weightUnit: 'lbs', sortOrder: 1 }),
        }),
      ),
    )
  })

  // A unit is ALWAYS selected, so "a unit but no weight" is simply an
  // exercise without a weight: added normally, with no weight fields.
  it('adds an exercise with no weight, without sending the pre-selected unit', async () => {
    setupFetchMock({})
    const user = userEvent.setup()
    renderAt(
      '/practitioner/programs/templates/1/exercises/new?exerciseId=5',
    )
    await screen.findByRole('heading', { name: 'Squat' })

    await user.type(screen.getByLabelText('Sets'), '3')
    await user.click(screen.getByRole('button', { name: 'Add' }))

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/programs/1/exercises'),
        expect.objectContaining({
          body: JSON.stringify({ exerciseId: 5, sets: 3, sortOrder: 1 }),
        }),
      ),
    )
  })

  it('shows the API error message when the request fails', async () => {
    setupFetchMock({
      addExerciseResponse: jsonResponse(
        { statusCode: 400, message: ['Duplicate exercise'] },
        400,
      ),
    })
    const user = userEvent.setup()
    renderAt(
      '/practitioner/programs/templates/1/exercises/new?exerciseId=5',
    )
    await screen.findByRole('heading', { name: 'Squat' })
    await user.click(screen.getByRole('button', { name: 'Add' }))

    expect(
      await screen.findByText('Duplicate exercise'),
    ).toBeInTheDocument()
  })

  it("has a Cancel link back to the template's own page", async () => {
    setupFetchMock({})
    renderAt('/practitioner/programs/templates/1/exercises/new')
    await screen.findByRole('heading', { name: 'Shoulder Rehab' })

    expect(screen.getByRole('link', { name: 'Cancel' })).toHaveAttribute(
      'href',
      '/practitioner/programs/templates/1',
    )
  })
})