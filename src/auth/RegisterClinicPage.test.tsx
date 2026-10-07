import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
import { RegisterClinicPage } from './RegisterClinicPage'
import { setupStatusQueryKey } from './useSetupStatus'

// Default: a brand-new install, the only one where this page shows its form.
const fetchMock = vi.fn<typeof fetch>()
vi.stubGlobal('fetch', fetchMock)

// The page asks GET /auth/setup-status as soon as it renders (useSetupStatus),
// on top of whatever call a test is about. Every OTHER request goes to
// apiMock, so each test sets up and asserts on just the call it's about, as
// if setup-status weren't there. One shared Response for both would break:
// a Response's body can be read only once.
const apiMock = vi.fn<typeof fetch>()
// What GET /auth/setup-status answers. Reset before each test; a test that
// needs another answer replaces it BEFORE rendering.
let setupStatusResponse: () => Promise<Response>

function setupStatusIs(setupComplete: boolean) {
  setupStatusResponse = () =>
    Promise.resolve(new Response(JSON.stringify({ setupComplete }), { status: 200 }))
}

// See CreateUserPage.test.tsx for why a Request needs .url, not toString().
function urlOf(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input
  if (input instanceof URL) return input.toString()
  return input.url
}

beforeEach(() => {
  fetchMock.mockReset()
  apiMock.mockReset()
  setupStatusIs(false)
  fetchMock.mockImplementation((input, init) =>
    urlOf(input).endsWith('/auth/setup-status') ? setupStatusResponse() : apiMock(input, init),
  )
})

function renderRegisterClinicPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/register-clinic']}>
        <RegisterClinicPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return { queryClient }
}

async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
  // findBy, not getBy: the form appears only once setup-status has answered.
  await user.type(await screen.findByLabelText('Clinic name'), 'Acme Clinic')
  await user.type(screen.getByLabelText('Clinic email'), 'clinic@example.com')
  await user.type(screen.getByLabelText('First name'), 'Jane')
  await user.type(screen.getByLabelText('Last name'), 'Doe')
  await user.type(screen.getByLabelText('Email'), 'admin@example.com')
  await user.type(screen.getByLabelText('Password'), 'password123')
  await user.type(screen.getByLabelText('Confirm password'), 'password123')
}

async function selectCountry(user: ReturnType<typeof userEvent.setup>, countryName: string) {
  await user.click(screen.getByRole('combobox', { name: 'Country (optional)' }))
  await user.click(await screen.findByRole('option', { name: countryName }))
}

function mockSuccessResponse() {
  apiMock.mockResolvedValue(
    new Response(
      JSON.stringify({
        id: 1,
        email: 'admin@example.com',
        firstName: 'Jane',
        lastName: 'Doe',
        activeRole: 'admin',
        roles: ['admin'],
        clinicId: 501,
      }),
      { status: 201 },
    ),
  )
}

