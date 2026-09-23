import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router'
import { ExerciseDetailPage } from './ExerciseDetailPage'
import { currentUserQueryKey } from '@/auth/useCurrentUser'
import type { ExerciseDetail } from './types'

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
  it('shows an invalid-exercise message for a non-numeric id', () => {
    renderAt('/practitioner/library/not-a-number')
    expect(screen.getByText('Invalid exercise.')).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('shows a loading state before the exercise resolves', () => {
    fetchMock.mockReturnValue(new Promise(() => {}))
    renderAt('/practitioner/library/1')
    expect(screen.getByText('Loading…')).toBeInTheDocument()
  })

  it('shows an error state when the fetch fails', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ statusCode: 500, message: ['Internal error'] }, 500),
    )
    renderAt('/practitioner/library/1')
    expect(
      await screen.findByText("Couldn't load this exercise. Try refreshing."),
    ).toBeInTheDocument()
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