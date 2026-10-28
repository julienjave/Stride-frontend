import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createMemoryRouter, Outlet, RouterProvider } from 'react-router'
import { ProfilePage } from './ProfilePage'
import { UserMenu } from '@/app/layout/UserMenu'
import { currentUserQueryKey } from '@/auth/useCurrentUser'
import {
  errorResponse,
  expectLoadError,
  retryThenExpectFocusOn,
} from '@/common/loadFailureAssertions'
import type { User } from './types'

// The avatar upload now goes through a crop dialog. jsdom can't run the
// real cropper or canvas, so both are replaced (same fakes as in
// AvatarUpload.test.tsx, which covers the crop step itself).
vi.mock('react-easy-crop', () => import('./FakeCropper'))
vi.mock('./cropImage', () => ({
  cropToAvatarFile: vi.fn(() =>
    Promise.resolve(new File(['x'], 'avatar.jpg', { type: 'image/jpeg' })),
  ),
}))

const fetchMock = vi.fn<typeof fetch>()
vi.stubGlobal('fetch', fetchMock)

beforeEach(() => {
  fetchMock.mockReset()
})

// A practitioner + admin account — like the dev database's
// multirole-verify@example.com — so one fixture exercises both role
// sections and the license-number rule.
const multiRoleUser: User = {
  id: 2,
  email: 'julien@example.com',
  firstName: 'Julien',
  lastName: 'Martin',
  avatarUrl: null,
  phone: '555-0100',
  addressLine1: null,
  addressLine2: null,
  addressCity: null,
  addressState: null,
  addressPostalCode: null,
  addressCountry: null,
  isActive: true,
  createdAt: '2026-09-01T00:00:00.000Z',
  mfaEnabled: false,
  preferredWeightUnit: 'kg',
  roles: ['practitioner', 'admin'],
  practitionerProfile: { licenseNumber: 'PT-1', specialties: ['Sports rehab'], bio: null },
  adminProfile: { position: null },
  clinics: [{ id: 1, name: 'Verify Clinic' }],
}

const patientUser: User = {
  ...multiRoleUser,
  id: 3,
  firstName: 'Pat',
  lastName: 'Ient',
  roles: ['patient'],
  practitionerProfile: undefined,
  adminProfile: undefined,
  patientProfile: { dateOfBirth: '1990-01-01' },
  clinics: [],
}

function urlOf(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input
  if (input instanceof URL) return input.toString()
  return input.url
}

// A tiny fake backend: GET /users/:id returns the user; PATCH merges the
// sent fields into it and returns the result — like the real
// UsersService.update() (profile fields nested, the rest top-level).
function fakeBackend(user: User, patchResponse?: Response) {
  fetchMock.mockImplementation((input, init) => {
    const url = urlOf(input)
    // The Email row asks whether a change of email is waiting: none.
    if (url.endsWith('/auth/email-change')) {
      return Promise.resolve(new Response('{"pending":null}', { status: 200 }))
    }
    if (!url.endsWith(`/users/${user.id}`)) {
      return Promise.resolve(new Response('{}', { status: 404 }))
    }
    if (init?.method === 'PATCH') {
      if (patchResponse) return Promise.resolve(patchResponse)
      const body = JSON.parse(init.body as string) as Record<string, unknown>
      const { licenseNumber, specialties, bio, dateOfBirth, position, ...rest } = body
      const updated = {
        ...user,
        ...rest,
        ...(user.practitionerProfile && {
          practitionerProfile: {
            ...user.practitionerProfile,
            ...(licenseNumber !== undefined && { licenseNumber }),
            ...(specialties !== undefined && { specialties }),
            ...(bio !== undefined && { bio }),
          },
        }),
        ...(user.patientProfile && {
          patientProfile: { dateOfBirth: dateOfBirth ?? user.patientProfile.dateOfBirth },
        }),
        ...(user.adminProfile && {
          adminProfile: { position: position === undefined ? user.adminProfile.position : position },
        }),
      }
      return Promise.resolve(new Response(JSON.stringify(updated), { status: 200 }))
    }
    return Promise.resolve(new Response(JSON.stringify(user), { status: 200 }))
  })
}

