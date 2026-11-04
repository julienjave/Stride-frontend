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

import { render } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router'
import { vi } from 'vitest'
import { currentUserQueryKey } from '@/auth/useCurrentUser'
import { MedicalFileEntryPage } from './MedicalFileEntryPage'
import { MedicalFilePage } from './MedicalFilePage'
import { MyRecordsPage } from './MyRecordsPage'
import { TestBackButton } from './TestBackButton'
import { urlOf } from './testData'

// The medical file pages as routes.tsx mounts them, with a stub patient page
// and profile to go back to, and a fetch that answers through `answer` — the
// test's own function, given each request as { method, path, body }.

export interface SentRequest {
  method: string
  path: string
  body: string | null
}

export const fetchMock = vi.fn<typeof fetch>()
vi.stubGlobal('fetch', fetchMock)

let sent: SentRequest[] = []

export function requests(): SentRequest[] {
  return sent
}

export function renderMedicalFile(
  entries: (string | { pathname: string; search?: string; state?: unknown })[],
  answer: (request: SentRequest) => Response | Promise<Response> | undefined,
  role: 'practitioner' | 'patient' = 'practitioner',
) {
  sent = []
  fetchMock.mockReset()
  fetchMock.mockImplementation((input, init) => {
    const url = new URL(urlOf(input))
    const request: SentRequest = {
      method: init?.method ?? 'GET',
      path: url.pathname + url.search,
      body: typeof init?.body === 'string' ? init.body : null,
    }
    sent.push(request)
    const response = answer(request)
    if (response === undefined) return Promise.reject(new Error(`unexpected request: ${request.method} ${request.path}`))
    return Promise.resolve(response)
  })
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 30_000 } },
  })
  queryClient.setQueryData(currentUserQueryKey, {
    id: role === 'patient' ? 6 : 3,
    firstName: role === 'patient' ? 'Pat' : 'Alex',
    lastName: role === 'patient' ? 'Lee' : 'Chen',
    activeRole: role,
    roles: [role],
  })
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={entries} initialIndex={entries.length - 1}>
        <TestBackButton />
        <Routes>
          <Route path="/practitioner/patients/:id" element={<p>test: the patient page</p>} />
          <Route path="/practitioner/patients/:id/medical-file" element={<MedicalFilePage />} />
          <Route path="/practitioner/patients/:id/medical-file/new" element={<MedicalFileEntryPage />} />
          <Route path="/profile" element={<p>test: the profile</p>} />
          <Route path="/profile/records" element={<MyRecordsPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return { queryClient }
}

// The patient as GET /users/6 answers (the fields the pages read).
export const PAT_USER = { id: 6, firstName: 'Pat', lastName: 'Lee', email: 'pat@example.com', roles: ['patient'] }