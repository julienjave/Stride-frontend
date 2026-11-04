/*
    Copyright 2026 Julien Javelaud

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

        http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
*/
// -----------------------------------------------------------------------------------------------------------

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router'
import { UserEditPage } from './UserEditPage'
import { currentUserQueryKey } from '@/auth/useCurrentUser'
import {
  errorResponse,
  expectLoadError,
  expectRecordNotFound,
  retryThenExpectFocusOn,
} from '@/common/loadFailureAssertions'
import { expectLoading } from '@/common/loadingAssertions'

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
  it('a non-numeric id: "User not found", without ever calling the API', async () => {
    renderAt('/admin/users/not-a-number')
    await expectRecordNotFound('user', [['Users', '/admin/users']])
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('UserEditPage — loading and error states', () => {
  it('shows a loading state before the user resolves', () => {
    fetchMock.mockReturnValue(new Promise(() => {}))
    renderAt('/admin/users/1')
    expectLoading('Loading the user…')
  })

  it('a 404: "User not found", and no Try again', async () => {
    fetchMock.mockResolvedValue(errorResponse(404, ['User 1 not found']))
    renderAt('/admin/users/1')
    await expectRecordNotFound('user', [['Users', '/admin/users']])
  })

  it('any other failure: the load error with its reason; a retry that works focuses the name', async () => {
    const user = userEvent.setup()
    let userFailures = 1
    fetchMock.mockImplementation((input) => {
      const url = urlOf(input)
      if (url.endsWith('/records-export-links') ||
        url.endsWith('/complaint-reviews') ||
        url.endsWith('/legal-disclosures')) {
        return Promise.resolve(new Response('[]', { status: 200 }))
      }
      if (url.endsWith('/users/1') && userFailures > 0) {
        userFailures -= 1
        return Promise.resolve(errorResponse(500))
      }
      if (url.includes('/users/1')) {
        return Promise.resolve(new Response(JSON.stringify(fullUser), { status: 200 }))
      }
      if (url.includes('/clinics')) {
        return Promise.resolve(new Response('[]', { status: 200 }))
      }
      throw new Error(`Unexpected fetch to ${url}`)
    })
    renderAt('/admin/users/1')
    await expectLoadError('this user')
    expect(screen.getByRole('link', { name: 'Users' })).toHaveAttribute('href', '/admin/users')
    await retryThenExpectFocusOn(user, { level: 1, name: 'Jamie Doe' })
  })
})

describe('UserEditPage — rendering a loaded user', () => {
  it("shows the user's name, email, roles, and their clinic memberships section", async () => {
    fetchMock.mockImplementation((input) => {
      const url = urlOf(input)
      // Before '/users/1', which they contain: a patient's records links and
      // complaint reviews.
      if (url.endsWith('/records-export-links') ||
        url.endsWith('/complaint-reviews') ||
        url.endsWith('/legal-disclosures')) {
        return Promise.resolve(new Response('[]', { status: 200 }))
      }
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
      // Before '/users/1', which they contain: a patient's records links and
      // complaint reviews.
      if (url.endsWith('/records-export-links') ||
        url.endsWith('/complaint-reviews') ||
        url.endsWith('/legal-disclosures')) {
        return Promise.resolve(new Response('[]', { status: 200 }))
      }
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

  // The page hands the account's ROLES to the two buttons: what a
  // (de)activation does to care-team links depends on them (2026-10-25).
  // The buttons' own tests cover each role; these prove the page passes
  // them on.
  function answerPractitioner(isActive: boolean) {
    fetchMock.mockImplementation((input) => {
      const url = urlOf(input)
      if (url.includes('/users/4')) {
        return Promise.resolve(
          new Response(JSON.stringify({ ...practitionerUser, isActive }), { status: 200 }),
        )
      }
      return Promise.resolve(new Response(JSON.stringify([]), { status: 200 }))
    })
  }

  it("tells the admin, before deactivating a practitioner, that their links end", async () => {
    answerPractitioner(true)
    const user = userEvent.setup()
    renderAt('/admin/users/4')

    await user.click(await screen.findByRole('button', { name: 'Deactivate user' }))

    const dialog = await screen.findByRole('dialog', { name: 'Deactivate Prac Titioner?' })
    expect(
      within(dialog).getByText(
        "Their current care-team links end too. Reactivating the account doesn't restore them.",
      ),
    ).toBeInTheDocument()
  })

  it("tells the admin, before reactivating a practitioner, that their links don't come back", async () => {
    answerPractitioner(false)
    const user = userEvent.setup()
    renderAt('/admin/users/4')

    await user.click(await screen.findByRole('button', { name: 'Reactivate user' }))

    const dialog = await screen.findByRole('dialog', { name: 'Reactivate Prac Titioner?' })
    expect(within(dialog).getByText(/and don't come back/)).toBeInTheDocument()
  })

  it('has a "Back to users" link pointing to the list route', async () => {
    fetchMock.mockImplementation((input) => {
      const url = urlOf(input)
      // Before '/users/1', which they contain: a patient's records links and
      // complaint reviews.
      if (url.endsWith('/records-export-links') ||
        url.endsWith('/complaint-reviews') ||
        url.endsWith('/legal-disclosures')) {
        return Promise.resolve(new Response('[]', { status: 200 }))
      }
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
      // Before '/users/1', which they contain: a patient's records links and
      // complaint reviews.
      if (url.endsWith('/records-export-links') ||
        url.endsWith('/complaint-reviews') ||
        url.endsWith('/legal-disclosures')) {
        return Promise.resolve(new Response('[]', { status: 200 }))
      }
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
      // A patient's page also lists their records links and complaint
      // reviews — checked before '/users/1', which they contain.
      if (url.endsWith('/users/1/records-export-links') ||
        url.endsWith('/users/1/complaint-reviews') ||
        url.endsWith('/users/1/legal-disclosures')) {
        return Promise.resolve(new Response('[]', { status: 200 }))
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

  // Added 2026-10-09: an admin manages a PATIENT's care team here — the
  // same section as the practitioner's patient page, with admin rights.
  describe('care team', () => {
    function mockUser(user: object) {
      fetchMock.mockImplementation((input) => {
        const url = urlOf(input)
        if (url.endsWith('/care-team')) {
          return Promise.resolve(
            new Response(
              JSON.stringify([
                {
                  id: 1,
                  patientId: 1,
                  practitioner: { id: 4, firstName: 'Prac', lastName: 'Titioner', avatarUrl: null },
                  startedAt: '2026-09-01T10:00:00.000Z',
                  endsAt: null,
                  isActive: true,
                  reason: null,
                  createdBy: null,
                  endedBy: null,
                },
              ]),
              { status: 200 },
            ),
          )
        }
        if (/\/users\/\d+$/.test(url)) {
          return Promise.resolve(new Response(JSON.stringify(user), { status: 200 }))
        }
        return Promise.resolve(new Response(JSON.stringify([]), { status: 200 }))
      })
    }

    it("shows a patient's care team with an admin's actions", async () => {
      mockUser(fullUser)
      renderAt('/admin/users/1')

      const region = await screen.findByRole('region', { name: 'Care team' })
      expect(await within(region).findByText('Prac Titioner')).toBeInTheDocument()
      expect(within(region).getByRole('button', { name: 'Add someone' })).toBeInTheDocument()
      expect(
        within(region).getByRole('button', { name: "End Prac Titioner's membership" }),
      ).toBeInTheDocument()
    })

    // Decisions §21: a deactivated patient's care team is shown (it was "Couldn't
    // load the care team" — a 404), its links can be ended, and nobody new
    // added: the page passes the account's state on.
    it("shows a DEACTIVATED patient's care team, with End but no Add", async () => {
      mockUser({ ...fullUser, isActive: false })
      renderAt('/admin/users/1')

      const region = await screen.findByRole('region', { name: 'Care team' })
      expect(await within(region).findByText('Prac Titioner')).toBeInTheDocument()
      expect(
        within(region).getByText(
          "Nobody new can join Jamie's care team while their account is deactivated. Reactivate the account to add someone.",
        ),
      ).toBeInTheDocument()
      expect(within(region).queryByRole('button', { name: 'Add someone' })).not.toBeInTheDocument()
      expect(
        within(region).getByRole('button', { name: "End Prac Titioner's membership" }),
      ).toBeInTheDocument()
    })

    it('shows no care team for an account that is not a patient', async () => {
      mockUser(practitionerUser)
      renderAt('/admin/users/4')
      await screen.findByRole('heading', { name: 'Prac Titioner' })
      expect(screen.queryByRole('region', { name: 'Care team' })).not.toBeInTheDocument()
      expect(
        fetchMock.mock.calls.some(([input]) => urlOf(input).includes('/care-team')),
      ).toBe(false)
    })
  })
})
// The page's own part: a PATIENT's account offers the health record copy
// (decisions §20) — active or not — and no other account even asks for its
// links. What the section does is tested in
// src/records-export/RecordsExportLinksSection.test.tsx.
describe('UserEditPage — health record copy', () => {
  function mockUser(user: object) {
    fetchMock.mockImplementation((input) => {
      const url = urlOf(input)
      if (/\/users\/\d+$/.test(url)) {
        return Promise.resolve(new Response(JSON.stringify(user), { status: 200 }))
      }
      return Promise.resolve(new Response(JSON.stringify([]), { status: 200 }))
    })
  }
  const askedForLinks = () =>
    fetchMock.mock.calls.some(([input]) => urlOf(input).endsWith('/records-export-links'))

  it("offers a patient's copy, with this patient's address", async () => {
    mockUser(fullUser)
    renderAt('/admin/users/1')
    const region = await screen.findByRole('region', { name: 'Health record copy' })
    expect(within(region).getByText(/^Email Jamie a link to download their health record/)).toBeInTheDocument()
    expect(await within(region).findByText('No link has been sent yet.')).toBeInTheDocument()
    await userEvent.click(within(region).getByRole('button', { name: 'Email a download link' }))
    expect(
      await screen.findByText(/^It goes to jamie@example\.com, the address on the account\./),
    ).toBeInTheDocument()
    expect(
      fetchMock.mock.calls.some(([input]) => urlOf(input).endsWith('/users/1/records-export-links')),
    ).toBe(true)
  })

  // A deactivated patient can't sign in to download it — the reason the
  // link exists.
  it('offers it for a deactivated patient too', async () => {
    mockUser({ ...fullUser, isActive: false })
    renderAt('/admin/users/1')
    await screen.findByText('This account is deactivated.')
    expect(screen.getByRole('region', { name: 'Health record copy' })).toBeInTheDocument()
  })

  it('offers nothing for an account that is not a patient', async () => {
    mockUser(practitionerUser)
    renderAt('/admin/users/4')
    await screen.findByRole('heading', { name: 'Prac Titioner' })
    expect(screen.queryByRole('region', { name: 'Health record copy' })).not.toBeInTheDocument()
    expect(askedForLinks()).toBe(false)
    // Nor a complaint review (decisions §25, pass 2): only a patient has a
    // record to review.
    expect(screen.queryByRole('region', { name: 'Complaint reviews' })).not.toBeInTheDocument()
    expect(askedForReviews()).toBe(false)
    // Nor a legal disclosure (pass 3).
    expect(screen.queryByRole('region', { name: 'Legal disclosures' })).not.toBeInTheDocument()
    expect(askedForDisclosures()).toBe(false)
  })

  // The complaint review (decisions §25, pass 2) — what the section does is
  // tested in src/complaint-reviews/ComplaintReviewsSection.test.tsx.
  const askedForReviews = () =>
    fetchMock.mock.calls.some(([input]) => urlOf(input).endsWith('/complaint-reviews'))

  it("offers a complaint review of a patient's record — this patient's", async () => {
    mockUser(fullUser)
    renderAt('/admin/users/1')
    const region = await screen.findByRole('region', { name: 'Complaint reviews' })
    expect(await within(region).findByText('No review has been opened.')).toBeInTheDocument()
    expect(within(region).getByRole('button', { name: 'Open a review' })).toBeInTheDocument()
    expect(
      fetchMock.mock.calls.some(([input]) => urlOf(input).endsWith('/users/1/complaint-reviews')),
    ).toBe(true)
  })

  it('offers a complaint review for a deactivated patient too', async () => {
    mockUser({ ...fullUser, isActive: false })
    renderAt('/admin/users/1')
    await screen.findByText('This account is deactivated.')
    expect(await screen.findByRole('region', { name: 'Complaint reviews' })).toBeInTheDocument()
  })

  // The legal disclosure (decisions §25, pass 3) — what the section does is
  // tested in src/legal-disclosures/LegalDisclosuresSection.test.tsx.
  const askedForDisclosures = () =>
    fetchMock.mock.calls.some(([input]) => urlOf(input).endsWith('/legal-disclosures'))

  it("offers a legal disclosure of a patient's record — this patient's — active or not", async () => {
    mockUser({ ...fullUser, isActive: false })
    renderAt('/admin/users/1')
    const region = await screen.findByRole('region', { name: 'Legal disclosures' })
    expect(await within(region).findByText('No disclosure has been made.')).toBeInTheDocument()
    expect(within(region).getByRole('button', { name: 'Record a disclosure' })).toBeInTheDocument()
    expect(
      fetchMock.mock.calls.some(([input]) => urlOf(input).endsWith('/users/1/legal-disclosures')),
    ).toBe(true)
  })
})

// The page's own part: it shows whether THIS user has two-factor sign-in on,
// with the reset (decisions §14). What the section does is tested in
// src/two-factor/ResetTwoFactorSection.test.tsx.
describe('UserEditPage — two-factor sign-in', () => {
  function mockUser(user: object) {
    fetchMock.mockImplementation((input) => {
      const url = urlOf(input)
      if (url.endsWith('/users/1')) {
        return Promise.resolve(new Response(JSON.stringify(user), { status: 200 }))
      }
      if (url.endsWith('/users/1/invitations')) {
        return Promise.resolve(new Response(JSON.stringify([]), { status: 200 }))
      }
      return Promise.resolve(new Response(JSON.stringify([]), { status: 200 }))
    })
  }

  it('says Off, with nothing to reset, for an account without it', async () => {
    mockUser(fullUser)
    renderAt('/admin/users/1')

    const region = await screen.findByRole('region', { name: 'Two-factor sign-in' })
    expect(region).toHaveTextContent('Off')
    expect(
      screen.queryByRole('button', { name: 'Reset two-factor sign-in' }),
    ).not.toBeInTheDocument()
  })

  it('offers the reset for an account with it on', async () => {
    mockUser({ ...fullUser, mfaEnabled: true })
    renderAt('/admin/users/1')

    const region = await screen.findByRole('region', { name: 'Two-factor sign-in' })
    expect(region).toHaveTextContent('On')
    expect(
      screen.getByRole('button', { name: 'Reset two-factor sign-in' }),
    ).toBeInTheDocument()
  })
})

// Merging duplicate patients (decisions §27, pass 4).
describe('UserEditPage — merges', () => {
  const merge = {
    id: 3,
    mergedId: 1,
    survivorId: 2,
    mergedAt: '2031-06-10T12:00:00.000Z',
    mergedBy: { id: 9, firstName: 'Ada', lastName: 'Admin' },
  }
  const survivor = { ...fullUser, id: 2, email: 'jamie.kept@example.com' }

  // The user, the merges and the full list; every other request (the
  // page's many sections) answered "nothing" — what they show isn't the
  // point here.
  function serve(merges: unknown[], user: unknown = fullUser) {
    fetchMock.mockImplementation((input) => {
      const url = new URL(urlOf(input))
      if (url.pathname === '/users/1') return Promise.resolve(Response.json(user))
      if (url.pathname === '/patient-merges') return Promise.resolve(Response.json(merges))
      if (url.pathname === '/users') return Promise.resolve(Response.json([survivor]))
      return Promise.resolve(Response.json([]))
    })
  }

  it("waits for the merges before showing a patient's page — a merged account never flashes its actions", async () => {
    fetchMock.mockImplementation((input) => {
      const url = new URL(urlOf(input))
      if (url.pathname === '/users/1') return Promise.resolve(Response.json(fullUser))
      if (url.pathname === '/patient-merges') return new Promise(() => {})
      return Promise.resolve(Response.json([]))
    })
    renderAt('/admin/users/1')
    await waitFor(() =>
      expect(
        fetchMock.mock.calls.some(([input]) => urlOf(input).includes('/patient-merges')),
      ).toBe(true),
    )
    expectLoading('Loading the user…')
    expect(screen.queryByRole('heading', { level: 1 })).toBeNull()
  })

  it("offers a patient's page the merge, linked to the merge page", async () => {
    serve([])
    renderAt('/admin/users/1')
    expect(
      await screen.findByRole('link', { name: 'Merge with another account…' }),
    ).toHaveAttribute('href', '/admin/users/1/merge')
  })

  it('says a merged-away account was merged, with a link — and offers none of its actions', async () => {
    serve([merge], { ...fullUser, isActive: false })
    renderAt('/admin/users/1')
    const notice = await screen.findByRole('region', { name: 'Merged into Jamie Doe' })
    expect(notice).toHaveTextContent(
      'Ada Admin merged this account into Jamie Doe (jamie.kept@example.com)',
    )
    expect(within(notice).getByRole('link', { name: 'Open Jamie Doe' })).toHaveAttribute(
      'href',
      '/admin/users/2',
    )
    expect(screen.queryByRole('button', { name: /Reactivate/ })).not.toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: 'Merge with another account…' }),
    ).not.toBeInTheDocument()
  })

  it("doesn't ask for the merges on a non-patient's page", async () => {
    fetchMock.mockImplementation((input) => {
      const url = new URL(urlOf(input))
      if (url.pathname === '/users/4') return Promise.resolve(Response.json(practitionerUser))
      return Promise.resolve(Response.json([]))
    })
    renderAt('/admin/users/4')
    await screen.findByRole('heading', { level: 1, name: 'Prac Titioner' })
    expect(
      fetchMock.mock.calls.some(([input]) => urlOf(input).includes('/patient-merges')),
    ).toBe(false)
    expect(
      screen.queryByRole('link', { name: 'Merge with another account…' }),
    ).not.toBeInTheDocument()
  })
})