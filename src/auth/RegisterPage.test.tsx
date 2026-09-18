import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
import { RegisterPage } from './RegisterPage'

const fetchMock = vi.fn<typeof fetch>()
vi.stubGlobal('fetch', fetchMock)

beforeEach(() => {
  fetchMock.mockReset()
})

function renderRegisterPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/register']}>
        <RegisterPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('First name'), 'Jane')
  await user.type(screen.getByLabelText('Last name'), 'Doe')
  await user.type(screen.getByLabelText('Email'), 'jane@example.com')
  await user.type(screen.getByLabelText('Date of birth'), '1990-01-01')
  await user.type(screen.getByLabelText('Password'), 'password123')
  await user.type(screen.getByLabelText('Confirm password'), 'password123')
}

async function selectCountry(user: ReturnType<typeof userEvent.setup>, countryName: string) {
  await user.click(screen.getByRole('combobox', { name: 'Country' }))
  await user.click(await screen.findByRole('option', { name: countryName }))
}

describe('RegisterPage', () => {
  it('submits the exact backend shape, WITHOUT confirmPassword, on valid input', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 1,
          email: 'jane@example.com',
          firstName: 'Jane',
          lastName: 'Doe',
          activeRole: 'patient',
          roles: ['patient'],
        }),
        { status: 201 },
      ),
    )

    const user = userEvent.setup()
    renderRegisterPage()
    await fillValidForm(user)
    await user.click(screen.getByRole('button', { name: 'Create account' }))

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/auth/register'),
        expect.objectContaining({
          method: 'POST',
          // The real point of this assertion: confirmPassword must NOT
          // appear in the sent body, even though the user typed it —
          // register() in api.ts is responsible for stripping it.
          body: JSON.stringify({
            email: 'jane@example.com',
            password: 'password123',
            firstName: 'Jane',
            lastName: 'Doe',
            dateOfBirth: '1990-01-01',
          }),
        }),
      ),
    )
  })

  it('includes phone and address in the request when the person fills them in', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 1,
          email: 'jane@example.com',
          firstName: 'Jane',
          lastName: 'Doe',
          activeRole: 'patient',
          roles: ['patient'],
        }),
        { status: 201 },
      ),
    )

    const user = userEvent.setup()
    renderRegisterPage()
    await fillValidForm(user)
    await user.type(screen.getByLabelText('Phone (optional)'), '+1 555-0100')
    await user.type(screen.getByLabelText('Address line 1'), '123 Main St')
    await user.type(screen.getByLabelText('City'), 'Springfield')
    await user.type(screen.getByLabelText('Postal code'), '62704')
    await selectCountry(user, 'United States')
    await user.click(screen.getByRole('button', { name: 'Create account' }))

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/auth/register'),
        expect.objectContaining({ method: 'POST' }),
      ),
    )
    // Parsing and comparing with toEqual, not a raw JSON string — a
    // string comparison is sensitive to key order, which this app has
    // already hit as a false failure once (see CreateUserPage.test.tsx).
    const [, requestInit] = fetchMock.mock.calls[0]
    const body = JSON.parse(requestInit?.body as string) as Record<string, unknown>
    expect(body).toEqual({
      email: 'jane@example.com',
      password: 'password123',
      firstName: 'Jane',
      lastName: 'Doe',
      dateOfBirth: '1990-01-01',
      phone: '+1 555-0100',
      addressLine1: '123 Main St',
      addressCity: 'Springfield',
      addressPostalCode: '62704',
      addressCountry: 'US',
    })
  })

  it('shows a validation error and never calls the API when passwords do not match', async () => {
    const user = userEvent.setup()
    renderRegisterPage()
    await fillValidForm(user)
    // Overwrite just the confirm field with a mismatch
    await user.clear(screen.getByLabelText('Confirm password'))
    await user.type(screen.getByLabelText('Confirm password'), 'somethingElse')
    await user.click(screen.getByRole('button', { name: 'Create account' }))

    expect(await screen.findByText("Passwords don't match")).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })
})