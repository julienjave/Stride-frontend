import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
import { CreateUserPage } from './CreateUserPage'
import { adminMetricsQueryKey } from '@/app/home/admin/api'

const fetchMock = vi.fn<typeof fetch>()
vi.stubGlobal('fetch', fetchMock)

const mockClinics = [
  { id: 1, name: 'Acme Clinic', logoUrl: null },
  { id: 2, name: 'Second Clinic', logoUrl: null },
]

beforeEach(() => {
  fetchMock.mockReset()
})

// typeof fetch's first parameter is RequestInfo | URL — a string, a
// Request object, or a URL object. Calling .toString() unconditionally
// would be WRONG for a Request specifically: Request has no meaningful
// toString(), so it stringifies to the useless "[object Request]" rather
// than the actual URL — a real bug, not just a lint nitpick, since a test
// silently comparing against "[object Request]" would never notice its
// URL-matching logic stopped working. Every call site in this app always
// passes a plain string (see client.ts's apiRequest), but narrowing
// properly here means this helper stays correct even if that changes.
function urlOf(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input
  if (input instanceof URL) return input.toString()
  return input.url
}

// Two genuinely different endpoints are in play here (GET /clinics, fired
// on mount by useClinics, and POST /users, fired on submit) — a single
// fetchMock.mockResolvedValue(...) would return the SAME response for
// both, which would break whichever one didn't get the shape it expected.
// Branching on the URL is how every test below tells them apart, while
// still going through the one real fetchMock the app itself calls.
//
// A successful POST /users always returns the new account's first
// invitation (accounts are created by invitation); a test that doesn't
// care about it gets this pending one, emailed successfully. "Send the
// invitation again" (POST /users/:id/invitations) answers with
// `invitationResponse` — checked FIRST, since its URL contains /users too.
const EXPIRES_AT = '2026-10-14T10:00:00.000Z'
const sentInvitation = {
  id: 500,
  status: 'pending',
  expiresAt: EXPIRES_AT,
  emailSent: true,
}

function mockClinicsAndUserCreation(
  userResponse: object,
  userStatus = 201,
  invitationResponse: { body: object; status: number } = {
    body: sentInvitation,
    status: 201,
  },
) {
  const userBody =
    userStatus === 201 ? { invitation: sentInvitation, ...userResponse } : userResponse
  fetchMock.mockImplementation((input) => {
    const url = urlOf(input)
    if (url.includes('/clinics')) {
      return Promise.resolve(new Response(JSON.stringify(mockClinics), { status: 200 }))
    }
    if (url.includes('/invitations')) {
      return Promise.resolve(
        new Response(JSON.stringify(invitationResponse.body), {
          status: invitationResponse.status,
        }),
      )
    }
    if (url.includes('/users')) {
      return Promise.resolve(new Response(JSON.stringify(userBody), { status: userStatus }))
    }
    throw new Error(`Unexpected fetch to ${url}`)
  })
}

// The expiry as the page shows it — formatted the same way (viewer's
// locale and time zone), so the test doesn't depend on the machine's.
const expiryLabel = new Intl.DateTimeFormat(undefined, { dateStyle: 'long' }).format(
  new Date(EXPIRES_AT),
)

