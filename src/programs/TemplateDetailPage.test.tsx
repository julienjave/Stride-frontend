import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router'
import { TemplateDetailPage } from './TemplateDetailPage'
import { currentUserQueryKey } from '@/auth/useCurrentUser'
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
    workoutId: 1,
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
    description: 'Post-op, weeks 1–4',
    isArchived: false,
    workouts: [{ id: 1, templateId: 1, name: null, sortOrder: 0 }],
    exercises: [],
    ...overrides,
  }
}

const twoExercises = [
  makeRow({ id: 1, exercise: { id: 5, name: 'Squat', primaryMuscles: ['legs'] } }),
  makeRow({ id: 2, exercise: { id: 6, name: 'Lunge', primaryMuscles: ['legs'] } }),
]

// The two viewers the permission tests need (the archived case reuses
// the owner, since "deleted" overrides ownership).
const owner = { id: 7, activeRole: 'practitioner' }
const otherPractitioner = { id: 999, activeRole: 'practitioner' }

function renderAt(
  path: string,
  currentUser: { id: number; activeRole: string; preferredWeightUnit?: string } = owner,
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  // Seeded directly, so useCurrentUser() never fetches /auth/me here —
  // every fetch the tests see is one the page itself made.
  queryClient.setQueryData(currentUserQueryKey, currentUser)
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route
            path="/practitioner/programs/templates/:id"
            element={<TemplateDetailPage />}
          />
          <Route
            path="/practitioner/programs"
            element={<div>Programs hub</div>}
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return { ...utils, queryClient }
}

// The exercise list's own landmark — see the aria-labelledby comment on
// TemplateDetailPage's <section>. Scoping queries to it keeps these
// tests from accidentally counting the page's other links/buttons.
function exercisesSection() {
  return screen.getByRole('region', { name: 'Exercises' })
}

// Every edit control the page can show, by accessible name. Used by the
// read-only tests to prove ALL of them are absent, not just one.
function expectNoEditControls() {
  expect(
    screen.queryByRole('button', { name: 'Edit template title' }),
  ).not.toBeInTheDocument()
  expect(
    screen.queryByRole('button', { name: 'Edit description' }),
  ).not.toBeInTheDocument()
  expect(
    screen.queryByRole('link', { name: 'Add New Exercise' }),
  ).not.toBeInTheDocument()
  expect(
    screen.queryByRole('button', { name: /^Drag to reorder/ }),
  ).not.toBeInTheDocument()
  expect(
    screen.queryByRole('button', { name: /^Remove .* from template$/ }),
  ).not.toBeInTheDocument()
  expect(
    screen.queryByRole('button', { name: 'Delete' }),
  ).not.toBeInTheDocument()
}

describe('TemplateDetailPage — loading and errors', () => {
  it('shows an invalid-template message for a non-numeric id, without fetching', () => {
    renderAt('/practitioner/programs/templates/not-a-number')
    expect(screen.getByText('Invalid template.')).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('shows a loading state before the template resolves', () => {
    fetchMock.mockReturnValue(new Promise(() => {}))
    renderAt('/practitioner/programs/templates/1')
    expect(screen.getByText('Loading…')).toBeInTheDocument()
  })

  it('shows an error state when the fetch fails', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ statusCode: 500, message: ['Internal error'] }, 500),
    )
    renderAt('/practitioner/programs/templates/1')
    expect(
      await screen.findByText("Couldn't load this template. Try refreshing."),
    ).toBeInTheDocument()
  })
})

