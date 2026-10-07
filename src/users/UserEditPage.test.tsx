import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router'
import { UserEditPage } from './UserEditPage'
import { currentUserQueryKey } from '@/auth/useCurrentUser'

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
  // The viewer: an admin (id 9 — a different person from the user being
  // edited). The license-number rule reads the viewer's active role.
  queryClient.setQueryData(currentUserQueryKey, {
    id: 9,
    firstName: 'Ada',
    lastName: 'Admin',
    email: 'ada@example.com',
    activeRole: 'admin',
    roles: ['admin'],
  })
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

// A complete GET /users/:id response — the editable profile reads every
// one of these fields.
const fullUser = {
  id: 1,
  firstName: 'Jamie',
  lastName: 'Doe',
  email: 'jamie@example.com',
  avatarUrl: null,
  phone: null,
  addressLine1: null,
  addressLine2: null,
  addressCity: null,
  addressState: null,
  addressPostalCode: null,
  addressCountry: null,
  isActive: true,
  createdAt: '2026-09-01T00:00:00.000Z',
  mfaEnabled: false,
  roles: ['patient'],
  patientProfile: { dateOfBirth: '1990-01-01' },
  clinics: [{ id: 1, name: 'Acme Clinic' }],
}

const practitionerUser = {
  ...fullUser,
  id: 4,
  firstName: 'Prac',
  lastName: 'Titioner',
  roles: ['practitioner'],
  patientProfile: undefined,
  practitionerProfile: { licenseNumber: 'PT-4', specialties: [], bio: null },
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
    // Role shown by its display name now, not the raw enum value.
    expect(screen.getByText('Patient')).toBeInTheDocument()
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

  it('renders GrantRoleForm, offering only roles this user does not already hold', async () => {
    fetchMock.mockImplementation((input) => {
      const url = urlOf(input)
      if (url.includes('/users/1')) {
        // This user already holds 'patient' — the grant-role dropdown
        // should offer practitioner/admin, not patient again.
        return Promise.resolve(new Response(JSON.stringify(fullUser), { status: 200 }))
      }
      return Promise.resolve(new Response(JSON.stringify([]), { status: 200 }))
    })
    renderAt('/admin/users/1')

    // Two comboboxes exist on this page now: UserClinicMemberships' add-
    // clinic dropdown, and GrantRoleForm's role dropdown. Scoping to the
    // one labeled "Grant role" specifically confirms the RIGHT one shows
    // up, not just that some dropdown somewhere does.
    expect(await screen.findByRole('combobox', { name: 'Grant role' })).toBeInTheDocument()
  })
})

