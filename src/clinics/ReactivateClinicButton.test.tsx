import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactivateClinicButton } from './ReactivateClinicButton'
import { clinicQueryKey } from './api'

const fetchMock = vi.fn<typeof fetch>()
vi.stubGlobal('fetch', fetchMock)

beforeEach(() => {
  fetchMock.mockReset()
})

function renderButton(
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } }),
) {
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <ReactivateClinicButton clinicId={7} clinicName="Acme Clinic" />
    </QueryClientProvider>,
  )
  return { ...utils, queryClient }
}

describe('ReactivateClinicButton — opening the dialog', () => {
  it('shows a trigger button, and clicking it reveals confirmation copy naming the clinic', async () => {
    const user = userEvent.setup()
    renderButton()

    expect(screen.getByRole('button', { name: 'Reactivate clinic' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Reactivate clinic' }))

    expect(await screen.findByText('Reactivate Acme Clinic?')).toBeInTheDocument()
    expect(screen.getByText(/still attached to this same clinic/)).toBeInTheDocument()
  })
})

describe('ReactivateClinicButton — cancelling', () => {
  it('Cancel closes the dialog and never calls the API', async () => {
    const user = userEvent.setup()
    renderButton()
    await user.click(screen.getByRole('button', { name: 'Reactivate clinic' }))
    await screen.findByText('Reactivate Acme Clinic?')

    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    await waitFor(() =>
      expect(screen.queryByText('Reactivate Acme Clinic?')).not.toBeInTheDocument(),
    )
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('ReactivateClinicButton — confirming successfully', () => {
  it('POSTs to the reactivate route and updates both the detail cache and both list variants', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({ id: 7, name: 'Acme Clinic', isActive: true, logoUrl: null }),
        { status: 201 },
      ),
    )

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    queryClient.setQueryData(clinicQueryKey(7), { id: 7, isActive: false })
    queryClient.setQueryData(['clinics-list', false], [])
    queryClient.setQueryData(['clinics-list', true], [{ id: 7, isActive: false }])

    const user = userEvent.setup()
    renderButton(queryClient)

    await user.click(screen.getByRole('button', { name: 'Reactivate clinic' }))
    await screen.findByText('Reactivate Acme Clinic?')
    await user.click(screen.getByRole('button', { name: 'Reactivate' }))

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/clinics/7/reactivate'),
        expect.objectContaining({ method: 'POST' }),
      ),
    )

    expect(queryClient.getQueryData(clinicQueryKey(7))).toEqual({
      id: 7,
      name: 'Acme Clinic',
      isActive: true,
      logoUrl: null,
    })
    expect(queryClient.getQueryState(['clinics-list', false])?.isInvalidated).toBe(true)
    expect(queryClient.getQueryState(['clinics-list', true])?.isInvalidated).toBe(true)
  })
})

describe('ReactivateClinicButton — a failed confirm', () => {
  it('shows the error message and keeps the dialog open', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ statusCode: 500, message: ['Internal server error'] }), {
        status: 500,
      }),
    )

    const user = userEvent.setup()
    renderButton()

    await user.click(screen.getByRole('button', { name: 'Reactivate clinic' }))
    await screen.findByText('Reactivate Acme Clinic?')
    await user.click(screen.getByRole('button', { name: 'Reactivate' }))

    expect(await screen.findByText('Internal server error')).toBeInTheDocument()
    expect(screen.getByText('Reactivate Acme Clinic?')).toBeInTheDocument()
  })
})