import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { DeactivateClinicButton } from './DeactivateClinicButton'
import { clinicQueryKey, clinicsListQueryKey } from './api'

const fetchMock = vi.fn<typeof fetch>()
vi.stubGlobal('fetch', fetchMock)

beforeEach(() => {
  fetchMock.mockReset()
})

function renderButton(
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } }),
) {
  const router = createMemoryRouter(
    [
      {
        path: '/admin/clinics/1',
        element: <DeactivateClinicButton clinicId={1} clinicName="Acme Clinic" />,
      },
      { path: '/admin/clinics', element: <div>Clinics list page</div> },
    ],
    { initialEntries: ['/admin/clinics/1'] },
  )
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return { ...utils, queryClient, router }
}

describe('DeactivateClinicButton — opening the dialog', () => {
  it('shows a trigger button, and clicking it reveals confirmation copy naming the clinic', async () => {
    const user = userEvent.setup()
    renderButton()

    expect(screen.getByRole('button', { name: 'Deactivate clinic' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Deactivate clinic' }))

    expect(await screen.findByText('Deactivate Acme Clinic?')).toBeInTheDocument()
    expect(
      screen.getByText(/until an admin reactivates it from here/),
    ).toBeInTheDocument()
  })
})

describe('DeactivateClinicButton — cancelling', () => {
  it('Cancel closes the dialog and never calls the API', async () => {
    const user = userEvent.setup()
    renderButton()
    await user.click(screen.getByRole('button', { name: 'Deactivate clinic' }))
    await screen.findByText('Deactivate Acme Clinic?')

    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    await waitFor(() =>
      expect(screen.queryByText('Deactivate Acme Clinic?')).not.toBeInTheDocument(),
    )
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('DeactivateClinicButton — confirming successfully', () => {
  it('DELETEs the clinic, updates both caches, closes the dialog, and navigates to the list', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ id: 1, name: 'Acme Clinic', isActive: false }), {
        status: 200,
      }),
    )

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    queryClient.setQueryData(clinicQueryKey(1), { id: 1, name: 'Acme Clinic', isActive: true })
    queryClient.setQueryData(clinicsListQueryKey(), [{ id: 1, name: 'Acme Clinic', isActive: true }])

    const user = userEvent.setup()
    const { router } = renderButton(queryClient)

    await user.click(screen.getByRole('button', { name: 'Deactivate clinic' }))
    await screen.findByText('Deactivate Acme Clinic?')
    // Two "Deactivate..." buttons now exist — the trigger (still in the
    // DOM behind the dialog) and the confirm button inside it — so target
    // the confirm one specifically by its exact label.
    await user.click(screen.getByRole('button', { name: 'Deactivate' }))

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/clinics/1'),
        expect.objectContaining({ method: 'DELETE' }),
      ),
    )

    expect(await screen.findByText('Clinics list page')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/admin/clinics')
    expect(queryClient.getQueryData(clinicQueryKey(1))).toEqual({
      id: 1,
      name: 'Acme Clinic',
      isActive: false,
    })
    expect(queryClient.getQueryState(clinicsListQueryKey())?.isInvalidated).toBe(true)
  })
})

describe('DeactivateClinicButton — a failed confirm', () => {
  it('shows the error message and keeps the dialog open, without navigating away', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ statusCode: 500, message: ['Internal server error'] }), {
        status: 500,
      }),
    )

    const user = userEvent.setup()
    const { router } = renderButton()

    await user.click(screen.getByRole('button', { name: 'Deactivate clinic' }))
    await screen.findByText('Deactivate Acme Clinic?')
    await user.click(screen.getByRole('button', { name: 'Deactivate' }))

    expect(await screen.findByText('Internal server error')).toBeInTheDocument()
    // Still open — the confirmation copy is still visible.
    expect(screen.getByText('Deactivate Acme Clinic?')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/admin/clinics/1')
  })
})