// The PATCH requests actually sent, as [url, body] pairs — the body as
// the literal string that went over the wire.
function patchCalls() {
  return fetchMock.mock.calls
    .filter(([, init]) => init?.method === 'PATCH')
    .map(([input, init]) => [urlOf(input), init?.body])
}

// The page inside a layout that ALSO shows the account menu — so a test
// can check what the header DISPLAYS after an edit, not just the cache.
// `state`: what the previous page handed over (a notice), as navigate() would.
function renderProfile(user: User, activeRole: string, state?: unknown) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  const { clinics: _clinics, ...me } = user
  queryClient.setQueryData(currentUserQueryKey, { ...me, activeRole })
  const router = createMemoryRouter(
    [
      {
        element: (
          <>
            <UserMenu />
            <Outlet />
          </>
        ),
        children: [{ path: '/profile', element: <ProfilePage /> }],
      },
    ],
    { initialEntries: [{ pathname: '/profile', state }] },
  )
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
}

// Opens a field's editor, replaces its text, and saves.
async function editField(label: string, newValue: string) {
  await userEvent.click(await screen.findByRole('button', { name: `Edit ${label}` }))
  const input = screen.getByLabelText(label)
  await userEvent.clear(input)
  if (newValue) await userEvent.type(input, newValue)
  await userEvent.click(screen.getByRole('button', { name: 'Save' }))
}

function sectionNames() {
  return screen.getAllByRole('region').map((region) => region.getAttribute('aria-labelledby'))
}

