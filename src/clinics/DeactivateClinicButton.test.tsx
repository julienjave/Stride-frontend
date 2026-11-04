/*
    Copyright 2026 Julien Javelaud

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

        http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
*/
// -----------------------------------------------------------------------------------------------------------

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { DeactivateClinicButton } from './DeactivateClinicButton'
import { clinicQueryKey, clinicsListQueryKey } from './api'
import { expectSnackbar, raisedSnackbars } from '@/snackbars/snackbarAssertions'

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
    expectSnackbar('success', "Deactivated Acme Clinic. It's no longer in the active clinics list.")
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
      new Response(JSON.stringify({ statusCode: 400, message: ['Refused by the server'] }), {
        status: 400,
      }),
    )

    const user = userEvent.setup()
    const { router } = renderButton()

    await user.click(screen.getByRole('button', { name: 'Deactivate clinic' }))
    await screen.findByText('Deactivate Acme Clinic?')
    await user.click(screen.getByRole('button', { name: 'Deactivate' }))

    expect(await screen.findByText('Refused by the server')).toBeInTheDocument()
    // Still open — the confirmation copy is still visible.
    expect(screen.getByText('Deactivate Acme Clinic?')).toBeInTheDocument()
    expect(raisedSnackbars()).toEqual([])
    expect(router.state.location.pathname).toBe('/admin/clinics/1')
  })
})