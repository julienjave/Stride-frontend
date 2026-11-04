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

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { DashboardRedirect } from './DashboardRedirect'
import { currentUserQueryKey } from '@/auth/useCurrentUser'

function renderAt(
  user: { activeRole: string } | null,
  destinations: Record<string, string>,
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  queryClient.setQueryData(currentUserQueryKey, user)

  const router = createMemoryRouter(
    [
      { path: '/', element: <DashboardRedirect /> },
      ...Object.entries(destinations).map(([path, label]) => ({
        path,
        element: <div>{label}</div>,
      })),
    ],
    { initialEntries: ['/'] },
  )

  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
}

// One test per role, rather than a single parameterized case, so a
// future break in one role's mapping fails with an obvious, specific
// test name instead of a generic loop failure.
describe('DashboardRedirect', () => {
  it('sends an admin to /admin', () => {
    renderAt({ activeRole: 'admin' }, { '/admin': 'Admin home' })
    expect(screen.getByText('Admin home')).toBeInTheDocument()
  })

  it('sends a practitioner to /practitioner', () => {
    renderAt(
      { activeRole: 'practitioner' },
      { '/practitioner': 'Practitioner home' },
    )
    expect(screen.getByText('Practitioner home')).toBeInTheDocument()
  })

  it('sends a patient to /patient', () => {
    renderAt({ activeRole: 'patient' }, { '/patient': 'Patient home' })
    expect(screen.getByText('Patient home')).toBeInTheDocument()
  })

  it('sends a logged-out visitor to /login rather than crashing', () => {
    renderAt(null, { '/login': 'Login page' })
    expect(screen.getByText('Login page')).toBeInTheDocument()
  })
})