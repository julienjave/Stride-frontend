import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router'
import { ExercisePickerPage } from './ExercisePickerPage'

const fetchMock = vi.fn<typeof fetch>()
vi.stubGlobal('fetch', fetchMock)

beforeEach(() => {
  fetchMock.mockReset()
})

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status })
}

function renderAt(path: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/practitioner/library/pick" element={<ExercisePickerPage />} />
          <Route
            path="/practitioner/programs/templates/:id/exercises/new"
            element={<div>Return destination page</div>}
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('ExercisePickerPage', () => {
  it('shows an error and never fetches when returnTo is missing', () => {
    renderAt('/practitioner/library/pick')
    expect(
      screen.getByText('No return destination specified.'),
    ).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('renders exercise cards linking to returnTo with the picked exerciseId appended', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        data: [
          {
            id: 5,
            externalId: null,
            name: 'Squat',
            primaryMuscles: ['legs'],
            secondaryMuscles: [],
            equipment: [],
            instructions: ['Step'],
            mediaUrls: [],
            source: 'custom',
            createdBy: 7,
            isArchived: false,
            author: null,
          },
        ],
        meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
      }),
    )
    const returnTo = '/practitioner/programs/templates/1/exercises/new'
    renderAt(`/practitioner/library/pick?returnTo=${encodeURIComponent(returnTo)}`)

    const link = await screen.findByRole('link', { name: /Squat/ })
    expect(link).toHaveAttribute(
      'href',
      `${returnTo}?exerciseId=5`,
    )
  })

  it('the Cancel link goes to returnTo directly, without an exerciseId', () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 1 } }),
    )
    const returnTo = '/practitioner/programs/templates/1/exercises/new'
    renderAt(`/practitioner/library/pick?returnTo=${encodeURIComponent(returnTo)}`)

    expect(screen.getByRole('link', { name: 'Cancel' })).toHaveAttribute(
      'href',
      returnTo,
    )
  })

  it('does not render an Add New Exercise card — picking, not managing', () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 1 } }),
    )
    const returnTo = '/practitioner/programs/templates/1/exercises/new'
    renderAt(`/practitioner/library/pick?returnTo=${encodeURIComponent(returnTo)}`)

    expect(
      screen.queryByRole('link', { name: 'Add New Exercise' }),
    ).not.toBeInTheDocument()
  })
})