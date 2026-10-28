import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router'
import { ProgramExercisePage } from './ProgramExercisePage'
import {
  errorResponse,
  expectLoadError,
  expectRecordNotFound,
  retryThenExpectFocusOn,
} from '@/common/loadFailureAssertions'
import { currentUserQueryKey } from '@/auth/useCurrentUser'

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
  // The template's FIRST read fails with this status; later reads work
  // (so a "Try again" can succeed).
  templateFailsOnceWith?: number
  // The library exercise's first read fails (a 500); later reads work.
  exerciseFailsOnce?: boolean
  removeResponse?: Response
}) {
  let templateFailures = config.templateFailsOnceWith ? 1 : 0
  let exerciseFailures = config.exerciseFailsOnce ? 1 : 0
  fetchMock.mockImplementation((input, init) => {
    const url = input as string
    const method = init?.method ?? 'GET'

    if (method === 'GET' && /\/programs\/\d+$/.test(url)) {
      if (templateFailures > 0) {
        templateFailures -= 1
        return Promise.resolve(errorResponse(config.templateFailsOnceWith ?? 500))
      }
      return Promise.resolve(jsonResponse(config.templateOverride ?? template))
    }
    if (method === 'GET' && /\/exercises\/\d+$/.test(url)) {
      if (exerciseFailures > 0) {
        exerciseFailures -= 1
        return Promise.resolve(errorResponse(500))
      }
      return Promise.resolve(jsonResponse(fullExercise))
    }
    // Saving a field (step 3b-1b: the page's own `save`): the template as
    // the backend answers, with the change applied to the row.
    if (method === 'PATCH' && /\/programs\/\d+\/exercises\/\d+$/.test(url)) {
      const changes = JSON.parse(init?.body as string) as Record<string, unknown>
      return Promise.resolve(
        jsonResponse({
          ...template,
          exercises: [{ ...template.exercises[0], ...changes }],
        }),
      )
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

// Defaults to the template's owner (practitionerId 7 above), so every
// existing test keeps exercising the editable view; the read-only tests
// at the bottom pass a different user explicitly. Seeded straight into
// the cache — same approach as ExerciseDetailPage.test — so
// useCurrentUser() never tries to fetch /auth/me in a test.
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
            path="/practitioner/programs/templates/:id/exercises/:templateExerciseId"
            element={<ProgramExercisePage />}
          />
          <Route
            path="/practitioner/programs/templates/:id"
            element={<div>Template detail page</div>}
          />
          <Route path="/somewhere-else" element={<div>Somewhere else</div>} />
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
  it('a template id that is not a number: "Template not found", without fetching', async () => {
    renderAt('/practitioner/programs/templates/not-a-number/exercises/50')
    await expectRecordNotFound('template', [['Programs', '/practitioner/programs']])
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('an exercise id that is not a number: "Exercise not found", back to the template', async () => {
    renderAt('/practitioner/programs/templates/1/exercises/not-a-number')
    await expectRecordNotFound('exercise', [
      ['Back to the template', '/practitioner/programs/templates/1'],
      ['Programs', '/practitioner/programs'],
    ])
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('the template answers 404: "Template not found"', async () => {
    setupFetchMock({ templateFailsOnceWith: 404 })
    renderAt('/practitioner/programs/templates/1/exercises/50')
    await expectRecordNotFound('template', [['Programs', '/practitioner/programs']])
  })

  it('the template has no such exercise (removed since): "Exercise not found", back to the template', async () => {
    setupFetchMock({})
    renderAt('/practitioner/programs/templates/1/exercises/51')
    await expectRecordNotFound('exercise', [
      ['Back to the template', '/practitioner/programs/templates/1'],
      ['Programs', '/practitioner/programs'],
    ])
  })

  it('shows a loading state before the template resolves', () => {
    fetchMock.mockReturnValue(new Promise(() => {}))
    renderAt('/practitioner/programs/templates/1/exercises/50')
    expect(screen.getByText('Loading…')).toBeInTheDocument()
  })

  it("the template's read fails otherwise: the load error; a retry that works focuses the title", async () => {
    const user = userEvent.setup()
    setupFetchMock({ templateFailsOnceWith: 500 })
    renderAt('/practitioner/programs/templates/1/exercises/50')
    await expectLoadError('this exercise')
    await retryThenExpectFocusOn(user, { level: 1, name: 'Shoulder Rehab' })
  })

  it("the library exercise's details fail: their own load error under the title; a retry focuses the name", async () => {
    const user = userEvent.setup()
    setupFetchMock({ exerciseFailsOnce: true })
    renderAt('/practitioner/programs/templates/1/exercises/50')
    await expectLoadError("this exercise's details")
    // The rest of the page is there: the title and the prescription.
    expect(screen.getByRole('heading', { level: 1, name: 'Shoulder Rehab' })).toBeInTheDocument()
    await retryThenExpectFocusOn(user, { level: 2, name: 'Squat' })
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
      '/practitioner/programs/templates/1/exercises/50?returnTo=%2Fsomewhere-else',
    )
    await screen.findByRole('heading', { name: 'Squat' })

    const link = screen.getByRole('link', { name: 'Find it in Library' })
    expect(link).toHaveAttribute(
      'href',
      '/practitioner/library/5?returnTo=' +
        encodeURIComponent(
          '/practitioner/programs/templates/1/exercises/50?returnTo=%2Fsomewhere-else',
        ),
    )
  })

  it("falls back to the template's own page when returnTo is missing from the URL", async () => {
    setupFetchMock({})
    const user = userEvent.setup()
    renderAt('/practitioner/programs/templates/1/exercises/50')
    await screen.findByRole('heading', { name: 'Squat' })

    await user.click(screen.getByRole('link', { name: 'Done' }))
    expect(
      await screen.findByText('Template detail page'),
    ).toBeInTheDocument()
  })

  it('the Done button navigates to the provided returnTo', async () => {
    setupFetchMock({})
    const user = userEvent.setup()
    renderAt(
      '/practitioner/programs/templates/1/exercises/50?returnTo=%2Fsomewhere-else',
    )
    await screen.findByRole('heading', { name: 'Squat' })

    // A returnTo deliberately DIFFERENT from the fallback, so this test
    // can only pass if the param is really being read.
    expect(screen.getByRole('link', { name: 'Done' })).toHaveAttribute(
      'href',
      '/somewhere-else',
    )
    await user.click(screen.getByRole('link', { name: 'Done' }))
    expect(await screen.findByText('Somewhere else')).toBeInTheDocument()
  })

  // Since 3b-1b returnTo goes through localPath: it comes from the address
  // bar, and an absolute address would send Done to another site.
  it('never sends Done to another site', async () => {
    setupFetchMock({})
    renderAt(
      `/practitioner/programs/templates/1/exercises/50?returnTo=${encodeURIComponent('https://elsewhere.example/login')}`,
    )
    await screen.findByRole('heading', { name: 'Squat' })

    expect(screen.getByRole('link', { name: 'Done' })).toHaveAttribute('href', '/login')
  })

  // The fields save through the page (step 3b-1b): the request is the
  // TEMPLATE's — a literal body — and the answer lands in the template's
  // cache entry, which the page reads, so the new value shows.
  it("saves a field as a PATCH of the template's row, then shows the answered value", async () => {
    setupFetchMock({})
    const user = userEvent.setup()
    renderAt('/practitioner/programs/templates/1/exercises/50')
    await user.click(await screen.findByRole('button', { name: 'Edit Sets' }))
    await user.clear(screen.getByLabelText('Sets'))
    await user.type(screen.getByLabelText('Sets'), '5')
    await user.click(screen.getByRole('button', { name: 'Save Sets' }))

    expect(await screen.findByText('5')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/programs\/1\/exercises\/50$/),
      expect.objectContaining({ method: 'PATCH', body: '{"sets":5}' }),
    )
  })

  it('clears a field with an explicit null in the request', async () => {
    setupFetchMock({})
    const user = userEvent.setup()
    renderAt('/practitioner/programs/templates/1/exercises/50')
    await user.click(await screen.findByRole('button', { name: 'Edit Reps' }))
    await user.clear(screen.getByLabelText('Reps'))
    await user.click(screen.getByRole('button', { name: 'Save Reps' }))

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringMatching(/\/programs\/1\/exercises\/50$/),
        expect.objectContaining({ method: 'PATCH', body: '{"reps":null}' }),
      ),
    )
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
      await screen.findByText('Template detail page'),
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
      screen.queryByText('Template detail page'),
    ).not.toBeInTheDocument()
  })

  describe('read-only mode', () => {
    // Every edit affordance on this page: the five field pencils and the
    // Remove button. Checked by role + name pattern, so a newly added
    // editable field that forgot to respect canEdit would be caught too.
    function expectNoEditControls() {
      expect(
        screen.queryByRole('button', { name: /^Edit / }),
      ).not.toBeInTheDocument()
      expect(
        screen.queryByRole('button', { name: 'Remove from Template' }),
      ).not.toBeInTheDocument()
    }

    it("shows another practitioner's template exercise with no edit controls", async () => {
      setupFetchMock({})
      renderAt('/practitioner/programs/templates/1/exercises/50', {
        id: 999,
        activeRole: 'practitioner',
      })
      await screen.findByRole('heading', { name: 'Squat' })

      expect(screen.getByText('- View Exercise -')).toBeInTheDocument()
      // Values are still shown — read-only, not hidden.
      expect(screen.getByText('3')).toBeInTheDocument()
      expectNoEditControls()
      expect(screen.getByRole('link', { name: 'Back' })).toBeInTheDocument()
    })

    it('is read-only for an archived template, even for its owner', async () => {
      setupFetchMock({ templateOverride: { ...template, isArchived: true } })
      renderAt('/practitioner/programs/templates/1/exercises/50')
      await screen.findByRole('heading', { name: 'Squat' })

      expect(screen.getByText('- View Exercise -')).toBeInTheDocument()
      expectNoEditControls()
    })
  })
})