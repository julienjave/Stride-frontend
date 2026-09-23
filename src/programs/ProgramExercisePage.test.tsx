import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router'
import { ProgramExercisePage } from './ProgramExercisePage'

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
      exerciseId: 5,
      name: 'Squat',
      sets: 3,
      reps: 10,
      durationInSeconds: null,
      weight: null,
      weightUnit: null,
      sortOrder: 0,
      notes: null,
      exercise: { id: 5, name: 'Squat', primaryMuscles: ['legs'] },
    },
  ],
}

const fullExercise = {
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
  templateError?: boolean
  removeResponse?: Response
}) {
  fetchMock.mockImplementation((input, init) => {
    const url = input as string
    const method = init?.method ?? 'GET'

    if (method === 'GET' && /\/programs\/\d+$/.test(url)) {
      return config.templateError
        ? Promise.resolve(
            jsonResponse({ statusCode: 500, message: ['Internal error'] }, 500),
          )
        : Promise.resolve(jsonResponse(config.templateOverride ?? template))
    }
    if (method === 'GET' && /\/exercises\/\d+$/.test(url)) {
      return Promise.resolve(jsonResponse(fullExercise))
    }
    if (method === 'DELETE' && /\/programs\/\d+\/exercises\/\d+$/.test(url)) {
      return Promise.resolve(
        config.removeResponse ??
          jsonResponse({ ...template, exercises: [] }, 200),
      )
    }
    return Promise.reject(new Error(`Unhandled fetch in test: ${url}`))
  })
}

function renderAt(path: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route
            path="/practitioner/programs/templates/:id/exercises/:templateExerciseId"
            element={<ProgramExercisePage />}
          />
          <Route
            path="/practitioner/programs/templates/:id/exercises"
            element={<div>Template exercises page</div>}
          />
          <Route
            path="/practitioner/library/:exerciseId"
            element={<div>Exercise detail page</div>}
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('ProgramExercisePage', () => {
  it('shows an invalid-exercise message for a non-numeric template id', () => {
    renderAt('/practitioner/programs/templates/not-a-number/exercises/50')
    expect(screen.getByText('Invalid exercise.')).toBeInTheDocument()
  })

  it('shows an invalid-exercise message for a non-numeric row id', () => {
    renderAt('/practitioner/programs/templates/1/exercises/not-a-number')
    expect(screen.getByText('Invalid exercise.')).toBeInTheDocument()
  })

  it('shows a loading state before the template resolves', () => {
    fetchMock.mockReturnValue(new Promise(() => {}))
    renderAt('/practitioner/programs/templates/1/exercises/50')
    expect(screen.getByText('Loading…')).toBeInTheDocument()
  })

  it('shows an error state when the template fetch fails', async () => {
    setupFetchMock({ templateError: true })
    renderAt('/practitioner/programs/templates/1/exercises/50')
    expect(
      await screen.findByText("Couldn't load this exercise. Try refreshing."),
    ).toBeInTheDocument()
  })

  it('shows the template title, subtitle, exercise name, and read-only details', async () => {
    setupFetchMock({})
    renderAt('/practitioner/programs/templates/1/exercises/50')

    expect(
      await screen.findByRole('heading', { name: 'Shoulder Rehab' }),
    ).toBeInTheDocument()
    expect(screen.getByText('- Edit Exercise -')).toBeInTheDocument()
    expect(
      await screen.findByRole('heading', { name: 'Squat' }),
    ).toBeInTheDocument()
    expect(screen.getByText('legs')).toBeInTheDocument()
    expect(screen.getByText('core')).toBeInTheDocument()
    expect(screen.getByText('barbell')).toBeInTheDocument()
    expect(screen.getByText('Stand up straight')).toBeInTheDocument()
    expect(screen.getByAltText('Squat photo 1')).toBeInTheDocument()
  })

  it('shows the editable prescription fields with their current values', async () => {
    setupFetchMock({})
    renderAt('/practitioner/programs/templates/1/exercises/50')
    await screen.findByRole('heading', { name: 'Squat' })

    expect(screen.getByText('Sets')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('Reps')).toBeInTheDocument()
    expect(screen.getByText('10')).toBeInTheDocument()
    expect(screen.getByText('Weight')).toBeInTheDocument()
    expect(screen.getByText('Notes')).toBeInTheDocument()
  })

  it('the "Find it in Library" link points to the exercise, with returnTo chained back to this exact page', async () => {
    setupFetchMock({})
    renderAt(
      '/practitioner/programs/templates/1/exercises/50?returnTo=%2Fpractitioner%2Fprograms%2Ftemplates%2F1%2Fexercises',
    )
    await screen.findByRole('heading', { name: 'Squat' })

    const link = screen.getByRole('link', { name: 'Find it in Library' })
    expect(link).toHaveAttribute(
      'href',
      '/practitioner/library/5?returnTo=' +
        encodeURIComponent(
          '/practitioner/programs/templates/1/exercises/50?returnTo=%2Fpractitioner%2Fprograms%2Ftemplates%2F1%2Fexercises',
        ),
    )
  })

  it('falls back to the exercises list when returnTo is missing from the URL', async () => {
    setupFetchMock({})
    const user = userEvent.setup()
    renderAt('/practitioner/programs/templates/1/exercises/50')
    await screen.findByRole('heading', { name: 'Squat' })

    await user.click(screen.getByRole('link', { name: 'Done' }))
    expect(
      await screen.findByText('Template exercises page'),
    ).toBeInTheDocument()
  })

  it('the Done button navigates to the provided returnTo', async () => {
    setupFetchMock({})
    const user = userEvent.setup()
    renderAt(
      '/practitioner/programs/templates/1/exercises/50?returnTo=%2Fpractitioner%2Fprograms%2Ftemplates%2F1%2Fexercises',
    )
    await screen.findByRole('heading', { name: 'Squat' })

    expect(screen.getByRole('link', { name: 'Done' })).toHaveAttribute(
      'href',
      '/practitioner/programs/templates/1/exercises',
    )
    await user.click(screen.getByRole('link', { name: 'Done' }))
    expect(
      await screen.findByText('Template exercises page'),
    ).toBeInTheDocument()
  })

  it('Remove from Template calls DELETE immediately, with no confirmation dialog, and navigates to returnTo', async () => {
    setupFetchMock({})
    const user = userEvent.setup()
    renderAt('/practitioner/programs/templates/1/exercises/50')
    await screen.findByRole('heading', { name: 'Squat' })

    await user.click(
      screen.getByRole('button', { name: 'Remove from Template' }),
    )

    await waitFor(() =>
      expect(fetchMock).toHaveBeenLastCalledWith(
        expect.stringContaining('/programs/1/exercises/50'),
        expect.objectContaining({ method: 'DELETE' }),
      ),
    )
    expect(
      await screen.findByText('Template exercises page'),
    ).toBeInTheDocument()
  })

  it('shows an error message when removal fails, without navigating away', async () => {
    setupFetchMock({
      removeResponse: jsonResponse(
        { statusCode: 500, message: ['Internal error'] },
        500,
      ),
    })
    const user = userEvent.setup()
    renderAt('/practitioner/programs/templates/1/exercises/50')
    await screen.findByRole('heading', { name: 'Squat' })

    await user.click(
      screen.getByRole('button', { name: 'Remove from Template' }),
    )

    expect(
      await screen.findByText("Couldn't remove this exercise. Try again."),
    ).toBeInTheDocument()
    expect(
      screen.queryByText('Template exercises page'),
    ).not.toBeInTheDocument()
  })
})