// The page used to be read-only; it now embeds the same editable profile
// as /profile (ProfileFields — tested in depth through ProfilePage.test).
// These tests check the WIRING on this page: the right user, the admin's
// license permission, and saves reaching the right URL.
describe('UserEditPage — editing the profile', () => {
  function fakeBackend(user: typeof fullUser | typeof practitionerUser) {
    fetchMock.mockImplementation((input, init) => {
      const url = urlOf(input)
      if (url.endsWith(`/users/${user.id}`)) {
        if (init?.method === 'PATCH') {
          const body = JSON.parse(init.body as string) as Record<string, unknown>
          return Promise.resolve(
            new Response(JSON.stringify({ ...user, ...body }), { status: 200 }),
          )
        }
        return Promise.resolve(new Response(JSON.stringify(user), { status: 200 }))
      }
      return Promise.resolve(new Response(JSON.stringify([]), { status: 200 }))
    })
  }

  function patchBodies() {
    return fetchMock.mock.calls
      .filter(([, init]) => init?.method === 'PATCH')
      .map(([input, init]) => [urlOf(input), init?.body])
  }

  it("shows the user's role sections with editable fields", async () => {
    fakeBackend(fullUser)
    renderAt('/admin/users/1')
    expect(await screen.findByRole('region', { name: 'Patient details' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Edit Date of birth' })).toBeInTheDocument()
  })

  it("lets the admin edit THIS user's phone — PATCHing /users/1, not the admin's own id", async () => {
    fakeBackend(fullUser)
    const user = userEvent.setup()
    renderAt('/admin/users/1')

    await user.click(await screen.findByRole('button', { name: 'Edit Phone' }))
    await user.type(screen.getByLabelText('Phone'), '555-0100')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByText('555-0100')).toBeInTheDocument()
    expect(patchBodies()).toEqual([
      [expect.stringMatching(/\/users\/1$/), '{"phone":"555-0100"}'],
    ])
  })

  it("lets the admin change a practitioner's license number", async () => {
    fakeBackend(practitionerUser)
    const user = userEvent.setup()
    renderAt('/admin/users/4')

    await user.click(await screen.findByRole('button', { name: 'Edit License number' }))
    await user.clear(screen.getByLabelText('License number'))
    await user.type(screen.getByLabelText('License number'), 'PT-44')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(patchBodies()).toEqual([
      [expect.stringMatching(/\/users\/4$/), '{"licenseNumber":"PT-44"}'],
    ])
  })
})

describe('UserEditPage — photo', () => {
  it("lets the admin remove THIS user's photo — DELETE /users/1/avatar, not the admin's own id", async () => {
    const withPhoto = {
      ...fullUser,
      avatarUrl: 'https://storage.example.com/signed/avatars/1/a.png',
    }
    fetchMock.mockImplementation((input, init) => {
      const url = urlOf(input)
      if (url.endsWith('/users/1/avatar') && init?.method === 'DELETE') {
        return Promise.resolve(
          new Response(JSON.stringify({ ...withPhoto, avatarUrl: null }), { status: 200 }),
        )
      }
      if (url.includes('/users/1')) {
        return Promise.resolve(new Response(JSON.stringify(withPhoto), { status: 200 }))
      }
      return Promise.resolve(new Response('[]', { status: 200 }))
    })
    renderAt('/admin/users/1')

    await userEvent.click(await screen.findByRole('button', { name: 'Remove photo' }))

    expect(await screen.findByRole('button', { name: 'Upload photo' })).toBeInTheDocument()
    expect(
      fetchMock.mock.calls.filter(([, init]) => init?.method === 'DELETE').map(([input]) => urlOf(input)),
    ).toEqual([expect.stringMatching(/\/users\/1\/avatar$/)])
  })
})

// The page's own part: it shows the account's invitation, for THIS user.
// What the section does is tested in src/invitations/InvitationStatus.test.tsx.
describe('UserEditPage — invitation', () => {
  it("shows this user's invitation status", async () => {
    fetchMock.mockImplementation((input) => {
      const url = urlOf(input)
      // Checked FIRST: '/users/1/invitations' also contains '/users/1'.
      if (url.endsWith('/users/1/invitations')) {
        return Promise.resolve(
          new Response(
            JSON.stringify([
              {
                id: 10,
                status: 'expired',
                createdAt: '2026-09-20T10:00:00.000Z',
                expiresAt: '2026-09-27T10:00:00.000Z',
                acceptedAt: null,
                revokedAt: null,
                invitedBy: { id: 9, firstName: 'Ada', lastName: 'Admin' },
                revokedBy: null,
              },
            ]),
            { status: 200 },
          ),
        )
      }
      if (url.endsWith('/users/1')) {
        return Promise.resolve(new Response(JSON.stringify(fullUser), { status: 200 }))
      }
      return Promise.resolve(new Response(JSON.stringify([]), { status: 200 }))
    })
    renderAt('/admin/users/1')

    const region = await screen.findByRole('region', { name: 'Invitation' })
    expect(region).toHaveTextContent('Expired')
    expect(
      fetchMock.mock.calls.some(([input]) => urlOf(input).endsWith('/users/1/invitations')),
    ).toBe(true)
  })
})