// The QueryClient can be passed in by a test that wants to look at the
// cache afterwards (the users list's invalidation).
function renderCreateUserPage(
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } }),
) {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/admin/users/new']}>
        <CreateUserPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

async function selectRole(user: ReturnType<typeof userEvent.setup>, roleLabel: string) {
  await user.click(screen.getByRole('combobox', { name: 'Role' }))
  await user.click(await screen.findByRole('option', { name: roleLabel }))
}

async function selectClinic(user: ReturnType<typeof userEvent.setup>, clinicName: string) {
  await user.click(screen.getByRole('combobox', { name: 'Clinic' }))
  await user.click(await screen.findByRole('option', { name: clinicName }))
}

async function selectCountry(user: ReturnType<typeof userEvent.setup>, countryName: string) {
  await user.click(screen.getByRole('combobox', { name: 'Country' }))
  await user.click(await screen.findByRole('option', { name: countryName }))
}

async function fillCommonFields(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Email'), 'new.user@example.com')
  await user.type(screen.getByLabelText('First name'), 'Jamie')
  await user.type(screen.getByLabelText('Last name'), 'Doe')
}

describe('CreateUserPage — role-conditional fields', () => {
  it('defaults to patient, showing date of birth and clinic, not practitioner/admin fields', () => {
    mockClinicsAndUserCreation({})
    renderCreateUserPage()

    expect(screen.getByLabelText('Date of birth')).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Clinic' })).toBeInTheDocument()
    expect(screen.queryByLabelText('License number')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Position (optional)')).not.toBeInTheDocument()
  })

  it('switching to practitioner shows license/specialties/bio + clinic, hides date of birth', async () => {
    mockClinicsAndUserCreation({})
    const user = userEvent.setup()
    renderCreateUserPage()

    await selectRole(user, 'Practitioner')

    expect(screen.getByLabelText('License number')).toBeInTheDocument()
    expect(screen.getByLabelText('Specialties (optional)')).toBeInTheDocument()
    expect(screen.getByLabelText('Bio (optional)')).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Clinic' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Date of birth')).not.toBeInTheDocument()
  })

  it('switching to admin hides the clinic field entirely, shows only position', async () => {
    mockClinicsAndUserCreation({})
    const user = userEvent.setup()
    renderCreateUserPage()

    await selectRole(user, 'Admin')

    expect(screen.getByLabelText('Position (optional)')).toBeInTheDocument()
    expect(screen.queryByRole('combobox', { name: 'Clinic' })).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Date of birth')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('License number')).not.toBeInTheDocument()
  })
})

describe('CreateUserPage — clinic requirement', () => {
  it('blocks submission for a patient with no clinic selected, and never calls POST /users', async () => {
    mockClinicsAndUserCreation({})
    const user = userEvent.setup()
    renderCreateUserPage()
    await fillCommonFields(user)
    await user.type(screen.getByLabelText('Date of birth'), '2000-01-01')
    // Deliberately NOT selecting a clinic.
    await user.click(screen.getByRole('button', { name: 'Create user' }))

    expect(await screen.findByText('Select a clinic for this patient')).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalledWith(
      expect.stringContaining('/users'),
      expect.anything(),
    )
  })

  it('does NOT require a clinic for an admin', async () => {
    mockClinicsAndUserCreation({ id: 99, firstName: 'Jamie', lastName: 'Doe', roles: ['admin'] })
    const user = userEvent.setup()
    renderCreateUserPage()
    await selectRole(user, 'Admin')
    await fillCommonFields(user)
    await user.click(screen.getByRole('button', { name: 'Create user' }))

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/users'),
        expect.objectContaining({ method: 'POST' }),
      ),
    )
  })
})

describe('CreateUserPage — role-specific required fields show the right message', () => {
  // Regression coverage: licenseNumberSchema/dateOfBirthSchema used to
  // carry their OWN bare .min(1) requiredness check, which fired its own
  // generic Zod error ("Too small: expected string to have >=1
  // characters") BEFORE superRefine's specific, role-aware message ever
  // got a chance to show. Fixed in schemas.ts; this locks in the correct
  // message actually being what's displayed.
  it('shows the specific message for a practitioner with no license number, not a generic one', async () => {
    mockClinicsAndUserCreation({})
    const user = userEvent.setup()
    renderCreateUserPage()
    await selectRole(user, 'Practitioner')
    await fillCommonFields(user)
    await selectClinic(user, 'Acme Clinic')
    await user.click(screen.getByRole('button', { name: 'Create user' }))

    expect(
      await screen.findByText('License number is required for practitioners'),
    ).toBeInTheDocument()
    expect(screen.queryByText(/Too small/)).not.toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalledWith(
      expect.stringContaining('/users'),
      expect.anything(),
    )
  })
})

