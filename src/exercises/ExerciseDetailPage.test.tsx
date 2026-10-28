import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router'
import { ExerciseDetailPage } from './ExerciseDetailPage'
import { currentUserQueryKey } from '@/auth/useCurrentUser'
import {
  errorResponse,
  expectLoadError,
  expectRecordNotFound,
  retryThenExpectFocusOn,
} from '@/common/loadFailureAssertions'
import { exercisesListQueryKey } from './api'
import type { ExerciseDetail } from './types'
import { expectLoading } from '@/common/loadingAssertions'

const fetchMock = vi.fn<typeof fetch>()
vi.stubGlobal('fetch', fetchMock)

beforeEach(() => {
  fetchMock.mockReset()
})

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status })
}

function makeExercise(overrides: Partial<ExerciseDetail> = {}): ExerciseDetail {
  return {
    id: 1,
    externalId: null,
    name: 'Wall Slide',
    primaryMuscles: ['shoulders'],
    secondaryMuscles: [],
    equipment: [],
    instructions: ['Step one'],
    images: [],
    source: 'custom',
    createdBy: 7,
    isArchived: false,
    author: { firstName: 'Practitioner', lastName: 'A' },
    ...overrides,
  }
}

function renderAt(
  path: string,
  currentUser: { id: number; activeRole: string } = {
    id: 7,
    activeRole: 'practitioner',
  },
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  }),
) {
  queryClient.setQueryData(currentUserQueryKey, currentUser)
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route
            path="/practitioner/library/:id"
            element={<ExerciseDetailPage />}
          />
          <Route
            path="/practitioner/library"
            element={<div>Library page</div>}
          />
          <Route path="/somewhere-else" element={<div>Somewhere else</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('ExerciseDetailPage', () => {
  it('an id that is not a number: "Exercise not found", without asking the server', async () => {
    renderAt('/practitioner/library/not-a-number')
    await expectRecordNotFound('exercise', [['Exercise Library', '/practitioner/library']])
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('a 404: "Exercise not found", with the way back to the library and no Try again', async () => {
    fetchMock.mockResolvedValue(errorResponse(404, ['Exercise 1 not found']))
    renderAt('/practitioner/library/1')
    await expectRecordNotFound('exercise', [['Exercise Library', '/practitioner/library']])
  })

  it('shows a loading state before the exercise resolves', () => {
    fetchMock.mockReturnValue(new Promise(() => {}))
    renderAt('/practitioner/library/1')
    expectLoading('Loading…')
  })

  it('any other failure: the load error with its reason; a retry that works puts focus on the name', async () => {
    const user = userEvent.setup()
    fetchMock
      .mockResolvedValueOnce(errorResponse(500))
      .mockResolvedValueOnce(jsonResponse(makeExercise()))
    renderAt('/practitioner/library/1')
    await expectLoadError('this exercise')
    expect(screen.getByRole('link', { name: 'Exercise Library' })).toHaveAttribute(
      'href',
      '/practitioner/library',
    )
    await retryThenExpectFocusOn(user, { level: 1, name: 'Wall Slide' })
  })

  it("renders the name as a heading and the author's name below it", async () => {
    fetchMock.mockResolvedValue(jsonResponse(makeExercise()))
    renderAt('/practitioner/library/1')
    expect(
      await screen.findByRole('heading', { name: 'Wall Slide' }),
    ).toBeInTheDocument()
    expect(screen.getByText('by Practitioner A')).toBeInTheDocument()
  })

  it('shows no author line at all for a shared exercise with no author', async () => {
    fetchMock.mockResolvedValue(jsonResponse(makeExercise({ author: null })))
    renderAt('/practitioner/library/1')
    await screen.findByRole('heading', { name: 'Wall Slide' })
    expect(screen.queryByText(/^by /)).not.toBeInTheDocument()
  })

  describe('for the practitioner who owns this exercise', () => {
    it('shows edit pencils, Manage Photos, and the Delete button', async () => {
      fetchMock.mockResolvedValue(jsonResponse(makeExercise({ createdBy: 7 })))
      renderAt('/practitioner/library/1', { id: 7, activeRole: 'practitioner' })
      await screen.findByRole('heading', { name: 'Wall Slide' })

      expect(
        screen.getByRole('button', { name: 'Edit exercise name' }),
      ).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: 'Edit Primary Muscles' }),
      ).toBeInTheDocument()
      expect(
        screen.getByRole('link', { name: 'Manage Photos' }),
      ).toHaveAttribute('href', '/practitioner/library/1/photos')
      expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument()
    })
  })

  describe('for a practitioner who does NOT own this exercise', () => {
    it('shows no edit pencils, no Manage Photos, and no Delete button', async () => {
      fetchMock.mockResolvedValue(
        jsonResponse(makeExercise({ source: 'custom', createdBy: 999 })),
      )
      renderAt('/practitioner/library/1', { id: 7, activeRole: 'practitioner' })
      await screen.findByRole('heading', { name: 'Wall Slide' })

      expect(
        screen.queryByRole('button', { name: 'Edit exercise name' }),
      ).not.toBeInTheDocument()
      expect(
        screen.queryByRole('button', { name: 'Edit Primary Muscles' }),
      ).not.toBeInTheDocument()
      expect(
        screen.queryByRole('link', { name: 'Manage Photos' }),
      ).not.toBeInTheDocument()
      expect(
        screen.queryByRole('button', { name: 'Delete' }),
      ).not.toBeInTheDocument()
    })

    it('still shows Assign and Back to Library for a shared/other-owned exercise', async () => {
      fetchMock.mockResolvedValue(
        jsonResponse(makeExercise({ source: 'api', createdBy: null })),
      )
      renderAt('/practitioner/library/1', { id: 7, activeRole: 'practitioner' })
      await screen.findByRole('heading', { name: 'Wall Slide' })

      expect(screen.getByRole('link', { name: 'Assign' })).toHaveAttribute(
        'href',
        '/practitioner/library/1/assign',
      )
      expect(
        screen.getByRole('link', { name: 'Back to Library' }),
      ).toHaveAttribute('href', '/practitioner/library')
    })
  })

  describe('returnTo-aware back button', () => {
    it('navigates to returnTo, labeled plainly "Back", when one is provided', async () => {
      fetchMock.mockResolvedValue(jsonResponse(makeExercise()))
      renderAt(
        '/practitioner/library/1?returnTo=%2Fsomewhere-else',
        { id: 7, activeRole: 'practitioner' },
      )
      await screen.findByRole('heading', { name: 'Wall Slide' })

      // Not "Back to Library" — that label would be misleading once
      // this is actually going somewhere else.
      expect(
        screen.queryByRole('link', { name: 'Back to Library' }),
      ).not.toBeInTheDocument()
      const backLink = screen.getByRole('link', { name: 'Back' })
      expect(backLink).toHaveAttribute('href', '/somewhere-else')
    })

    // `returnTo` comes from the address bar: another site's address keeps
    // only its path (localPath) — Back can't be an open redirect (D-3).
    it('never sends the practitioner to another site', async () => {
      fetchMock.mockResolvedValue(jsonResponse(makeExercise()))
      renderAt(
        `/practitioner/library/1?returnTo=${encodeURIComponent('https://elsewhere.example/login')}`,
      )
      expect(await screen.findByRole('link', { name: 'Back' })).toHaveAttribute(
        'href',
        '/login',
      )
    })
  })

  describe('editing a field end to end', () => {
    it('actually updates the displayed name after a successful save — the one thing the isolated EditableExerciseTitle test cannot itself verify', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(makeExercise()))
      const user = userEvent.setup()
      renderAt('/practitioner/library/1')
      await screen.findByRole('heading', { name: 'Wall Slide' })

      fetchMock.mockResolvedValueOnce(
        jsonResponse(makeExercise({ name: 'New Name' })),
      )
      await user.click(screen.getByRole('button', { name: 'Edit exercise name' }))
      await user.clear(screen.getByLabelText('Exercise name'))
      await user.type(screen.getByLabelText('Exercise name'), 'New Name')
      await user.click(screen.getByRole('button', { name: 'Save name' }))

      // This IS the real, wired-together app: ExerciseDetailPage's own
      // useExercise() shares the exact cache key EditableExerciseTitle's
      // mutation writes to, so it re-renders with the fresh name —
      // exactly the behavior the isolated component test explicitly
      // couldn't observe with its static prop.
      expect(
        await screen.findByRole('heading', { name: 'New Name' }),
      ).toBeInTheDocument()
      // What the page's `save` sent — a literal body.
      expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({
        method: 'PATCH',
        body: '{"name":"New Name"}',
      })
    })
  })

  // The fields only ask to save (step D-3); what saving MEANS on this page —
  // the request, the cache entry the page reads, the library's lists — is the
  // page's `save`, checked here.
  describe("the page's save", () => {
    // Answers GET with the exercise and PATCH with the exercise as changed,
    // recording every request: [method, path, body].
    function serve(exerciseFields: Partial<ExerciseDetail> = {}) {
      const requests: [string, string, string | undefined][] = []
      let current = makeExercise(exerciseFields)
      fetchMock.mockImplementation((input, init) => {
        const method = init?.method ?? 'GET'
        const body = init?.body as string | undefined
        requests.push([method, new URL(input as string, 'http://x').pathname, body])
        if (method === 'PATCH') {
          current = { ...current, ...(JSON.parse(body ?? '{}') as object) }
        }
        return Promise.resolve(jsonResponse(current))
      })
      return requests
    }

    it("PATCHes one list and shows the exercise the server answered", async () => {
      const requests = serve()
      const user = userEvent.setup()
      renderAt('/practitioner/library/1')
      await user.click(
        await screen.findByRole('button', { name: 'Edit Primary Muscles' }),
      )
      await user.click(screen.getByRole('button', { name: '+ Add primary muscle' }))
      await user.type(screen.getByLabelText('Primary Muscles 2'), 'traps')
      await user.click(screen.getByRole('button', { name: 'Save Primary Muscles' }))

      expect(await screen.findByText('shoulders, traps')).toBeInTheDocument()
      expect(requests.filter(([method]) => method === 'PATCH')).toStrictEqual([
        ['PATCH', '/exercises/1', '{"primaryMuscles":["shoulders","traps"]}'],
      ])
    })

    // The library's cards show the name and muscles too.
    it("marks the library's lists stale after a save", async () => {
      serve()
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
      })
      const listKey = exercisesListQueryKey({})
      queryClient.setQueryData(listKey, { items: [], total: 0 })
      const user = userEvent.setup()
      renderAt('/practitioner/library/1', undefined, queryClient)

      await user.click(await screen.findByRole('button', { name: 'Edit exercise name' }))
      await user.clear(screen.getByLabelText('Exercise name'))
      await user.type(screen.getByLabelText('Exercise name'), 'New Name')
      expect(queryClient.getQueryState(listKey)?.isInvalidated).toBe(false)
      await user.click(screen.getByRole('button', { name: 'Save name' }))

      await waitFor(() =>
        expect(queryClient.getQueryState(listKey)?.isInvalidated).toBe(true),
      )
    })

    // Steps up to 1,000 characters (descriptionRules.ts — 26 imported
    // exercises have a step longer than 500): the page's list is given the
    // shared rules.
    it('accepts an instruction step of 1,000 characters and refuses 1,001', async () => {
      const requests = serve()
      const user = userEvent.setup()
      renderAt('/practitioner/library/1')
      await user.click(await screen.findByRole('button', { name: 'Edit Instructions' }))
      const step = screen.getByLabelText('Instructions 1')

      await user.clear(step)
      await user.click(step)
      await user.paste('a'.repeat(1001))
      await user.click(screen.getByRole('button', { name: 'Save Instructions' }))
      expect(
        await screen.findByText('Must be 1000 characters or fewer'),
      ).toBeInTheDocument()

      await user.type(step, '{Backspace}')
      await user.click(screen.getByRole('button', { name: 'Save Instructions' }))
      await waitFor(() =>
        expect(requests.filter(([method]) => method === 'PATCH')).toStrictEqual([
          ['PATCH', '/exercises/1', JSON.stringify({ instructions: ['a'.repeat(1000)] })],
        ]),
      )
    })
  })

  describe('photos section', () => {
    it('shows "No photos yet" when the gallery is empty', async () => {
      fetchMock.mockResolvedValue(jsonResponse(makeExercise({ images: [] })))
      renderAt('/practitioner/library/1')
      await screen.findByRole('heading', { name: 'Wall Slide' })
      expect(screen.getByText('No photos yet.')).toBeInTheDocument()
    })

    it('renders each photo and marks the first one as the Cover', async () => {
      fetchMock.mockResolvedValue(
        jsonResponse(
          makeExercise({
            images: [
              { objectKey: 'a.jpg', url: 'https://signed.example/a.jpg' },
              { objectKey: 'b.jpg', url: 'https://signed.example/b.jpg' },
            ],
          }),
        ),
      )
      renderAt('/practitioner/library/1')
      await screen.findByRole('heading', { name: 'Wall Slide' })

      expect(screen.getByAltText('Wall Slide photo 1')).toHaveAttribute(
        'src',
        'https://signed.example/a.jpg',
      )
      expect(screen.getByAltText('Wall Slide photo 2')).toHaveAttribute(
        'src',
        'https://signed.example/b.jpg',
      )
      // Exactly one "Cover" label, and only the first photo gets it.
      expect(screen.getAllByText('Cover')).toHaveLength(1)
    })
  })
})