import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router'
import { ClinicEditPage } from './ClinicEditPage'

const fetchMock = vi.fn<typeof fetch>()
vi.stubGlobal('fetch', fetchMock)

beforeEach(() => {
  fetchMock.mockReset()
})

function renderAt(path: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/admin/clinics/:id" element={<ClinicEditPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const fullClinic = {
  id: 1,
  name: 'Acme Clinic',
  email: 'acme@example.com',
  phone: '555-1234',
  addressLine1: '1 Acme Way',
  addressLine2: null,
  addressCity: 'Springfield',
  addressState: 'IL',
  addressPostalCode: '62704',
  addressCountry: 'US',
  website: 'https://acme.example',
  logoUrl: null,
  isActive: true,
}

describe('ClinicEditPage — invalid route param', () => {
  it('shows an error for a non-numeric id, without ever calling the API', () => {
    renderAt('/admin/clinics/not-a-number')
    expect(screen.getByText('Invalid clinic.')).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('ClinicEditPage — loading and error states', () => {
  it('shows a loading state before the clinic resolves', () => {
    fetchMock.mockReturnValue(new Promise(() => {}))
    renderAt('/admin/clinics/1')
    expect(screen.getByText('Loading clinic…')).toBeInTheDocument()
  })

  it('shows an error state when the fetch fails', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ statusCode: 404, message: ['Clinic 1 not found'] }), {
        status: 404,
      }),
    )
    renderAt('/admin/clinics/1')
    expect(await screen.findByText("Couldn't load this clinic.")).toBeInTheDocument()
  })
})

describe('ClinicEditPage — rendering all five editable fields', () => {
  it('renders the clinic name as the heading and every editable field with its current value', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify(fullClinic), { status: 200 }))
    renderAt('/admin/clinics/1')

    expect(await screen.findByRole('heading', { name: 'Acme Clinic' })).toBeInTheDocument()
    expect(screen.getByText('acme@example.com')).toBeInTheDocument()
    expect(screen.getByText('555-1234')).toBeInTheDocument()
    expect(screen.getByText('https://acme.example')).toBeInTheDocument()
    // The address, formatted (country shown by name).
    expect(screen.getByText('62704 Springfield')).toBeInTheDocument()
    // Every field has its own Edit button, named after the field — the
    // full list, in page order, so a missing or extra one fails.
    expect(
      screen
        .getAllByRole('button', { name: /^Edit / })
        .map((button) => button.getAttribute('aria-label')),
    ).toEqual([
      'Edit Clinic name',
      'Edit Clinic email',
      'Edit Phone',
      'Edit Address',
      'Edit Website',
    ])
  })

  it('shows "Not set" for a field that is genuinely null', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ ...fullClinic, website: null }), { status: 200 }),
    )
    renderAt('/admin/clinics/1')
    expect(await screen.findAllByText('Not set')).toHaveLength(1)
  })
})

describe('ClinicEditPage — real end-to-end edit flow', () => {
  it('editing and saving a field updates what is DISPLAYED on the page, not just the cache', async () => {
    // First call: the initial GET /clinics/1 the page loads with.
    // Second call: the PATCH triggered by saving the phone field.
    fetchMock
      .mockResolvedValueOnce(new Response(JSON.stringify(fullClinic), { status: 200 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ...fullClinic, phone: '999-9999' }), { status: 200 }),
      )

    const user = userEvent.setup()
    renderAt('/admin/clinics/1')

    expect(await screen.findByText('555-1234')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Edit Phone' }))

    const input = screen.getByDisplayValue('555-1234')
    await user.clear(input)
    await user.type(input, '999-9999')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    // The assertion an isolated field test structurally cannot make:
    // that the number actually shown on the PAGE changes, driven by
    // ClinicEditPage's useClinic() reactively picking up the
    // setQueryData() call useSaveClinic made into the SAME cache key —
    // real wiring through the shared query cache.
    expect(await screen.findByText('999-9999')).toBeInTheDocument()
    expect(screen.queryByText('555-1234')).not.toBeInTheDocument()
    expect(fetchMock.mock.calls[1][1]?.body).toBe('{"phone":"999-9999"}')
  })

  it('clearing a clearable field (website) sends null — not an empty string', async () => {
    fetchMock
      .mockResolvedValueOnce(new Response(JSON.stringify(fullClinic), { status: 200 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ...fullClinic, website: null }), { status: 200 }),
      )
    const user = userEvent.setup()
    renderAt('/admin/clinics/1')

    await user.click(await screen.findByRole('button', { name: 'Edit Website' }))
    await user.clear(screen.getByLabelText('Website'))
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByText('Not set')).toBeInTheDocument()
    expect(fetchMock.mock.calls[1][1]?.body).toBe('{"website":null}')
  })

  it('refuses to empty the clinic name, without calling the API', async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(fullClinic), { status: 200 }))
    const user = userEvent.setup()
    renderAt('/admin/clinics/1')

    await user.click(await screen.findByRole('button', { name: 'Edit Clinic name' }))
    await user.clear(screen.getByLabelText('Clinic name'))
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(screen.getByText('Clinic name is required')).toBeInTheDocument()
    // Only the initial GET — no PATCH.
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  // New: a clinic's address used to be settable only at creation.
  it('edits the address as one six-field PATCH, and shows the result', async () => {
    fetchMock
      .mockResolvedValueOnce(new Response(JSON.stringify(fullClinic), { status: 200 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ...fullClinic, addressLine1: '2 Acme Way' }), {
          status: 200,
        }),
      )
    const user = userEvent.setup()
    renderAt('/admin/clinics/1')

    await user.click(await screen.findByRole('button', { name: 'Edit Address' }))
    await user.clear(screen.getByLabelText('Address line 1'))
    await user.type(screen.getByLabelText('Address line 1'), '2 Acme Way')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByText('2 Acme Way')).toBeInTheDocument()
    expect(fetchMock.mock.calls[1][1]?.body).toBe(
      '{"addressLine1":"2 Acme Way","addressLine2":null,"addressCity":"Springfield",' +
        '"addressState":"IL","addressPostalCode":"62704","addressCountry":"US"}',
    )
  })
})

describe('ClinicEditPage — deactivate section', () => {
  it('shows the Deactivate button for an active clinic', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify(fullClinic), { status: 200 }))
    renderAt('/admin/clinics/1')
    expect(await screen.findByRole('button', { name: 'Deactivate clinic' })).toBeInTheDocument()
    expect(screen.queryByText('This clinic is deactivated.')).not.toBeInTheDocument()
  })

  it('shows a status note instead of the button for an already-inactive clinic', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ ...fullClinic, isActive: false }), { status: 200 }),
    )
    renderAt('/admin/clinics/1')
    expect(await screen.findByText('This clinic is deactivated.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Deactivate clinic' })).not.toBeInTheDocument()
  })
})

describe('ClinicEditPage — navigation', () => {
  it('has a "Back to clinics" link', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify(fullClinic), { status: 200 }))
    renderAt('/admin/clinics/1')
    await screen.findByRole('heading', { name: 'Acme Clinic' })
    expect(screen.getByRole('link', { name: 'Back to clinics' })).toHaveAttribute(
      'href',
      '/admin/clinics',
    )
  })
})