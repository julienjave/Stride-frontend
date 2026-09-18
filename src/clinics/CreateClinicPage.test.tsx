import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, createMemoryRouter, RouterProvider } from 'react-router'
import { CreateClinicPage } from './CreateClinicPage'

const fetchMock = vi.fn<typeof fetch>()
vi.stubGlobal('fetch', fetchMock)

beforeEach(() => {
  fetchMock.mockReset()
})

function renderCreateClinicPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/admin/clinics/new']}>
        <CreateClinicPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

async function fillRequiredFields(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Clinic name'), 'Acme Clinic')
  await user.type(screen.getByLabelText('Clinic email'), 'clinic@example.com')
}

async function selectCountry(user: ReturnType<typeof userEvent.setup>, countryName: string) {
  await user.click(screen.getByRole('combobox', { name: 'Country' }))
  await user.click(await screen.findByRole('option', { name: countryName }))
}

async function selectState(user: ReturnType<typeof userEvent.setup>, stateName: string) {
  await user.click(screen.getByRole('combobox', { name: 'State/Province (if applicable)' }))
  await user.click(await screen.findByRole('option', { name: stateName }))
}

describe('CreateClinicPage', () => {
  it('submits the minimal required-only payload when no optional fields are filled in', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ id: 501, name: 'Acme Clinic' }), { status: 201 }),
    )

    const user = userEvent.setup()
    renderCreateClinicPage()
    await fillRequiredFields(user)
    await user.click(screen.getByRole('button', { name: 'Create clinic' }))

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/clinics'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ name: 'Acme Clinic', email: 'clinic@example.com' }),
        }),
      ),
    )
  })

  it('includes optional fields when filled in', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ id: 501, name: 'Acme Clinic' }), { status: 201 }),
    )

    const user = userEvent.setup()
    renderCreateClinicPage()
    await fillRequiredFields(user)
    await user.type(screen.getByLabelText('Phone (optional)'), '555-1234')
    await user.type(screen.getByLabelText('Website (optional)'), 'https://acme.example')
    await user.type(screen.getByLabelText('Address line 1'), '1 Acme Way')
    await user.type(
      screen.getByLabelText('Apartment, suite, etc. (optional)'),
      'Suite 200',
    )
    await user.type(screen.getByLabelText('City'), 'Springfield')
    await user.type(screen.getByLabelText('Postal code'), '62704')
    await selectCountry(user, 'United States')
    await selectState(user, 'Illinois')
    await user.click(screen.getByRole('button', { name: 'Create clinic' }))

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/clinics'),
        expect.objectContaining({ method: 'POST' }),
      ),
    )
    // Parsing and comparing with toEqual, not a raw JSON string — a
    // string comparison is sensitive to key order, which has nothing to
    // do with whether the payload is actually correct (this app already
    // hit that exact false-failure once, see CreateUserPage.test.tsx).
    const [, requestInit] = fetchMock.mock.calls[0]
    const body = JSON.parse(requestInit?.body as string) as Record<string, unknown>
    expect(body).toEqual({
      name: 'Acme Clinic',
      email: 'clinic@example.com',
      phone: '555-1234',
      website: 'https://acme.example',
      addressLine1: '1 Acme Way',
      addressLine2: 'Suite 200',
      addressCity: 'Springfield',
      addressState: 'Illinois',
      addressPostalCode: '62704',
      addressCountry: 'US',
    })
  })

  it('shows the core-fields-required-together error when only city is filled in', async () => {
    const user = userEvent.setup()
    renderCreateClinicPage()
    await fillRequiredFields(user)
    await user.type(screen.getByLabelText('City'), 'Springfield')
    await user.click(screen.getByRole('button', { name: 'Create clinic' }))

    expect(await screen.findByText('Address line 1 is required')).toBeInTheDocument()
    expect(screen.getByText('Postal code is required')).toBeInTheDocument()
    expect(screen.getByText('Country is required')).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('shows a State/Province dropdown for a country with subdivisions', async () => {
    const user = userEvent.setup()
    renderCreateClinicPage()

    await selectCountry(user, 'United States')

    expect(screen.getByRole('combobox', { name: 'State/Province (if applicable)' })).toBeInTheDocument()
  })

  it('falls back to a plain text input for a country with no subdivision list', async () => {
    const user = userEvent.setup()
    renderCreateClinicPage()

    await selectCountry(user, 'Aland Islands')

    expect(
      screen.queryByRole('combobox', { name: 'State/Province (if applicable)' }),
    ).not.toBeInTheDocument()
    expect(screen.getByLabelText('State/Province (if applicable)')).toBeInTheDocument()
  })

  it('shows a validation error and never calls the API when the name is left blank', async () => {
    const user = userEvent.setup()
    renderCreateClinicPage()
    await user.type(screen.getByLabelText('Clinic email'), 'clinic@example.com')
    await user.click(screen.getByRole('button', { name: 'Create clinic' }))

    expect(await screen.findByText('Clinic name is required')).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('shows a validation error for an invalid email and never calls the API', async () => {
    const user = userEvent.setup()
    renderCreateClinicPage()
    await user.type(screen.getByLabelText('Clinic name'), 'Acme Clinic')
    await user.type(screen.getByLabelText('Clinic email'), 'not-an-email')
    await user.click(screen.getByRole('button', { name: 'Create clinic' }))

    expect(await screen.findByText('Enter a valid clinic email address')).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('shows the generic error banner on a failed request', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ statusCode: 500, message: ['Internal server error'] }), {
        status: 500,
      }),
    )

    const user = userEvent.setup()
    renderCreateClinicPage()
    await fillRequiredFields(user)
    await user.click(screen.getByRole('button', { name: 'Create clinic' }))

    expect(await screen.findByText('Internal server error')).toBeInTheDocument()
  })

  it('navigates to the NEW clinic\'s own page (not the list) on success, using the id the server returned', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ id: 777, name: 'Acme Clinic' }), { status: 201 }),
    )

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const router = createMemoryRouter(
      [
        { path: '/admin/clinics/new', element: <CreateClinicPage /> },
        { path: '/admin/clinics/:id', element: <div>Clinic detail page</div> },
      ],
      { initialEntries: ['/admin/clinics/new'] },
    )

    const user = userEvent.setup()
    render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    )

    await fillRequiredFields(user)
    await user.click(screen.getByRole('button', { name: 'Create clinic' }))

    // The real point of this test: confirm it lands on /admin/clinics/777
    // specifically (the id from the mocked response), not just "some
    // clinic page" — a hardcoded redirect target would pass a looser
    // assertion but be wrong for every clinic except one.
    expect(await screen.findByText('Clinic detail page')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/admin/clinics/777')
  })
})