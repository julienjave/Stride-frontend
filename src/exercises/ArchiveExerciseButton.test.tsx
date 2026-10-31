import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { ArchiveExerciseButton } from './ArchiveExerciseButton'
import { exerciseQueryKey } from './api'
import { expectSnackbar, raisedSnackbars } from '@/snackbars/snackbarAssertions'

const fetchMock = vi.fn<typeof fetch>()
vi.stubGlobal('fetch', fetchMock)

beforeEach(() => {
  fetchMock.mockReset()
})

function renderButton(
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } }),
) {
  const router = createMemoryRouter(
    [
      {
        path: '/practitioner/library/1',
        element: (
          <ArchiveExerciseButton exerciseId={1} exerciseName="Wall Slide" />
        ),
      },
      {
        path: '/practitioner/library',
        element: <div>Library page</div>,
      },
    ],
    { initialEntries: ['/practitioner/library/1'] },
  )
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return { ...utils, queryClient, router }
}

describe('ArchiveExerciseButton — opening the dialog', () => {
  it('shows a trigger button, and clicking it reveals confirmation copy naming the exercise', async () => {
    const user = userEvent.setup()
    renderButton()

    await user.click(screen.getByRole('button', { name: 'Delete' }))

    expect(await screen.findByText('Delete Wall Slide?')).toBeInTheDocument()
    // Honest about there being no undo path — unlike clinics/users,
    // there is currently no unarchive endpoint for exercises at all.
    expect(
      screen.getByText(/There is\s+currently no way to restore it/),
    ).toBeInTheDocument()
  })
})

describe('ArchiveExerciseButton — cancelling', () => {
  it('Cancel closes the dialog and never calls the API', async () => {
    const user = userEvent.setup()
    renderButton()
    await user.click(screen.getByRole('button', { name: 'Delete' }))
    await screen.findByText('Delete Wall Slide?')

    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    await waitFor(() =>
      expect(screen.queryByText('Delete Wall Slide?')).not.toBeInTheDocument(),
    )
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('ArchiveExerciseButton — confirming successfully', () => {
  it('DELETEs the exercise, updates the cache, closes the dialog, and navigates to the library', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({ id: 1, name: 'Wall Slide', isArchived: true }),
        { status: 200 },
      ),
    )

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    queryClient.setQueryData(exerciseQueryKey(1), {
      id: 1,
      name: 'Wall Slide',
      isArchived: false,
    })

    const user = userEvent.setup()
    const { router } = renderButton(queryClient)

    // Trigger and confirm buttons share the exact label "Delete" — the
    // trigger is the only one present until the dialog opens.
    await user.click(screen.getByRole('button', { name: 'Delete' }))
    await screen.findByText('Delete Wall Slide?')
    const deleteButtons = screen.getAllByRole('button', { name: 'Delete' })
    await user.click(deleteButtons[deleteButtons.length - 1])

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/exercises/1'),
        expect.objectContaining({ method: 'DELETE' }),
      ),
    )

    expect(await screen.findByText('Library page')).toBeInTheDocument()
    expectSnackbar('success', 'Deleted Wall Slide from the library.')
    expect(router.state.location.pathname).toBe('/practitioner/library')
    expect(queryClient.getQueryData(exerciseQueryKey(1))).toEqual({
      id: 1,
      name: 'Wall Slide',
      isArchived: true,
    })
  })
})

describe('ArchiveExerciseButton — a failed confirm', () => {
  it('shows the error message and keeps the dialog open, without navigating away', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({ statusCode: 400, message: ['Refused by the server'] }),
        { status: 400 },
      ),
    )

    const user = userEvent.setup()
    const { router } = renderButton()

    await user.click(screen.getByRole('button', { name: 'Delete' }))
    await screen.findByText('Delete Wall Slide?')
    const deleteButtons = screen.getAllByRole('button', { name: 'Delete' })
    await user.click(deleteButtons[deleteButtons.length - 1])

    expect(
      await screen.findByText('Refused by the server'),
    ).toBeInTheDocument()
    expect(raisedSnackbars()).toEqual([])
    expect(screen.getByText('Delete Wall Slide?')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/practitioner/library/1')
  })
})