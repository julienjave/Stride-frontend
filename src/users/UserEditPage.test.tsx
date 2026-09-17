import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router'
import { UserEditPage } from './UserEditPage'

const fetchMock = vi.fn<typeof fetch>()
vi.stubGlobal('fetch', fetchMock)

beforeEach(() => {
  fetchMock.mockReset()
})

function urlOf(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input
  if (input instanceof URL) return input.toString()
  return input.url
}

function renderAt(path: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/admin/users/:id" element={<UserEditPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const fullUser = {
  id: 1,
  firstName: 'Jamie',
  lastName: 'Doe',
  email: 'jamie@example.com',
  isActive: true,
  roles: ['patient'],
  clinics: [{ id: 1, name: 'Acme Clinic' }],
}

describe('UserEditPage — invalid route param', () => {
  it('shows an error for a non-numeric id, without ever calling the API', () => {
    renderAt('/admin/users/not-a-number')
    expect(screen.getByText('Invalid user.')).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('UserEditPage — loading and error states', () => {
  it('shows a loading state before the user resolves', () => {
    fetchMock.mockReturnValue(new Promise(() => {}))
    renderAt('/admin/users/1')
    expect(screen.getByText('Loading user…')).toBeInTheDocument()
  })

  it('shows an error state when the fetch fails', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ statusCode: 404, message: ['User 1 not found'] }), {
        status: 404,
      }),
    )
    renderAt('/admin/users/1')
    expect(await screen.findByText("Couldn't load this user.")).toBeInTheDocument()
  })
})

describe('UserEditPage — rendering a loaded user', () => {
  it("shows the user's name, email, roles, and their clinic memberships section", async () => {
    fetchMock.mockImplementation((input) => {
      const url = urlOf(input)
      if (url.includes('/users/1')) {
        return Promise.resolve(new Response(JSON.stringify(fullUser), { status: 200 }))
      }
      if (url.includes('/clinics')) {
        return Promise.resolve(
          new Response(JSON.stringify([{ id: 1, name: 'Acme Clinic', logoUrl: null }]), {
            status: 200,
          }),
        )
      }
      throw new Error(`Unexpected fetch to ${url}`)
    })
    renderAt('/admin/users/1')

    expect(await screen.findByRole('heading', { name: 'Jamie Doe' })).toBeInTheDocument()
    expect(screen.getByText('jamie@example.com')).toBeInTheDocument()
    expect(screen.getByText('patient')).toBeInTheDocument()
    // The actual feature — UserClinicMemberships — is rendered with this
    // user's real data, not just present as an empty shell.
    expect(screen.getByText('Acme Clinic')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Remove' })).toBeInTheDocument()
  })

  it('shows a deactivated notice for an inactive user', async () => {
    fetchMock.mockImplementation((input) => {
      const url = urlOf(input)
      if (url.includes('/users/1')) {
        return Promise.resolve(
          new Response(JSON.stringify({ ...fullUser, isActive: false }), { status: 200 }),
        )
      }
      return Promise.resolve(new Response(JSON.stringify([]), { status: 200 }))
    })
    renderAt('/admin/users/1')

    expect(await screen.findByText('This account is deactivated.')).toBeInTheDocument()
  })

  it('has a "Back to users" link pointing to the list route', async () => {
    fetchMock.mockImplementation((input) => {
      const url = urlOf(input)
      if (url.includes('/users/1')) {
        return Promise.resolve(new Response(JSON.stringify(fullUser), { status: 200 }))
      }
      return Promise.resolve(new Response(JSON.stringify([]), { status: 200 }))
    })
    renderAt('/admin/users/1')

    expect(await screen.findByRole('link', { name: 'Back to users' })).toHaveAttribute(
      'href',
      '/admin/users',
    )
  })
})