describe('ProfilePage — what it shows', () => {
  it('shows the photo, a section for EVERY role held in a fixed order, and clinics', async () => {
    fakeBackend(multiRoleUser)
    renderProfile(multiRoleUser, 'practitioner')
    await screen.findByRole('heading', { name: 'My profile' })

    expect(sectionNames()).toEqual([
      'profile-photo',
      'profile-section-personal-details',
      'profile-section-sign-in-and-security',
      'profile-section-admin-details',
      'profile-section-practitioner-details',
      'profile-clinics',
    ])
    expect(screen.queryByRole('region', { name: 'Patient details' })).not.toBeInTheDocument()
    expect(
      within(screen.getByRole('region', { name: 'Clinics' })).getByText('Verify Clinic'),
    ).toBeInTheDocument()
  })

  // Never an inline edit (it's the sign-in name): "Change" leads to its own
  // page, on the person's own profile (decisions §12) — in the sign-in
  // section beside the password (§13), and only there: the personal details
  // no longer show the address.
  it('offers to change the email and the password, each on its own page, in the sign-in section', async () => {
    fakeBackend(multiRoleUser)
    renderProfile(multiRoleUser, 'practitioner')
    const signIn = await screen.findByRole('region', { name: 'Sign-in and security' })
    expect(within(signIn).getByText('julien@example.com')).toBeInTheDocument()
    expect(
      within(screen.getByRole('region', { name: 'Personal details' })).queryByText('Email'),
    ).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Edit Email' })).not.toBeInTheDocument()
    expect(within(signIn).getByRole('link', { name: 'Change Email' })).toHaveAttribute(
      'href',
      '/profile/email',
    )
    expect(within(signIn).getByRole('link', { name: 'Change Password' })).toHaveAttribute(
      'href',
      '/profile/password',
    )
    // Two-factor sign-in (decisions §14): off here, so "Set up".
    expect(within(signIn).getByText('Two-factor sign-in')).toBeInTheDocument()
    expect(within(signIn).getByRole('link', { name: 'Set up two-factor sign-in' }))
      .toHaveAttribute('href', '/profile/two-factor')
  })

  // Handed over by /profile/password after a change.
  it("a failed load: the load error with its reason; a retry that works focuses the page's heading", async () => {
    const user = userEvent.setup()
    fakeBackend(patientUser)
    const backend = fetchMock.getMockImplementation()
    let failures = 1
    fetchMock.mockImplementation((input, init) => {
      if (urlOf(input).endsWith('/users/3') && failures > 0) {
        failures -= 1
        return Promise.resolve(errorResponse(500))
      }
      return backend!(input, init)
    })
    renderProfile(patientUser, 'patient')
    await expectLoadError('your profile')
    await retryThenExpectFocusOn(user, { level: 1, name: 'My profile' })
  })

  it('shows the notice another page handed over, and none otherwise', async () => {
    fakeBackend(patientUser)
    renderProfile(patientUser, 'patient', { notice: 'Your password is changed.' })
    expect(await screen.findByRole('status')).toHaveTextContent('Your password is changed.')
  })

  it('shows no notice when none was handed over', async () => {
    fakeBackend(patientUser)
    renderProfile(patientUser, 'patient')
    await screen.findByRole('heading', { name: 'My profile' })
    await screen.findByRole('region', { name: 'Sign-in and security' })
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('shows a patient their date of birth as a readable date, and "no clinic" plainly', async () => {
    fakeBackend(patientUser)
    renderProfile(patientUser, 'patient')
    // The exact text depends on the test machine's locale — asserting on
    // the parts that don't vary.
    expect(await screen.findByText(/1990/)).toHaveTextContent(/January|janvier/)
    expect(screen.getByText('Not a member of any clinic')).toBeInTheDocument()
    expect(sectionNames()).toContain('profile-section-patient-details')
  })

  // The way to "My records" (decisions §8): for a patient, right under the
  // heading. (The multi-role test above lists every section of a
  // practitioner's page: no records row there.)
  it('leads a patient to their medical records, first on the page', async () => {
    fakeBackend(patientUser)
    renderProfile(patientUser, 'patient')
    const records = await screen.findByRole('region', { name: 'Medical records' })
    expect(sectionNames()[0]).toBe('profile-records')
    expect(within(records).getByRole('link', { name: 'My records' })).toHaveAttribute('href', '/profile/records')
  })
})

describe('ProfilePage — license number (admin-only, decisions §4)', () => {
  it('is read-only, with an explanation, while acting as a practitioner', async () => {
    fakeBackend(multiRoleUser)
    renderProfile(multiRoleUser, 'practitioner')
    await screen.findByText('PT-1')
    expect(screen.queryByRole('button', { name: 'Edit License number' })).not.toBeInTheDocument()
    expect(
      screen.getByText('Only an admin can change this. Ask your clinic admin.'),
    ).toBeInTheDocument()
  })

  it('is editable once the same account is acting as admin', async () => {
    fakeBackend(multiRoleUser)
    renderProfile(multiRoleUser, 'admin')
    await editField('License number', 'PT-NEW')
    expect(patchCalls()).toEqual([
      [expect.stringMatching(/\/users\/2$/), '{"licenseNumber":"PT-NEW"}'],
    ])
    expect(await screen.findByText('PT-NEW')).toBeInTheDocument()
  })

  it("shows the backend's 409 message under the field when the number is taken", async () => {
    fakeBackend(
      multiRoleUser,
      new Response(
        JSON.stringify({
          statusCode: 409,
          message: ['This license number is already registered to another practitioner'],
          error: 'Conflict',
          timestamp: '',
          path: '/users/2',
        }),
        { status: 409 },
      ),
    )
    renderProfile(multiRoleUser, 'admin')
    await editField('License number', 'PT-TAKEN')
    expect(
      await screen.findByText('This license number is already registered to another practitioner'),
    ).toBeInTheDocument()
  })
})

describe('ProfilePage — saving', () => {
  it('renaming yourself updates the page AND the name in the account menu', async () => {
    fakeBackend(multiRoleUser)
    renderProfile(multiRoleUser, 'practitioner')
    await editField('First name', 'Julia')

    expect(patchCalls()).toEqual([
      [expect.stringMatching(/\/users\/2$/), '{"firstName":"Julia"}'],
    ])
    // The profile shows the new name…
    expect(await screen.findByRole('button', { name: 'Edit First name' })).toBeInTheDocument()
    // …and so does the header, which reads a DIFFERENT cache entry
    // (/auth/me). The role shown there must survive the update, too.
    const menuButton = screen.getByRole('button', { name: 'Account menu' })
    expect(menuButton).toHaveTextContent('Julia')
    expect(menuButton).toHaveTextContent('Practitioner')
  })

  it('clearing the phone sends null', async () => {
    fakeBackend(multiRoleUser)
    renderProfile(multiRoleUser, 'practitioner')
    await editField('Phone', '')
    expect(patchCalls()).toEqual([[expect.stringMatching(/\/users\/2$/), '{"phone":null}']])
  })

  it('saves specialties as a JSON array', async () => {
    fakeBackend(multiRoleUser)
    renderProfile(multiRoleUser, 'practitioner')
    await userEvent.click(await screen.findByRole('button', { name: 'Edit Specialties' }))
    await userEvent.type(screen.getByLabelText('Specialties'), 'Ortho{Enter}')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(patchCalls()).toEqual([
      [expect.stringMatching(/\/users\/2$/), '{"specialties":["Sports rehab","Ortho"]}'],
    ])
  })

  it('saves an address as all six fields in one request', async () => {
    fakeBackend(multiRoleUser)
    renderProfile(multiRoleUser, 'practitioner')
    await userEvent.click(await screen.findByRole('button', { name: 'Edit Address' }))
    await userEvent.type(screen.getByLabelText('Address line 1'), '1 Main St')
    await userEvent.type(screen.getByLabelText('City'), 'Springfield')
    await userEvent.type(screen.getByLabelText('Postal code'), '62704')
    await userEvent.click(screen.getByRole('combobox', { name: 'Country' }))
    await userEvent.click(await screen.findByRole('option', { name: 'Aland Islands' }))
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(patchCalls()).toEqual([
      [
        expect.stringMatching(/\/users\/2$/),
        '{"addressLine1":"1 Main St","addressLine2":null,"addressCity":"Springfield",' +
          '"addressState":null,"addressPostalCode":"62704","addressCountry":"AX"}',
      ],
    ])
    expect(await screen.findByText('62704 Springfield')).toBeInTheDocument()
  })

  it("a patient can correct their date of birth", async () => {
    fakeBackend(patientUser)
    renderProfile(patientUser, 'patient')
    await editField('Date of birth', '1991-02-02')
    expect(patchCalls()).toEqual([
      [expect.stringMatching(/\/users\/3$/), '{"dateOfBirth":"1991-02-02"}'],
    ])
  })
})

describe('ProfilePage — photo', () => {
  // The avatar in the account menu reads the /auth/me cache entry, not the
  // profile's GET /users/:id entry. This checks the whole chain on the
  // real page: upload → response → applyUpdatedUser() → the HEADER shows
  // the new photo, with the active role still under the name.
  it('uploading your own photo shows it in the account menu, too', async () => {
    const newUrl = 'https://storage.example.com/signed/avatars/2/new.png'
    fetchMock.mockImplementation((input, init) => {
      const url = urlOf(input)
      if (url.endsWith('/users/2/avatar') && init?.method === 'POST') {
        return Promise.resolve(
          new Response(JSON.stringify({ ...multiRoleUser, avatarUrl: newUrl }), { status: 201 }),
        )
      }
      return Promise.resolve(new Response(JSON.stringify(multiRoleUser), { status: 200 }))
    })
    renderProfile(multiRoleUser, 'practitioner')
    await screen.findByRole('button', { name: 'Upload photo' })

    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    await userEvent.upload(input, new File(['x'], 'me.png', { type: 'image/png' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Simulate photo loaded' }))
    await userEvent.click(screen.getByRole('button', { name: 'Save photo' }))

    const menuButton = screen.getByRole('button', { name: 'Account menu' })
    await waitFor(() => expect(menuButton.querySelector('img')).toHaveAttribute('src', newUrl))
    expect(menuButton).toHaveTextContent('Practitioner')
  })
})