describe('TemplateDetailPage — as the owner', () => {
  it('shows the title and description, each with its edit pencil', async () => {
    fetchMock.mockResolvedValue(jsonResponse(makeTemplate()))
    renderAt('/practitioner/programs/templates/1')

    expect(
      await screen.findByRole('heading', { name: 'Shoulder Rehab' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Post-op, weeks 1–4')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Edit template title' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Edit description' }),
    ).toBeInTheDocument()
    expect(screen.queryByText(/View only/)).not.toBeInTheDocument()
  })

  it('shows the "Yours" badge beside the title', async () => {
    fetchMock.mockResolvedValue(jsonResponse(makeTemplate()))
    renderAt('/practitioner/programs/templates/1')
    await screen.findByRole('heading', { name: 'Shoulder Rehab' })

    expect(screen.getByText('Yours')).toBeInTheDocument()
  })

  it('shows Duplicate, Delete, and a Back link to the hub', async () => {
    fetchMock.mockResolvedValue(jsonResponse(makeTemplate()))
    renderAt('/practitioner/programs/templates/1')
    await screen.findByRole('heading', { name: 'Shoulder Rehab' })

    expect(screen.getByRole('button', { name: 'Duplicate' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back' })).toHaveAttribute(
      'href',
      '/practitioner/programs',
    )
  })

  it('offers "Assign to a patient", opening the form with this template chosen', async () => {
    fetchMock.mockResolvedValue(jsonResponse(makeTemplate()))
    renderAt('/practitioner/programs/templates/1')
    await screen.findByRole('heading', { name: 'Shoulder Rehab' })

    expect(screen.getByRole('link', { name: 'Assign to a patient' })).toHaveAttribute(
      'href',
      '/practitioner/programs/assigned/new?templateId=1',
    )
  })

  it('shows the Add card FIRST when the template has no exercises yet', async () => {
    fetchMock.mockResolvedValue(jsonResponse(makeTemplate({ exercises: [] })))
    renderAt('/practitioner/programs/templates/1')
    await screen.findByRole('heading', { name: 'Shoulder Rehab' })

    const links = within(exercisesSection()).getAllByRole('link')
    expect(links).toHaveLength(1)
    expect(links[0]).toHaveTextContent('Add New Exercise')
    expect(links[0]).toHaveAttribute(
      'href',
      '/practitioner/programs/templates/1/exercises/new',
    )
  })

  it('shows the Add card LAST, after every exercise card, once the template has exercises', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(makeTemplate({ exercises: twoExercises })),
    )
    renderAt('/practitioner/programs/templates/1')
    await screen.findByText('Squat')

    const links = within(exercisesSection()).getAllByRole('link')
    expect(links).toHaveLength(3)
    expect(links[0]).toHaveTextContent('Squat')
    expect(links[1]).toHaveTextContent('Lunge')
    expect(links[2]).toHaveTextContent('Add New Exercise')
    // Draggable, with a remove button each.
    expect(
      screen.getByRole('button', { name: 'Drag to reorder Squat' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Remove Lunge from template' }),
    ).toBeInTheDocument()
  })

  it("an exercise card links to its view/edit page with returnTo set to THIS page's URL", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(makeTemplate({ exercises: [twoExercises[0]] })),
    )
    renderAt('/practitioner/programs/templates/1')
    const squat = await screen.findByText('Squat')

    // The whole point of the returnTo chain: Done/Back on the exercise
    // page comes back here, to the template's own page.
    expect(squat.closest('a')).toHaveAttribute(
      'href',
      '/practitioner/programs/templates/1/exercises/1?returnTo=' +
        encodeURIComponent('/practitioner/programs/templates/1'),
    )
  })

  it('renders muscles and set/rep details when present', async () => {
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
    renderAt('/practitioner/programs/templates/1')

    expect(await screen.findByText('legs, core')).toBeInTheDocument()
    expect(screen.getByText('3 sets · 10 reps')).toBeInTheDocument()
  })

  it('renders weight alongside sets/reps, including a weight of exactly 0', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(
        makeTemplate({
          exercises: [
            makeRow({ id: 1, sets: 3, reps: 10, weight: 62.5, weightUnit: 'kg' }),
            makeRow({ id: 2, weight: 0, weightUnit: 'kg' }),
          ],
        }),
      ),
    )
    renderAt('/practitioner/programs/templates/1')

    expect(
      await screen.findByText('3 sets · 10 reps · 62.5 kg'),
    ).toBeInTheDocument()
    expect(screen.getByText('0 kg')).toBeInTheDocument()
  })

  // Same card, seen by a practitioner whose setting is lbs: converted, with
  // the prescription kept alongside.
  it("shows each weight in the viewer's preferred unit, keeping the prescribed value", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(
        makeTemplate({
          exercises: [makeRow({ id: 1, sets: 3, weight: 20, weightUnit: 'kg' })],
        }),
      ),
    )
    renderAt('/practitioner/programs/templates/1', { ...owner, preferredWeightUnit: 'lbs' })

    expect(await screen.findByText('3 sets · 44.1 lbs')).toBeInTheDocument()
    expect(screen.getByText('(20 kg)')).toBeInTheDocument()
  })

  it('falls back gracefully when a row has no exercise details', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(makeTemplate({ exercises: [makeRow({ exercise: null })] })),
    )
    renderAt('/practitioner/programs/templates/1')
    expect(await screen.findByText('Unknown exercise')).toBeInTheDocument()
  })

  it('removing an exercise calls the DELETE endpoint and updates the list', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(makeTemplate({ exercises: twoExercises })),
    )
    const user = userEvent.setup()
    renderAt('/practitioner/programs/templates/1')
    await screen.findByText('Squat')

    fetchMock.mockResolvedValueOnce(
      jsonResponse(makeTemplate({ exercises: [twoExercises[1]] })),
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
    // The removed card took the focused button with it: focus goes to the
    // next exercise's Remove instead of falling to the page.
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Remove Lunge from template' }),
      ).toHaveFocus(),
    )
  })

  // While one removal is on its way, only THAT card's Remove is disabled —
  // the others still work (the list decides from the request's variables).
  it('disables only the card being removed', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(makeTemplate({ exercises: twoExercises })))
    const user = userEvent.setup()
    renderAt('/practitioner/programs/templates/1')
    await screen.findByText('Squat')

    // An answer that never comes: the removal stays on its way.
    fetchMock.mockReturnValueOnce(new Promise<Response>(() => {}))
    await user.click(screen.getByRole('button', { name: 'Remove Squat from template' }))

    expect(screen.getByRole('button', { name: 'Remove Squat from template' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Remove Lunge from template' })).toBeEnabled()
  })

  it('shows an error message when removal fails', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(makeTemplate({ exercises: [twoExercises[0]] })),
    )
    const user = userEvent.setup()
    renderAt('/practitioner/programs/templates/1')
    await screen.findByText('Squat')

    fetchMock.mockResolvedValueOnce(
      jsonResponse({ statusCode: 500, message: ['Internal error'] }, 500),
    )
    await user.click(
      screen.getByRole('button', { name: 'Remove Squat from template' }),
    )

    expect(
      await screen.findByText("Couldn't remove that exercise. Something went wrong on our side. Try again in a moment."),
    ).toBeInTheDocument()
  })

  it('keeps the exercise list on screen after renaming the template', async () => {
    // The page-level payoff of making PATCH /programs/:id return the
    // full enriched template: the title editor writes the response
    // straight into the SAME cache entry the list reads. With the old
    // bare-row response, the list would have vanished right here.
    fetchMock.mockResolvedValueOnce(
      jsonResponse(makeTemplate({ exercises: twoExercises })),
    )
    const user = userEvent.setup()
    renderAt('/practitioner/programs/templates/1')
    await screen.findByText('Squat')

    fetchMock.mockResolvedValueOnce(
      jsonResponse(makeTemplate({ title: 'Renamed', exercises: twoExercises })),
    )
    await user.click(screen.getByRole('button', { name: 'Edit template title' }))
    await user.clear(screen.getByLabelText('Template title'))
    await user.type(screen.getByLabelText('Template title'), 'Renamed')
    await user.click(screen.getByRole('button', { name: 'Save title' }))

    expect(
      await screen.findByRole('heading', { name: 'Renamed' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Squat')).toBeInTheDocument()
    expect(screen.getByText('Lunge')).toBeInTheDocument()
  })
})

describe("TemplateDetailPage — someone else's template", () => {
  it('renders read-only, explains why, and still offers Duplicate', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(makeTemplate({ exercises: twoExercises })),
    )
    renderAt('/practitioner/programs/templates/1', otherPractitioner)
    await screen.findByText('Squat')

    expectNoEditControls()
    expect(screen.getByText(/View only/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Duplicate' })).toBeInTheDocument()
    // Assigning COPIES a template, so a colleague's can be assigned too.
    expect(screen.getByRole('link', { name: 'Assign to a patient' })).toBeInTheDocument()
    // Not theirs — no badge. This is the exact case that caused the mix-up
    // with two identically-titled "Copy of ..." templates.
    expect(screen.queryByText('Yours')).not.toBeInTheDocument()
  })

  it('still lets each exercise card open its (read-only) exercise page', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(makeTemplate({ exercises: twoExercises })),
    )
    renderAt('/practitioner/programs/templates/1', otherPractitioner)
    await screen.findByText('Squat')

    const links = within(exercisesSection()).getAllByRole('link')
    expect(links).toHaveLength(2)
    expect(links[0]).toHaveAttribute(
      'href',
      '/practitioner/programs/templates/1/exercises/1?returnTo=' +
        encodeURIComponent('/practitioner/programs/templates/1'),
    )
  })

  it('says so plainly when the template has no exercises, instead of showing an Add card', async () => {
    fetchMock.mockResolvedValue(jsonResponse(makeTemplate({ exercises: [] })))
    renderAt('/practitioner/programs/templates/1', otherPractitioner)
    await screen.findByRole('heading', { name: 'Shoulder Rehab' })

    expect(
      screen.getByText('This template has no exercises.'),
    ).toBeInTheDocument()
    expectNoEditControls()
  })
})

describe('TemplateDetailPage — an archived template', () => {
  it('shows the deleted notice and is fully read-only, even for its owner — no Duplicate either', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(makeTemplate({ isArchived: true, exercises: twoExercises })),
    )
    renderAt('/practitioner/programs/templates/1', owner)
    await screen.findByText('Squat')

    expect(screen.getByRole('status')).toHaveTextContent(
      'This template has been deleted.',
    )
    expectNoEditControls()
    expect(
      screen.queryByRole('button', { name: 'Duplicate' }),
    ).not.toBeInTheDocument()
    // Nor assigned: the backend refuses an archived template (400).
    expect(screen.queryByRole('link', { name: 'Assign to a patient' })).not.toBeInTheDocument()
    // The deleted notice already explains why — no second, misleading
    // "belongs to another practitioner" line for the owner.
    expect(screen.queryByText(/View only/)).not.toBeInTheDocument()
    // Still theirs, though — ownership doesn't end at archiving, even
    // though editing does.
    expect(screen.getByText('Yours')).toBeInTheDocument()
  })
})