import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { ArchiveTemplateButton } from './ArchiveTemplateButton'
import { programQueryKey, programsListQueryKey } from './api'

const fetchMock = vi.fn<typeof fetch>()
vi.stubGlobal('fetch', fetchMock)

beforeEach(() => {
  fetchMock.mockReset()
})

function listItem(id: number, title: string) {
  return { id, practitionerId: 7, title, description: null, isArchived: false }
}

function renderButton(
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } }),
) {
  // Two history entries — the hub, then this template — the way a real
  // visit arrives. That's what lets the success test check where the
  // browser's Back button goes afterwards.
  const router = createMemoryRouter(
    [
      {
        path: '/practitioner/programs',
        element: <div>Programs hub</div>,
      },
      {
        path: '/practitioner/programs/templates/1',
        element: (
          <ArchiveTemplateButton templateId={1} templateTitle="Shoulder Rehab" />
        ),
      },
    ],
    {
      initialEntries: [
        '/practitioner/programs',
        '/practitioner/programs/templates/1',
      ],
      initialIndex: 1,
    },
  )
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return { ...utils, queryClient, router }
}

// The trigger and the dialog's confirm button share the label "Delete" —
// once the dialog is open, the confirm button is the last one.
async function openAndConfirm(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Delete' }))
  await screen.findByText('Delete Shoulder Rehab?')
  const deleteButtons = screen.getAllByRole('button', { name: 'Delete' })
  await user.click(deleteButtons[deleteButtons.length - 1])
}

describe('ArchiveTemplateButton — opening the dialog', () => {
  it('names the template, reassures about assigned programs, and is honest that there is no undo', async () => {
    const user = userEvent.setup()
    renderButton()

    await user.click(screen.getByRole('button', { name: 'Delete' }))

    expect(await screen.findByText('Delete Shoulder Rehab?')).toBeInTheDocument()
    expect(
      screen.getByText(/Programs already\s+assigned to patients from it are not affected/),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/There is currently\s+no way to restore it/),
    ).toBeInTheDocument()
  })
})

describe('ArchiveTemplateButton — cancelling', () => {
  it('Cancel closes the dialog and never calls the API', async () => {
    const user = userEvent.setup()
    renderButton()
    await user.click(screen.getByRole('button', { name: 'Delete' }))
    await screen.findByText('Delete Shoulder Rehab?')

    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    await waitFor(() =>
      expect(
        screen.queryByText('Delete Shoulder Rehab?'),
      ).not.toBeInTheDocument(),
    )
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('ArchiveTemplateButton — confirming successfully', () => {
  it('DELETEs the template, updates both caches, and replaces this page with the hub in history', async () => {
    const archived = { ...listItem(1, 'Shoulder Rehab'), isArchived: true, exercises: [] }
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify(archived), { status: 200 }),
    )
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    queryClient.setQueryData(programsListQueryKey, [
      listItem(1, 'Shoulder Rehab'),
      listItem(2, 'Knee Rehab'),
    ])
    const user = userEvent.setup()
    const { router } = renderButton(queryClient)

    await openAndConfirm(user)

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/programs/1'),
        expect.objectContaining({ method: 'DELETE' }),
      ),
    )
    expect(await screen.findByText('Programs hub')).toBeInTheDocument()

    // Gone from the hub's cached list BEFORE the hub renders — the
    // "correct on first paint" guarantee.
    expect(queryClient.getQueryData(programsListQueryKey)).toEqual([
      listItem(2, 'Knee Rehab'),
    ])
    // The detail entry now says archived, for any later visit.
    expect(queryClient.getQueryData(programQueryKey(1))).toEqual(archived)

    // replace: true — the template's own history entry was swapped for
    // the hub. With a push, history would be [hub, template, hub], and
    // going back one step would land on the deleted template again.
    // Instead it's [hub, hub]: back one step is still the hub.
    await act(() => router.navigate(-1))
    expect(router.state.location.pathname).toBe('/practitioner/programs')
  })
})

describe('ArchiveTemplateButton — a failed confirm', () => {
  it('shows the error message and keeps the dialog open, without navigating away', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({ statusCode: 500, message: ['Internal server error'] }),
        { status: 500 },
      ),
    )
    const user = userEvent.setup()
    const { router } = renderButton()

    await openAndConfirm(user)

    expect(await screen.findByText('Internal server error')).toBeInTheDocument()
    expect(screen.getByText('Delete Shoulder Rehab?')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe(
      '/practitioner/programs/templates/1',
    )
  })
})