import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, createMemoryRouter, RouterProvider } from 'react-router'
import { NewTemplatePage } from './NewTemplatePage'

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
    await user.click(screen.getByRole('button', { name: 'Add Exercises' }))

    expect(await screen.findByText('Title is required')).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('submits with only the title filled in, omitting description entirely rather than sending an empty string', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ id: 1, title: 'Shoulder Rehab' }, 201))
    const user = userEvent.setup()
    renderPage()
    await user.type(screen.getByLabelText('Title'), 'Shoulder Rehab')
    await user.click(screen.getByRole('button', { name: 'Add Exercises' }))

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
    await user.click(screen.getByRole('button', { name: 'Add Exercises' }))

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
    await user.click(screen.getByRole('button', { name: 'Add Exercises' }))

    expect(await screen.findByText('Title already in use')).toBeInTheDocument()
  })

  it("navigates to Screen 2 for the NEW template's id on success", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ id: 777, title: 'Shoulder Rehab' }, 201))
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    const router = createMemoryRouter(
      [
        {
          path: '/practitioner/programs/templates/new',
          element: <NewTemplatePage />,
        },
        {
          path: '/practitioner/programs/templates/:id/exercises',
          element: <div>Template exercises page</div>,
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
    await user.click(screen.getByRole('button', { name: 'Add Exercises' }))

    expect(
      await screen.findByText('Template exercises page'),
    ).toBeInTheDocument()
    // The real id from the response, not a hardcoded one — a wrong
    // redirect target would only surface for any id except 777.
    expect(router.state.location.pathname).toBe(
      '/practitioner/programs/templates/777/exercises',
    )
  })

  it('has a Back link to the programs hub', () => {
    renderPage()
    expect(screen.getByRole('link', { name: 'Back' })).toHaveAttribute(
      'href',
      '/practitioner/programs',
    )
  })
})