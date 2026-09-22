import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router'
import { TemplateExercisesPage } from './TemplateExercisesPage'
import type { ProgramTemplateDetail, TemplateExercise } from './types'

const fetchMock = vi.fn<typeof fetch>()
vi.stubGlobal('fetch', fetchMock)

beforeEach(() => {
  fetchMock.mockReset()
})

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status })
}

function makeRow(overrides: Partial<TemplateExercise> = {}): TemplateExercise {
  return {
    id: 1,
    templateId: 1,
    exerciseId: 5,
    sets: null,
    reps: null,
    durationInSeconds: null,
    weight: null,
    weightUnit: null,
    sortOrder: 0,
    notes: null,
    exercise: { id: 5, name: 'Squat', primaryMuscles: ['legs'] },
    ...overrides,
  }
}

function makeTemplate(
  overrides: Partial<ProgramTemplateDetail> = {},
): ProgramTemplateDetail {
  return {
    id: 1,
    practitionerId: 7,
    title: 'Shoulder Rehab',
    description: null,
    isArchived: false,
    exercises: [],
    ...overrides,
  }
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
            path="/practitioner/programs/templates/:id/exercises"
            element={<TemplateExercisesPage />}
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

describe('TemplateExercisesPage', () => {
  it('shows an invalid-template message for a non-numeric id, without fetching', () => {
    renderAt('/practitioner/programs/templates/not-a-number/exercises')
    expect(screen.getByText('Invalid template.')).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('shows a loading state before the template resolves', () => {
    fetchMock.mockReturnValue(new Promise(() => {}))
    renderAt('/practitioner/programs/templates/1/exercises')
    expect(screen.getByText('Loading…')).toBeInTheDocument()
  })

  it('shows an error state when the fetch fails', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ statusCode: 500, message: ['Internal error'] }, 500),
    )
    renderAt('/practitioner/programs/templates/1/exercises')
    expect(
      await screen.findByText("Couldn't load this template. Try refreshing."),
    ).toBeInTheDocument()
  })

  it("shows the template's title", async () => {
    fetchMock.mockResolvedValue(jsonResponse(makeTemplate()))
    renderAt('/practitioner/programs/templates/1/exercises')
    expect(
      await screen.findByRole('heading', { name: 'Shoulder Rehab' }),
    ).toBeInTheDocument()
  })

  it('shows the Add card FIRST when the template has no exercises yet', async () => {
    fetchMock.mockResolvedValue(jsonResponse(makeTemplate({ exercises: [] })))
    renderAt('/practitioner/programs/templates/1/exercises')

    const addLink = await screen.findByRole('link', {
      name: 'Add New Exercise',
    })
    expect(addLink).toHaveAttribute(
      'href',
      '/practitioner/programs/templates/1/exercises/new',
    )
    // Add card + Done — no exercise cards to compare against yet.
    expect(screen.getAllByRole('link')).toHaveLength(2)
  })

  it('shows the Add card LAST, after every exercise card, once the template has exercises', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(
        makeTemplate({
          exercises: [
            makeRow({ id: 1, exercise: { id: 5, name: 'Squat', primaryMuscles: ['legs'] } }),
            makeRow({ id: 2, exercise: { id: 6, name: 'Lunge', primaryMuscles: ['legs'] } }),
          ],
        }),
      ),
    )
    renderAt('/practitioner/programs/templates/1/exercises')
    await screen.findByText('Squat')

    const links = screen.getAllByRole('link')
    // Squat card, Lunge card, Add card, then Done — in that order.
    expect(links).toHaveLength(4)
    expect(links[0]).toHaveTextContent('Squat')
    expect(links[1]).toHaveTextContent('Lunge')
    expect(links[2]).toHaveTextContent('Add New Exercise')
    expect(links[3]).toHaveTextContent('Done')
  })

  it('renders muscles and set/rep/duration details when present', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(
        makeTemplate({
          exercises: [
            makeRow({
              sets: 3,
              reps: 10,
              exercise: { id: 5, name: 'Squat', primaryMuscles: ['legs', 'core'] },
            }),
          ],
        }),
      ),
    )
    renderAt('/practitioner/programs/templates/1/exercises')

    expect(await screen.findByText('legs, core')).toBeInTheDocument()
    expect(screen.getByText('3 sets · 10 reps')).toBeInTheDocument()
  })

  it('renders weight alongside sets/reps when set', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(
        makeTemplate({
          exercises: [makeRow({ sets: 3, reps: 10, weight: 62.5, weightUnit: 'kg' })],
        }),
      ),
    )
    renderAt('/practitioner/programs/templates/1/exercises')

    expect(
      await screen.findByText('3 sets · 10 reps · 62.5 kg'),
    ).toBeInTheDocument()
  })

  it('renders a weight of exactly 0 — a real value, not the same as unset', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(
        makeTemplate({
          exercises: [makeRow({ weight: 0, weightUnit: 'kg' })],
        }),
      ),
    )
    renderAt('/practitioner/programs/templates/1/exercises')

    expect(await screen.findByText('0 kg')).toBeInTheDocument()
  })

  it('falls back gracefully when a row has no exercise details', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(
        makeTemplate({ exercises: [makeRow({ exercise: null })] }),
      ),
    )
    renderAt('/practitioner/programs/templates/1/exercises')
    expect(await screen.findByText('Unknown exercise')).toBeInTheDocument()
  })

  it('removing an exercise calls the DELETE endpoint and updates the list', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(
        makeTemplate({
          exercises: [
            makeRow({ id: 1, exercise: { id: 5, name: 'Squat', primaryMuscles: [] } }),
            makeRow({ id: 2, exercise: { id: 6, name: 'Lunge', primaryMuscles: [] } }),
          ],
        }),
      ),
    )
    const user = userEvent.setup()
    renderAt('/practitioner/programs/templates/1/exercises')
    await screen.findByText('Squat')

    fetchMock.mockResolvedValueOnce(
      jsonResponse(
        makeTemplate({
          exercises: [
            makeRow({ id: 2, exercise: { id: 6, name: 'Lunge', primaryMuscles: [] } }),
          ],
        }),
      ),
    )
    await user.click(
      screen.getByRole('button', { name: 'Remove Squat from template' }),
    )

    await waitFor(() =>
      expect(fetchMock).toHaveBeenLastCalledWith(
        expect.stringContaining('/programs/1/exercises/1'),
        expect.objectContaining({ method: 'DELETE' }),
      ),
    )
    await waitFor(() =>
      expect(screen.queryByText('Squat')).not.toBeInTheDocument(),
    )
    expect(screen.getByText('Lunge')).toBeInTheDocument()
  })

  it('shows an error message when removal fails', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(makeTemplate({ exercises: [makeRow({ id: 1 })] })),
    )
    const user = userEvent.setup()
    renderAt('/practitioner/programs/templates/1/exercises')
    await screen.findByText('Squat')

    fetchMock.mockResolvedValueOnce(
      jsonResponse({ statusCode: 500, message: ['Internal error'] }, 500),
    )
    await user.click(
      screen.getByRole('button', { name: 'Remove Squat from template' }),
    )

    expect(
      await screen.findByText("Couldn't remove that exercise. Try again."),
    ).toBeInTheDocument()
  })

  it('the Done button navigates to the template detail page', async () => {
    fetchMock.mockResolvedValue(jsonResponse(makeTemplate()))
    const user = userEvent.setup()
    renderAt('/practitioner/programs/templates/1/exercises')
    await screen.findByRole('heading', { name: 'Shoulder Rehab' })

    await user.click(screen.getByRole('link', { name: 'Done' }))
    expect(
      await screen.findByText('Template detail page'),
    ).toBeInTheDocument()
  })
})