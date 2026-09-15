import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
import { RegisterClinicPage } from './RegisterClinicPage'

const fetchMock = vi.fn<typeof fetch>()
vi.stubGlobal('fetch', fetchMock)

beforeEach(() => {
  fetchMock.mockReset()
})

function renderRegisterClinicPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/register-clinic']}>
        <RegisterClinicPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Clinic name'), 'Acme Clinic')
  await user.type(screen.getByLabelText('Clinic email'), 'clinic@example.com')
  await user.type(screen.getByLabelText('First name'), 'Jane')
  await user.type(screen.getByLabelText('Last name'), 'Doe')
  await user.type(screen.getByLabelText('Email'), 'admin@example.com')
  await user.type(screen.getByLabelText('Password'), 'password123')
  await user.type(screen.getByLabelText('Confirm password'), 'password123')
}

function mockSuccessResponse() {
  fetchMock.mockResolvedValue(
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
      expect(fetchMock).toHaveBeenCalledWith(
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

  it('includes all four optional fields when the person fills them in', async () => {
    mockSuccessResponse()

    const user = userEvent.setup()
    renderRegisterClinicPage()
    await fillValidForm(user)
    await user.type(screen.getByLabelText('Phone (optional)'), '555-1234')
    await user.type(screen.getByLabelText('Website (optional)'), 'https://acme-clinic.example')
    await user.type(screen.getByLabelText('Address (optional)'), '1 Acme Way')
    await user.type(screen.getByLabelText('Position (optional)'), 'Practice Owner')
    await user.click(screen.getByRole('button', { name: 'Create clinic' }))

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/auth/register-clinic'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            clinicName: 'Acme Clinic',
            clinicEmail: 'clinic@example.com',
            email: 'admin@example.com',
            password: 'password123',
            firstName: 'Jane',
            lastName: 'Doe',
            clinicPhone: '555-1234',
            clinicWebsite: 'https://acme-clinic.example',
            clinicAddress: '1 Acme Way',
            position: 'Practice Owner',
          }),
        }),
      ),
    )
  })

  it('shows a validation error and never calls the API when passwords do not match', async () => {
    const user = userEvent.setup()
    renderRegisterClinicPage()
    await fillValidForm(user)
    await user.clear(screen.getByLabelText('Confirm password'))
    await user.type(screen.getByLabelText('Confirm password'), 'somethingElse')
    await user.click(screen.getByRole('button', { name: 'Create clinic' }))

    expect(await screen.findByText("Passwords don't match")).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('shows a distinct, non-error message with a login link on a 403 (setup already completed)', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          statusCode: 403,
          message: ['An administrator account already exists'],
        }),
        { status: 403 },
      ),
    )

    const user = userEvent.setup()
    renderRegisterClinicPage()
    await fillValidForm(user)
    await user.click(screen.getByRole('button', { name: 'Create clinic' }))

    const message = await screen.findByText(/this one-time setup step has already been completed/)
    expect(message).toBeInTheDocument()
    // Distinct from the generic red-banner error styling — this is the
    // whole point of special-casing 403 rather than letting it fall into
    // the generic ApiError branch below.
    expect(message).toHaveClass('text-muted-foreground')
    expect(message).not.toHaveClass('text-destructive')
    expect(screen.getByRole('link', { name: 'Log in instead' })).toHaveAttribute(
      'href',
      '/login',
    )
  })

  it('shows the generic red-banner error for any non-403 ApiError (e.g. duplicate email)', async () => {
    fetchMock.mockResolvedValue(
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
})