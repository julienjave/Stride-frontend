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
  address: '1 Acme Way',
  website: 'https://acme.example',
  logoPath: null,
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

describe('ClinicEditPage — rendering all five fields', () => {
  it('renders the clinic name as the heading and every field with its current value', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify(fullClinic), { status: 200 }))
    renderAt('/admin/clinics/1')

    expect(await screen.findByRole('heading', { name: 'Acme Clinic' })).toBeInTheDocument()
    expect(screen.getByText('acme@example.com')).toBeInTheDocument()
    expect(screen.getByText('555-1234')).toBeInTheDocument()
    expect(screen.getByText('1 Acme Way')).toBeInTheDocument()
    expect(screen.getByText('https://acme.example')).toBeInTheDocument()
    // Five fields means five independent Edit buttons.
    expect(screen.getAllByRole('button', { name: 'Edit' })).toHaveLength(5)
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

    // There are five "Edit" buttons (one per field) — phone is the third
    // field rendered (name, email, phone, address, website).
    const editButtons = screen.getAllByRole('button', { name: 'Edit' })
    await user.click(editButtons[2])

    const input = screen.getByDisplayValue('555-1234')
    await user.clear(input)
    await user.type(input, '999-9999')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    // This is the assertion EditableClinicField's own isolated test
    // structurally cannot make: that the number actually shown on the
    // page changes, driven by ClinicEditPage's useClinic() reactively
    // picking up the setQueryData() call EditableClinicField made into
    // the SAME cache key — real parent/child wiring through the shared
    // query cache, not asserted on in isolation.
    expect(await screen.findByText('999-9999')).toBeInTheDocument()
    expect(screen.queryByText('555-1234')).not.toBeInTheDocument()
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