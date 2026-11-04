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
import { TestBackButton } from '@/medical-files/TestBackButton'
import { json, urlOf } from '@/medical-files/testData'
import { RangeOfMotionPage } from './RangeOfMotionPage'
import { RomAssessmentPage } from './RomAssessmentPage'
import { catalogue } from './testData'

// The range-of-motion pages as routes.tsx mounts them, with stub pages to
// go back to, and a fetch that answers through `answer` — the test's own
// function, given each request as { method, path, body } (the medical file
// tests' helper, renderMedicalFile, the same way).

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

// The requests sent, as "METHOD path" lines.
export function requestLines(): string[] {
  return sent.map((request) => `${request.method} ${request.path}`)
}

export function renderRangeOfMotion(
  entries: string[],
  answer: (request: SentRequest) => Response | Promise<Response> | undefined,
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
    id: 3,
    firstName: 'Alex',
    lastName: 'Chen',
    activeRole: 'practitioner',
    roles: ['practitioner'],
  })
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={entries} initialIndex={entries.length - 1}>
        <TestBackButton />
        <Routes>
          <Route path="/practitioner/patients" element={<p>test: my patients</p>} />
          <Route path="/practitioner/patients/:id" element={<p>test: the patient page</p>} />
          <Route path="/practitioner/patients/:id/range-of-motion" element={<RangeOfMotionPage />} />
          <Route path="/practitioner/patients/:id/range-of-motion/new" element={<RomAssessmentPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return { queryClient }
}

// The answers every test needs, unless it says otherwise: the patient (GET
// /users/6), the catalogue. `more` answers first; undefined = "not mine".
export function standardAnswers(more: (request: SentRequest) => Response | undefined) {
  return (request: SentRequest) => {
    const answer = more(request)
    if (answer !== undefined) return answer
    if (request.method !== 'GET') return undefined
    if (request.path === '/users/6') return json(PAT_USER)
    if (request.path === '/range-of-motion/movements') return json(catalogue())
    return undefined
  }
}

export const PAT_USER = { id: 6, firstName: 'Pat', lastName: 'Lee', email: 'pat@example.com', roles: ['patient'] }