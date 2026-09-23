import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { DuplicateTemplateButton } from './DuplicateTemplateButton'
import { programQueryKey, programsListQueryKey } from './api'

const fetchMock = vi.fn<typeof fetch>()
vi.stubGlobal('fetch', fetchMock)

beforeEach(() => {
  fetchMock.mockReset()
})

const copy = {
  id: 42,
  practitionerId: 9,
  title: 'Copy of Shoulder Rehab',
  description: null,
  isArchived: false,
  exercises: [],
}

function renderButton(
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } }),
) {
  const router = createMemoryRouter(
    [
      {
        path: '/practitioner/programs/templates/1',
        element: <DuplicateTemplateButton templateId={1} />,
      },
      {
        path: '/practitioner/programs/templates/:id',
        element: <div>Copied template page</div>,
      },
    ],
    { initialEntries: ['/practitioner/programs/templates/1'] },
  )
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return { ...utils, queryClient, router }
}

describe('DuplicateTemplateButton', () => {
  it("POSTs to the SOURCE's duplicate route, seeds the copy's cache, adds it to the list, and opens it", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify(copy), { status: 201 }),
    )
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    queryClient.setQueryData(programsListQueryKey, [])
    const user = userEvent.setup()
    const { router } = renderButton(queryClient)

    await user.click(screen.getByRole('button', { name: 'Duplicate' }))

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/programs/1/duplicate'),
        expect.objectContaining({ method: 'POST' }),
      ),
    )
    expect(await screen.findByText('Copied template page')).toBeInTheDocument()
    // The NEW id (42), not the source (1).
    expect(router.state.location.pathname).toBe(
      '/practitioner/programs/templates/42',
    )
    // Cached under the copy's own key, so its page renders instantly.
    expect(queryClient.getQueryData(programQueryKey(42))).toEqual(copy)
    // Never written over the source's entry by mistake.
    expect(queryClient.getQueryData(programQueryKey(1))).toBeUndefined()
    expect(queryClient.getQueryData(programsListQueryKey)).toEqual([
      {
        id: 42,
        practitionerId: 9,
        title: 'Copy of Shoulder Rehab',
        description: null,
        isArchived: false,
      },
    ])
  })

  it("shows the backend's message and stays put when duplicating fails", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          statusCode: 400,
          message: ['Archived program templates cannot be duplicated'],
        }),
        { status: 400 },
      ),
    )
    const user = userEvent.setup()
    const { router } = renderButton()

    await user.click(screen.getByRole('button', { name: 'Duplicate' }))

    expect(
      await screen.findByText('Archived program templates cannot be duplicated'),
    ).toBeInTheDocument()
    expect(router.state.location.pathname).toBe(
      '/practitioner/programs/templates/1',
    )
  })
})