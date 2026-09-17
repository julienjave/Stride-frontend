import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
import { UsersListPage } from './UsersListPage'

const fetchMock = vi.fn<typeof fetch>()
vi.stubGlobal('fetch', fetchMock)

beforeEach(() => {
  fetchMock.mockReset()
})

function renderUsersListPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/admin/users']}>
        <UsersListPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('UsersListPage', () => {
  it('shows a loading state before the users resolve', () => {
    fetchMock.mockReturnValue(new Promise(() => {})) // never resolves
    renderUsersListPage()
    expect(screen.getByText('Loading users…')).toBeInTheDocument()
  })

  it('renders each user with a link to their edit view, plus roles and clinics', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify([
          {
            id: 1,
            firstName: 'Jamie',
            lastName: 'Doe',
            email: 'jamie@example.com',
            isActive: true,
            roles: ['patient'],
            clinics: [{ id: 1, name: 'Acme Clinic' }],
          },
          {
            id: 2,
            firstName: 'Sam',
            lastName: 'Lee',
            email: 'sam@example.com',
            isActive: false,
            roles: ['practitioner'],
            clinics: [],
          },
        ]),
        { status: 200 },
      ),
    )
    renderUsersListPage()

    expect(await screen.findByText('Jamie Doe')).toBeInTheDocument()
    expect(screen.getByText('jamie@example.com')).toBeInTheDocument()
    expect(screen.getByText('patient · Acme Clinic')).toBeInTheDocument()

    expect(screen.getByRole('link', { name: /Jamie Doe/ })).toHaveAttribute(
      'href',
      '/admin/users/1',
    )
    expect(screen.getByRole('link', { name: /Sam Lee/ })).toHaveAttribute(
      'href',
      '/admin/users/2',
    )
    // Sam is deactivated and belongs to no clinic — both facts should be
    // visible without needing to open their edit page to find out.
    expect(screen.getByText(/\(deactivated\)/)).toBeInTheDocument()
    expect(screen.getByText('practitioner')).toBeInTheDocument()
  })

  it('shows an empty state when there are no users', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify([]), { status: 200 }))
    renderUsersListPage()
    expect(await screen.findByText('No users yet.')).toBeInTheDocument()
  })

  it('shows an error state when the fetch fails', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({ statusCode: 500, message: ['Internal server error'] }),
        { status: 500 },
      ),
    )
    renderUsersListPage()
    expect(await screen.findByText("Couldn't load users. Try refreshing.")).toBeInTheDocument()
  })

  it('has an "Add user" link pointing to the create route', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify([]), { status: 200 }))
    renderUsersListPage()
    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    expect(screen.getByRole('link', { name: 'Add user' })).toHaveAttribute(
      'href',
      '/admin/users/new',
    )
  })
})