describe('CreateUserPage — successful submission payloads', () => {
  it('sends the exact patient payload, with clinicId coerced to a number', async () => {
    mockClinicsAndUserCreation({
      id: 42,
      firstName: 'Jamie',
      lastName: 'Doe',
      roles: ['patient'],
    })
    const user = userEvent.setup()
    renderCreateUserPage()
    await fillCommonFields(user)
    await user.type(screen.getByLabelText('Date of birth'), '2000-01-01')
    await selectClinic(user, 'Second Clinic')
    await user.click(screen.getByRole('button', { name: 'Create user' }))

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/users'),
        expect.objectContaining({ method: 'POST' }),
      ),
    )
    // Parsing the body and comparing with toEqual, rather than matching a
    // raw JSON.stringify(...) string, on purpose: a string comparison is
    // sensitive to KEY ORDER, which has nothing to do with whether the
    // payload is actually correct — an early version of this test failed
    // for exactly that reason (right data, "wrong" order), which said
    // nothing real about the code. toEqual checks the actual data.
    const [, requestInit] = fetchMock.mock.calls.find(([url]) => urlOf(url).includes('/users'))!
    // JSON.parse's return type is genuinely `any` — there's no way for
    // TypeScript to know what shape a parsed string has. Same situation
    // client.ts's apiRequest is already in for response.json(): an
    // explicit, documented cast here, not an implicit any leaking into
    // the rest of the test.
    const body = JSON.parse(requestInit?.body as string) as Record<string, unknown>
    expect(body).toEqual({
      email: 'new.user@example.com',
      firstName: 'Jamie',
      lastName: 'Doe',
      role: 'patient',
      dateOfBirth: '2000-01-01',
      clinicId: 2,
    })
  })

  it('includes address fields in the payload when filled in', async () => {
    mockClinicsAndUserCreation({
      id: 44,
      firstName: 'Jamie',
      lastName: 'Doe',
      roles: ['patient'],
    })
    const user = userEvent.setup()
    renderCreateUserPage()
    await fillCommonFields(user)
    await user.type(screen.getByLabelText('Date of birth'), '2000-01-01')
    await selectClinic(user, 'Second Clinic')
    await user.type(screen.getByLabelText('Address line 1'), '1 Acme Way')
    await user.type(screen.getByLabelText('City'), 'Springfield')
    await user.type(screen.getByLabelText('Postal code'), '62704')
    await selectCountry(user, 'United States')
    await user.click(screen.getByRole('button', { name: 'Create user' }))

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/users'),
        expect.objectContaining({ method: 'POST' }),
      ),
    )
    const [, requestInit] = fetchMock.mock.calls.find(([url]) => urlOf(url).includes('/users'))!
    const body = JSON.parse(requestInit?.body as string) as Record<string, unknown>
    expect(body).toEqual({
      email: 'new.user@example.com',
      firstName: 'Jamie',
      lastName: 'Doe',
      role: 'patient',
      dateOfBirth: '2000-01-01',
      clinicId: 2,
      addressLine1: '1 Acme Way',
      addressCity: 'Springfield',
      addressPostalCode: '62704',
      addressCountry: 'US',
    })
  })

  // The three ways an entry gets into the list: Enter, a comma, and text
  // simply left in the box when the form is submitted — which counts as
  // an entry too, rather than being silently dropped.
  it('sends the exact practitioner payload, with specialties as a list — chips plus any text left in the box', async () => {
    mockClinicsAndUserCreation({
      id: 43,
      firstName: 'Jamie',
      lastName: 'Doe',
      roles: ['practitioner'],
    })
    const user = userEvent.setup()
    renderCreateUserPage()
    await selectRole(user, 'Practitioner')
    await fillCommonFields(user)
    await user.type(screen.getByLabelText('License number'), 'LIC-123')
    await user.type(screen.getByLabelText('Specialties (optional)'), 'Sports{Enter} Pediatrics , Neuro')
    await selectClinic(user, 'Acme Clinic')
    await user.click(screen.getByRole('button', { name: 'Create user' }))

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/users'),
        expect.objectContaining({ method: 'POST' }),
      ),
    )
    const [, requestInit] = fetchMock.mock.calls.find(([url]) => urlOf(url).includes('/users'))!
    // JSON.parse's return type is genuinely `any` — there's no way for
    // TypeScript to know what shape a parsed string has. Same situation
    // client.ts's apiRequest is already in for response.json(): an
    // explicit, documented cast here, not an implicit any leaking into
    // the rest of the test.
    const body = JSON.parse(requestInit?.body as string) as Record<string, unknown>
    expect(body).toEqual({
      email: 'new.user@example.com',
      firstName: 'Jamie',
      lastName: 'Doe',
      role: 'practitioner',
      licenseNumber: 'LIC-123',
      specialties: ['Sports', 'Pediatrics', 'Neuro'],
      clinicId: 1,
    })
  })

  // Text left in the box is checked by the same rules as Enter: if it
  // would be refused, the form doesn't submit — the person sees why.
  it('blocks the submit when the text left in the specialties box would be refused', async () => {
    mockClinicsAndUserCreation({})
    const user = userEvent.setup()
    renderCreateUserPage()
    await selectRole(user, 'Practitioner')
    await fillCommonFields(user)
    await user.type(screen.getByLabelText('License number'), 'LIC-123')
    await user.type(screen.getByLabelText('Specialties (optional)'), 'Sports{Enter}sports')
    await selectClinic(user, 'Acme Clinic')
    await user.click(screen.getByRole('button', { name: 'Create user' }))

    expect(await screen.findByText('"sports" is already in the list')).toBeInTheDocument()
    expect(
      fetchMock.mock.calls.some(([url, init]) => urlOf(url).includes('/users') && init?.method === 'POST'),
    ).toBe(false)
  })

  it('shows a success confirmation and resets the form for the next one', async () => {
    mockClinicsAndUserCreation({
      id: 44,
      firstName: 'Jamie',
      lastName: 'Doe',
      email: 'new.user@example.com',
      roles: ['patient'],
    })
    const user = userEvent.setup()
    renderCreateUserPage()
    await fillCommonFields(user)
    await user.type(screen.getByLabelText('Date of birth'), '2000-01-01')
    await selectClinic(user, 'Acme Clinic')
    await user.click(screen.getByRole('button', { name: 'Create user' }))

    expect(
      await screen.findByText('Created Jamie Doe (new.user@example.com) as patient.'),
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        `We emailed them an invitation to choose their password. The link works until ${expiryLabel}.`,
      ),
    ).toBeInTheDocument()
    // Nothing to resend when the email went out.
    expect(
      screen.queryByRole('button', { name: 'Send the invitation again' }),
    ).not.toBeInTheDocument()
    // The form actually reset — email field is empty again, ready for
    // the next account, matching the demo target of creating SEVERAL
    // test accounts in a row without leaving the page.
    expect(screen.getByLabelText('Email')).toHaveValue('')
  })

  // Found 2026-10-08: nothing refreshed the Users list after a creation,
  // and cached queries stay fresh for 30 seconds (queryClient.ts) — going
  // back to the list right away showed it without the new account.
  it('marks the cached Users list stale, so it shows the new account', async () => {
    mockClinicsAndUserCreation({
      id: 44,
      firstName: 'Jamie',
      lastName: 'Doe',
      email: 'new.user@example.com',
      roles: ['patient'],
    })
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    // The list as the admin last saw it, before this account existed — and
    // the admin home's numbers, which a new account changes too.
    queryClient.setQueryData(['users-list', false], [])
    queryClient.setQueryData(adminMetricsQueryKey, {})
    const user = userEvent.setup()
    renderCreateUserPage(queryClient)
    await fillCommonFields(user)
    await user.type(screen.getByLabelText('Date of birth'), '2000-01-01')
    await selectClinic(user, 'Acme Clinic')
    await user.click(screen.getByRole('button', { name: 'Create user' }))

    await screen.findByText('Created Jamie Doe (new.user@example.com) as patient.')
    expect(queryClient.getQueryState(['users-list', false])?.isInvalidated).toBe(true)
    expect(queryClient.getQueryState(adminMetricsQueryKey)?.isInvalidated).toBe(true)
  })
})

