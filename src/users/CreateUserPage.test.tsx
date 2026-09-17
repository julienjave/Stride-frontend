import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
import { CreateUserPage } from './CreateUserPage'

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
function mockClinicsAndUserCreation(userResponse: unknown, userStatus = 201) {
  fetchMock.mockImplementation((input) => {
    const url = urlOf(input)
    if (url.includes('/clinics')) {
      return Promise.resolve(new Response(JSON.stringify(mockClinics), { status: 200 }))
    }
    if (url.includes('/users')) {
      return Promise.resolve(new Response(JSON.stringify(userResponse), { status: userStatus }))
    }
    throw new Error(`Unexpected fetch to ${url}`)
  })
}

function renderCreateUserPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
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

async function fillCommonFields(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Email'), 'new.user@example.com')
  await user.type(screen.getByLabelText('Temporary password'), 'a-strong-password')
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
    expect(screen.getByLabelText('Specialties (optional, comma-separated)')).toBeInTheDocument()
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
      password: 'a-strong-password',
      firstName: 'Jamie',
      lastName: 'Doe',
      role: 'patient',
      dateOfBirth: '2000-01-01',
      clinicId: 2,
    })
  })

  it('sends the exact practitioner payload, splitting specialties into a trimmed array', async () => {
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
    await user.type(screen.getByLabelText('Specialties (optional, comma-separated)'), 'Sports,  Pediatrics ,')
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
      password: 'a-strong-password',
      firstName: 'Jamie',
      lastName: 'Doe',
      role: 'practitioner',
      licenseNumber: 'LIC-123',
      specialties: ['Sports', 'Pediatrics'],
      clinicId: 1,
    })
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
    // The form actually reset — email field is empty again, ready for
    // the next account, matching the demo target of creating SEVERAL
    // test accounts in a row without leaving the page.
    expect(screen.getByLabelText('Email')).toHaveValue('')
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