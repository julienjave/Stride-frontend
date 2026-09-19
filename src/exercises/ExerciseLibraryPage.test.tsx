import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
import { ExerciseLibraryPage } from './ExerciseLibraryPage'
import type { Exercise } from './types'

const fetchMock = vi.fn<typeof fetch>()
vi.stubGlobal('fetch', fetchMock)

beforeEach(() => {
  fetchMock.mockReset()
})

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/practitioner/library']}>
        <ExerciseLibraryPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status })
}

function makeExercise(overrides: Partial<Exercise> = {}): Exercise {
  return {
    id: 1,
    externalId: null,
    name: 'Wall Slide',
    primaryMuscles: ['shoulders'],
    secondaryMuscles: [],
    equipment: [],
    instructions: ['Step'],
    mediaUrls: [],
    source: 'custom',
    createdBy: 7,
    isArchived: false,
    author: null,
    ...overrides,
  }
}

function pageOf(data: Exercise[], meta: Partial<{ total: number; page: number; totalPages: number }> = {}) {
  return {
    data,
    meta: { total: data.length, page: 1, limit: 20, totalPages: 1, ...meta },
  }
}

describe('ExerciseLibraryPage', () => {
  it('shows a loading state before exercises resolve', () => {
    fetchMock.mockReturnValue(new Promise(() => {})) // never resolves
    renderPage()
    expect(screen.getByText('Loading exercises…')).toBeInTheDocument()
  })

  it('renders the Add New Exercise card first, followed by the fetched exercises', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(
        pageOf([
          makeExercise({ id: 1, name: 'Wall Slide' }),
          makeExercise({ id: 2, name: 'Squat' }),
        ]),
      ),
    )
    renderPage()

    expect(await screen.findByText('Wall Slide')).toBeInTheDocument()
    expect(screen.getByText('Squat')).toBeInTheDocument()

    // The FIRST link in the grid should always be "Add New Exercise",
    // regardless of what was fetched — see AddExerciseCard's own comment
    // on why this can't depend on search/filter/page.
    const links = screen.getAllByRole('link')
    expect(links[0]).toHaveAttribute('href', '/practitioner/library/new')
  })

  it('shows an empty state when no exercises match', async () => {
    fetchMock.mockResolvedValue(jsonResponse(pageOf([], { total: 0 })))
    renderPage()
    expect(
      await screen.findByText('No exercises match your search.'),
    ).toBeInTheDocument()
  })

  it('shows an error state when the fetch fails', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(
        { statusCode: 500, message: ['Internal server error'] },
        500,
      ),
    )
    renderPage()
    expect(
      await screen.findByText("Couldn't load exercises. Try refreshing."),
    ).toBeInTheDocument()
  })

  it('debounces the search input, only firing a request 300ms after typing stops', async () => {
    fetchMock.mockResolvedValue(jsonResponse(pageOf([])))
    renderPage()
    // Wait for the initial load (empty search) under REAL timers first —
    // only the interaction below needs fake ones. Mixing fake timers with
    // waitFor/findBy* (which poll internally) is a well-known source of
    // flakiness, so fake timers are scoped as narrowly as possible.
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))

    vi.useFakeTimers()
    try {
      const input = screen.getByLabelText('Search exercises')
      // fireEvent.change, not userEvent.type — this sets the whole value
      // in one synchronous event rather than one event per character,
      // which matters here because EVERY keystroke would otherwise reset
      // the debounce timer, making "how many ms have passed" ambiguous
      // to reason about in a test.
      fireEvent.change(input, { target: { value: 'quad' } })

      act(() => {
        vi.advanceTimersByTime(200)
      })
      // Only 200 of the 300ms debounce has elapsed — still the old value.
      expect(fetchMock).toHaveBeenCalledTimes(1)

      act(() => {
        vi.advanceTimersByTime(100)
      })
      // A full 300ms since the keystroke: the debounced value updates,
      // which synchronously triggers TanStack Query to call fetchMock
      // again inside this same act() flush. The PROMISE it returns still
      // resolves via real microtasks (unaffected by fake timers), but
      // the CALL itself already happened synchronously here — no waitFor
      // needed.
      expect(fetchMock).toHaveBeenLastCalledWith(
        expect.stringContaining('search=quad'),
        expect.anything(),
      )
    } finally {
      vi.useRealTimers()
    }
  })

  it('requests mine=true when the "only my exercises" toggle is checked, and resets to page 1', async () => {
    fetchMock.mockResolvedValue(jsonResponse(pageOf([])))
    renderPage()
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    expect(fetchMock.mock.calls[0][0]).not.toContain('mine')

    fireEvent.click(screen.getByRole('checkbox', { name: 'Only my exercises' }))

    await waitFor(() =>
      expect(fetchMock).toHaveBeenLastCalledWith(
        expect.stringContaining('mine=true'),
        expect.anything(),
      ),
    )
  })

  it('shows pagination controls only when there is more than one page, and Next requests page 2', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(
        pageOf([makeExercise()], { total: 25, page: 1, totalPages: 2 }),
      ),
    )
    const user = userEvent.setup()
    renderPage()

    expect(await screen.findByText('Page 1 of 2')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled()

    const nextButton = screen.getByRole('button', { name: 'Next' })
    expect(nextButton).not.toBeDisabled()

    fetchMock.mockResolvedValue(
      jsonResponse(
        pageOf([makeExercise({ id: 2 })], {
          total: 25,
          page: 2,
          totalPages: 2,
        }),
      ),
    )
    await user.click(nextButton)

    await waitFor(() =>
      expect(fetchMock).toHaveBeenLastCalledWith(
        expect.stringContaining('page=2'),
        expect.anything(),
      ),
    )
  })

  it('does not show pagination controls when there is only one page', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(pageOf([makeExercise()], { total: 1, totalPages: 1 })),
    )
    renderPage()
    await screen.findByText('Wall Slide')
    expect(screen.queryByText(/Page \d+ of \d+/)).not.toBeInTheDocument()
  })
})