describe('CreateUserPage — invitations', () => {
  // Accounts are created by invitation: whoever creates an account never
  // sets its password (and the backend now refuses one in the request).
  it('has no password field', () => {
    mockClinicsAndUserCreation({})
    renderCreateUserPage()
    expect(screen.queryByLabelText(/password/i)).not.toBeInTheDocument()
  })

  async function createWithFailedEmail(
    user: ReturnType<typeof userEvent.setup>,
    queryClient?: QueryClient,
  ) {
    renderCreateUserPage(queryClient)
    await fillCommonFields(user)
    await user.type(screen.getByLabelText('Date of birth'), '2000-01-01')
    await selectClinic(user, 'Acme Clinic')
    await user.click(screen.getByRole('button', { name: 'Create user' }))
    await screen.findByText('Created Jamie Doe (new.user@example.com) as patient.')
  }

  // The account exists even though the email failed — the page says so,
  // and offers to send a NEW invitation, never to create the account again.
  it('offers to send the invitation again when its email failed, and reports the new one', async () => {
    mockClinicsAndUserCreation({
      id: 44,
      firstName: 'Jamie',
      lastName: 'Doe',
      email: 'new.user@example.com',
      roles: ['patient'],
      invitation: { ...sentInvitation, emailSent: false },
    })
    const user = userEvent.setup()
    await createWithFailedEmail(user)

    expect(
      screen.getByText(
        'The invitation email could not be sent. The account exists — send the invitation again so they can choose their password.',
      ),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Send the invitation again' }))

    expect(
      await screen.findByText(
        `We emailed them an invitation to choose their password. The link works until ${expiryLabel}.`,
      ),
    ).toBeInTheDocument()
    // The new invitation, for THIS account, created with a POST.
    const call = fetchMock.mock.calls.find(([url]) => urlOf(url).includes('/invitations'))
    expect(call).toBeDefined()
    expect(urlOf(call![0])).toContain('/users/44/invitations')
    expect(call![1]).toEqual(expect.objectContaining({ method: 'POST' }))
  })

  // The account was on the admin home's "Invitations to send again" (its
  // email failed): sending again marks the home's numbers stale.
  it("marks the admin home's numbers stale after sending again", async () => {
    mockClinicsAndUserCreation({
      id: 44,
      firstName: 'Jamie',
      lastName: 'Doe',
      email: 'new.user@example.com',
      roles: ['patient'],
      invitation: { ...sentInvitation, emailSent: false },
    })
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const user = userEvent.setup()
    await createWithFailedEmail(user, queryClient)
    // Fresh again after the create's own refresh, so only the resend can
    // mark it.
    queryClient.setQueryData(adminMetricsQueryKey, {})
    expect(queryClient.getQueryState(adminMetricsQueryKey)?.isInvalidated).toBe(false)

    await user.click(screen.getByRole('button', { name: 'Send the invitation again' }))

    await screen.findByText(
      `We emailed them an invitation to choose their password. The link works until ${expiryLabel}.`,
    )
    expect(queryClient.getQueryState(adminMetricsQueryKey)?.isInvalidated).toBe(true)
  })

  it("shows the backend's message when sending again fails", async () => {
    mockClinicsAndUserCreation(
      {
        id: 44,
        firstName: 'Jamie',
        lastName: 'Doe',
        email: 'new.user@example.com',
        roles: ['patient'],
        invitation: { ...sentInvitation, emailSent: false },
      },
      201,
      {
        body: { statusCode: 403, message: ['Not allowed to invite this account'] },
        status: 403,
      },
    )
    const user = userEvent.setup()
    await createWithFailedEmail(user)

    await user.click(screen.getByRole('button', { name: 'Send the invitation again' }))

    expect(await screen.findByText('Not allowed to invite this account')).toBeInTheDocument()
    // Still offered: the account still has no delivered invitation.
    expect(screen.getByRole('button', { name: 'Send the invitation again' })).toBeEnabled()
  })

  // The notice is keyed by the account's id (InvitationSentNotice): the
  // next account gets a FRESH notice, not the previous one's resend error.
  it("doesn't carry a failed resend over to the next account created", async () => {
    let nextId = 44
    fetchMock.mockImplementation((input) => {
      const url = urlOf(input)
      if (url.includes('/clinics')) {
        return Promise.resolve(new Response(JSON.stringify(mockClinics), { status: 200 }))
      }
      if (url.includes('/invitations')) {
        return Promise.resolve(
          new Response(
            JSON.stringify({ statusCode: 403, message: ['Not allowed to invite this account'] }),
            { status: 403 },
          ),
        )
      }
      // Each creation answers with a new account, its email failed.
      const id = nextId++
      return Promise.resolve(
        new Response(
          JSON.stringify({
            id,
            firstName: 'Jamie',
            lastName: `Doe${id}`,
            email: `jamie${id}@example.com`,
            roles: ['patient'],
            invitation: { ...sentInvitation, id: id * 10, emailSent: false },
          }),
          { status: 201 },
        ),
      )
    })
    const user = userEvent.setup()
    renderCreateUserPage()

    async function createOne() {
      // user.clear() before typing: user-event remembers what it typed into
      // each field, and react-hook-form's reset() empties the field behind
      // its back — typing straight after a reset would replay the old text
      // ("new.user@…new.user@…"). A test-tool quirk, not the app's: a real
      // browser has no such memory (checked in Chromium, 2026-10-08).
      for (const label of ['Email', 'First name', 'Last name', 'Date of birth']) {
        await user.clear(screen.getByLabelText(label))
      }
      await fillCommonFields(user)
      await user.type(screen.getByLabelText('Date of birth'), '2000-01-01')
      await selectClinic(user, 'Acme Clinic')
      await user.click(screen.getByRole('button', { name: 'Create user' }))
    }

    await createOne()
    await screen.findByText('Created Jamie Doe44 (jamie44@example.com) as patient.')
    await user.click(screen.getByRole('button', { name: 'Send the invitation again' }))
    await screen.findByText('Not allowed to invite this account')

    await createOne()
    await screen.findByText('Created Jamie Doe45 (jamie45@example.com) as patient.')
    expect(screen.queryByText('Not allowed to invite this account')).not.toBeInTheDocument()
  })
})

// Found in manual testing (2026-10-07): after a successful creation, the
// reset form showed "Select a clinic for this patient" — and "Country is
// required" when a country had been chosen. Radix's Select reports the
// reset of its value as an empty "change", which reached the form as if the
// person had cleared the field (see common/ignoreEmptySelection.ts). The
// success test above only checked that the email field was empty, so it
// never noticed the errors.
describe('CreateUserPage — the form after a successful creation', () => {
  it('is empty AND free of errors — the reset is not taken for a user change', async () => {
    mockClinicsAndUserCreation({
      id: 45,
      firstName: 'Jamie',
      lastName: 'Doe',
      email: 'new.user@example.com',
      roles: ['patient'],
    })
    const user = userEvent.setup()
    renderCreateUserPage()
    await fillCommonFields(user)
    await user.type(screen.getByLabelText('Date of birth'), '2000-01-01')
    await selectClinic(user, 'Acme Clinic')
    await user.type(screen.getByLabelText('Address line 1'), '1 Acme Way')
    await user.type(screen.getByLabelText('City'), 'Springfield')
    await user.type(screen.getByLabelText('Postal code'), '62704')
    await selectCountry(user, 'United States')
    await user.click(screen.getByRole('combobox', { name: 'State/Province (if applicable)' }))
    await user.click(await screen.findByRole('option', { name: 'Illinois' }))
    await user.click(screen.getByRole('button', { name: 'Create user' }))

    await screen.findByText('Created Jamie Doe (new.user@example.com) as patient.')
    // Every select is back on its placeholder…
    expect(screen.getByRole('combobox', { name: 'Clinic' })).toHaveTextContent('Select a clinic')
    expect(screen.getByRole('combobox', { name: 'Country' })).toHaveTextContent(
      'Select a country',
    )
    // With no country chosen, the state is a plain text field again (the
    // dropdown only exists for a country with a state list) — and empty.
    expect(screen.getByLabelText('State/Province (if applicable)')).toHaveValue('')
    // …and nothing is flagged: no field was touched since the reset.
    await waitFor(() => {
      expect(screen.queryByText('Select a clinic for this patient')).not.toBeInTheDocument()
      expect(screen.queryByText('Country is required')).not.toBeInTheDocument()
    })
  })
})

describe('CreateUserPage — a failed submission', () => {
  it('shows the backend error message', async () => {
    mockClinicsAndUserCreation(
      { statusCode: 409, message: ['A user with this email already exists'] },
      409,
    )
    const user = userEvent.setup()
    renderCreateUserPage()
    await fillCommonFields(user)
    await user.type(screen.getByLabelText('Date of birth'), '2000-01-01')
    await selectClinic(user, 'Acme Clinic')
    await user.click(screen.getByRole('button', { name: 'Create user' }))

    expect(
      await screen.findByText('A user with this email already exists'),
    ).toBeInTheDocument()
  })
})