describe('RegisterClinicPage', () => {
  it('submits the exact backend shape, WITHOUT confirmPassword, when no optional fields are filled in', async () => {
    mockSuccessResponse()

    const user = userEvent.setup()
    renderRegisterClinicPage()
    await fillValidForm(user)
    await user.click(screen.getByRole('button', { name: 'Create clinic' }))

    await waitFor(() =>
      expect(apiMock).toHaveBeenCalledWith(
        expect.stringContaining('/auth/register-clinic'),
        expect.objectContaining({
          method: 'POST',
          // The real point of this assertion: confirmPassword must never
          // appear, and none of clinicPhone/clinicWebsite/clinicAddress/
          // position appear either, since they were left untouched —
          // registerClinic() in api.ts is responsible for both.
          body: JSON.stringify({
            clinicName: 'Acme Clinic',
            clinicEmail: 'clinic@example.com',
            email: 'admin@example.com',
            password: 'password123',
            firstName: 'Jane',
            lastName: 'Doe',
          }),
        }),
      ),
    )
  })

  it('includes all optional fields when the person fills them in', async () => {
    mockSuccessResponse()

    const user = userEvent.setup()
    renderRegisterClinicPage()
    await fillValidForm(user)
    await user.type(screen.getByLabelText('Phone (optional)'), '555-1234')
    await user.type(screen.getByLabelText('Website (optional)'), 'https://acme-clinic.example')
    await user.type(screen.getByLabelText('Address line 1 (optional)'), '1 Acme Way')
    await user.type(screen.getByLabelText('City (optional)'), 'Springfield')
    await user.type(screen.getByLabelText('Postal code (optional)'), '62704')
    await selectCountry(user, 'United States')
    await user.type(screen.getByLabelText('Position (optional)'), 'Practice Owner')
    await user.click(screen.getByRole('button', { name: 'Create clinic' }))

    await waitFor(() =>
      expect(apiMock).toHaveBeenCalledWith(
        expect.stringContaining('/auth/register-clinic'),
        expect.objectContaining({ method: 'POST' }),
      ),
    )
    // Parsing and comparing with toEqual, not a raw JSON string — see
    // CreateUserPage.test.tsx for why a string comparison is the wrong
    // tool here (it's sensitive to key order, not to actual correctness).
    const [, requestInit] = apiMock.mock.calls[0]
    const body = JSON.parse(requestInit?.body as string) as Record<string, unknown>
    expect(body).toEqual({
      clinicName: 'Acme Clinic',
      clinicEmail: 'clinic@example.com',
      email: 'admin@example.com',
      password: 'password123',
      firstName: 'Jane',
      lastName: 'Doe',
      clinicPhone: '555-1234',
      clinicWebsite: 'https://acme-clinic.example',
      clinicAddressLine1: '1 Acme Way',
      clinicAddressCity: 'Springfield',
      clinicAddressPostalCode: '62704',
      clinicAddressCountry: 'US',
      position: 'Practice Owner',
    })
  })

  it('shows a validation error and never calls the API when passwords do not match', async () => {
    const user = userEvent.setup()
    renderRegisterClinicPage()
    await fillValidForm(user)
    await user.clear(screen.getByLabelText('Confirm password'))
    await user.type(screen.getByLabelText('Confirm password'), 'somethingElse')
    await user.click(screen.getByRole('button', { name: 'Create clinic' }))

    expect(await screen.findByText("Passwords don't match")).toBeInTheDocument()
    expect(apiMock).not.toHaveBeenCalled()
  })

  // Someone else completed setup after this page asked: the 403 corrects
  // the cached status, and the page becomes the "already set up" notice.
  it('switches to the "already set up" notice on a 403 (setup completed in the meantime)', async () => {
    apiMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          statusCode: 403,
          message: ['An administrator account already exists'],
        }),
        { status: 403 },
      ),
    )

    const user = userEvent.setup()
    const { queryClient } = renderRegisterClinicPage()
    await fillValidForm(user)
    await user.click(screen.getByRole('button', { name: 'Create clinic' }))

    expect(
      await screen.findByRole('heading', { name: 'Stride is already set up' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Log in instead' })).toHaveAttribute('href', '/login')
    expect(screen.queryByRole('button', { name: 'Create clinic' })).not.toBeInTheDocument()
    // Not shown as an error: nothing went wrong, the step is just done.
    expect(screen.queryByText('An administrator account already exists')).not.toBeInTheDocument()
    expect(queryClient.getQueryData(setupStatusQueryKey)).toEqual({ setupComplete: true })
  })

  it('shows the generic red-banner error for any non-403 ApiError (e.g. duplicate email)', async () => {
    apiMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          statusCode: 409,
          message: ['A user with this email already exists'],
        }),
        { status: 409 },
      ),
    )

    const user = userEvent.setup()
    renderRegisterClinicPage()
    await fillValidForm(user)
    await user.click(screen.getByRole('button', { name: 'Create clinic' }))

    const message = await screen.findByText('A user with this email already exists')
    expect(message).toBeInTheDocument()
    expect(message).toHaveClass('text-destructive')
  })

  describe('when Stride is already set up', () => {
    it('shows the "already set up" notice instead of the form, with a way to log in', async () => {
      setupStatusIs(true)
      renderRegisterClinicPage()

      expect(
        await screen.findByRole('heading', { name: 'Stride is already set up' }),
      ).toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'Log in instead' })).toHaveAttribute(
        'href',
        '/login',
      )
      expect(screen.queryByLabelText('Clinic name')).not.toBeInTheDocument()
      expect(apiMock).not.toHaveBeenCalled()
    })
  })

  it('shows neither form nor notice while the setup status is still loading', () => {
    // A promise that never settles: the request stays pending for the
    // whole test.
    setupStatusResponse = () => new Promise<Response>(() => {})
    renderRegisterClinicPage()

    expect(screen.getByRole('status')).toHaveTextContent('Loading…')
    expect(screen.queryByLabelText('Clinic name')).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Stride is already set up' })).not.toBeInTheDocument()
  })

  // If the page can't find out, it shows the form: the backend still refuses
  // a second setup (403), which the test above turns into the notice.
  it('falls back to the form when the setup status cannot be loaded', async () => {
    setupStatusResponse = () =>
      Promise.resolve(
        new Response(JSON.stringify({ statusCode: 500, message: ['Internal server error'] }), {
          status: 500,
        }),
      )
    renderRegisterClinicPage()

    expect(await screen.findByLabelText('Clinic name')).toBeInTheDocument()
  })

  // Without this, the cached `false` (it never refetches on its own) would
  // still say "not set up" to the next page that reads it.
  it('records that setup is complete once the clinic is created', async () => {
    mockSuccessResponse()

    const user = userEvent.setup()
    const { queryClient } = renderRegisterClinicPage()
    await fillValidForm(user)
    await user.click(screen.getByRole('button', { name: 'Create clinic' }))

    await waitFor(() =>
      expect(queryClient.getQueryData(setupStatusQueryKey)).toEqual({ setupComplete: true }),
    )
  })
})