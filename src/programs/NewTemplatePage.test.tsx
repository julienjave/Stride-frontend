import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, createMemoryRouter, RouterProvider } from 'react-router'
import { NewTemplatePage } from './NewTemplatePage'
import { programsListQueryKey } from './api'

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
      <MemoryRouter initialEntries={['/practitioner/programs/templates/new']}>
        <NewTemplatePage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status })
}

describe('NewTemplatePage', () => {
  it('renders the title and both field labels', () => {
    renderPage()
    expect(screen.getByText('New Program Template')).toBeInTheDocument()
    expect(screen.getByLabelText('Title')).toBeInTheDocument()
    expect(screen.getByLabelText('Description')).toBeInTheDocument()
  })

  it('shows a validation error and never calls the API when title is left empty', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: 'Create Template' }))

    expect(await screen.findByText('Title is required')).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  // A title of spaces alone is no title: the field says so, as for an
  // empty one, and nothing is sent (the backend refuses it too, since
  // 2026-10-14 — the form answers first, next to the field).
  it('treats a title of spaces as empty, and never calls the API', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.type(screen.getByLabelText('Title'), '   ')
    await user.click(screen.getByRole('button', { name: 'Create Template' }))

    expect(await screen.findByText('Title is required')).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  // The schema's trim() is a transform: what's SENT is the trimmed title.
  // The body is asserted as a literal string, so a stray space (or key)
  // fails.
  it('sends the title trimmed', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ id: 1, title: 'Shoulder Rehab' }, 201))
    const user = userEvent.setup()
    renderPage()
    await user.type(screen.getByLabelText('Title'), '  Shoulder Rehab  ')
    await user.click(screen.getByRole('button', { name: 'Create Template' }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    expect(fetchMock.mock.calls[0][1]?.body).toBe('{"title":"Shoulder Rehab"}')
  })

  it('submits with only the title filled in, omitting description entirely rather than sending an empty string', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ id: 1, title: 'Shoulder Rehab' }, 201))
    const user = userEvent.setup()
    renderPage()
    await user.type(screen.getByLabelText('Title'), 'Shoulder Rehab')
    await user.click(screen.getByRole('button', { name: 'Create Template' }))

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/programs'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ title: 'Shoulder Rehab' }),
        }),
      ),
    )
  })

  it('includes description when filled in', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ id: 1, title: 'Shoulder Rehab' }, 201))
    const user = userEvent.setup()
    renderPage()
    await user.type(screen.getByLabelText('Title'), 'Shoulder Rehab')
    await user.type(screen.getByLabelText('Description'), 'A gentle rehab plan')
    await user.click(screen.getByRole('button', { name: 'Create Template' }))

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/programs'),
        expect.objectContaining({
          body: JSON.stringify({
            title: 'Shoulder Rehab',
            description: 'A gentle rehab plan',
          }),
        }),
      ),
    )
  })

  it('shows the API error message when creation fails', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ statusCode: 400, message: ['Title already in use'] }, 400),
    )
    const user = userEvent.setup()
    renderPage()
    await user.type(screen.getByLabelText('Title'), 'Shoulder Rehab')
    await user.click(screen.getByRole('button', { name: 'Create Template' }))

    expect(await screen.findByText('Title already in use')).toBeInTheDocument()
  })

  it("navigates to the NEW template's own page on success, replacing the form in history", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ id: 777, title: 'Shoulder Rehab' }, 201))
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    const router = createMemoryRouter(
      [
        {
          path: '/practitioner/programs',
          element: <div>Programs hub</div>,
        },
        {
          path: '/practitioner/programs/templates/new',
          element: <NewTemplatePage />,
        },
        {
          path: '/practitioner/programs/templates/:id',
          element: <div>Template detail page</div>,
        },
      ],
      // Two entries: the hub, then the form — the way a real visit
      // arrives here. That's what lets the test check where Back goes.
      {
        initialEntries: [
          '/practitioner/programs',
          '/practitioner/programs/templates/new',
        ],
        initialIndex: 1,
      },
    )
    const user = userEvent.setup()
    render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    )

    await user.type(screen.getByLabelText('Title'), 'Shoulder Rehab')
    await user.click(screen.getByRole('button', { name: 'Create Template' }))

    expect(
      await screen.findByText('Template detail page'),
    ).toBeInTheDocument()
    // The real id from the response, not a hardcoded one — a wrong
    // redirect target would only surface for any id except 777.
    expect(router.state.location.pathname).toBe(
      '/practitioner/programs/templates/777',
    )

    // replace: true means the form's history entry is GONE — going back
    // one step lands on the hub, not on a blank creation form.
    await act(() => router.navigate(-1))
    expect(router.state.location.pathname).toBe('/practitioner/programs')
  })

  it('adds the new template to an already-cached hub list, so it shows up immediately', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(
        {
          id: 777,
          practitionerId: 7,
          title: 'Shoulder Rehab',
          description: null,
          isArchived: false,
        },
        201,
      ),
    )
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    const existing = {
      id: 1,
      practitionerId: 7,
      title: 'Older Template',
      description: null,
      isArchived: false,
    }
    queryClient.setQueryData(programsListQueryKey, [existing])
    const router = createMemoryRouter(
      [
        {
          path: '/practitioner/programs/templates/new',
          element: <NewTemplatePage />,
        },
        {
          path: '/practitioner/programs/templates/:id',
          element: <div>Template detail page</div>,
        },
      ],
      { initialEntries: ['/practitioner/programs/templates/new'] },
    )
    const user = userEvent.setup()
    render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    )

    await user.type(screen.getByLabelText('Title'), 'Shoulder Rehab')
    await user.click(screen.getByRole('button', { name: 'Create Template' }))
    await screen.findByText('Template detail page')

    expect(queryClient.getQueryData(programsListQueryKey)).toEqual([
      existing,
      {
        id: 777,
        practitionerId: 7,
        title: 'Shoulder Rehab',
        description: null,
        isArchived: false,
      },
    ])
  })

  it('has a Back link to the programs hub', () => {
    renderPage()
    expect(screen.getByRole('link', { name: 'Back' })).toHaveAttribute(
      'href',
      '/practitioner/programs',
    )
  })
})