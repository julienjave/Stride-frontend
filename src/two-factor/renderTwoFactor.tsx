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

import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router'
import { vi } from 'vitest'
import { currentUserQueryKey } from '@/auth/useCurrentUser'
import { userQueryKey } from '@/users/api'
import { Address, TestBack } from '@/auth/passwordResetTestStubs'
import { TwoFactorPage } from './TwoFactorPage'
import { ProfileStub } from './twoFactorTestStubs'

// The two-factor page as routes.tsx mounts it, beside a stub profile — the
// same harness as the password change's (renderPasswordChange.tsx): each
// request recorded as { method, path, body } (bodies as the literal strings
// sent), answered by the test; an unexpected request fails loudly.

export interface SentRequest {
  method: string
  path: string
  body: string | null
}

export const fetchMock = vi.fn<typeof fetch>()
vi.stubGlobal('fetch', fetchMock)

let sent: SentRequest[] = []
export function requests() {
  return sent
}

// How many times the page re-read the signed-in account and the harness
// answered it (see renderTwoFactor below).
let reReads = 0
export function meReads() {
  return reReads
}
// The requests that change something (every test also may read the count).
export function posts() {
  return sent.filter((request) => request.method === 'POST')
}

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

export function noContent() {
  return new Response(null, { status: 204 })
}

export function apiError(status: number, message: string) {
  return json({ statusCode: status, message: [message], error: 'Error' }, status)
}

export const ME = {
  id: 6,
  email: 'pat@example.com',
  firstName: 'Pat',
  lastName: 'Lee',
  activeRole: 'patient',
  roles: ['patient'],
  mfaEnabled: false,
}

export const SETUP = {
  secret: 'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP',
  otpauthUrl: 'otpauth://totp/Stride:pat%40example.com?secret=JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP',
  qrCodeDataUrl: 'data:image/png;base64,iVBORw0KGgo=',
}

export const CODES = [
  'abcde-23456',
  'fghjk-34567',
  'mnpqr-45678',
  'stuvw-56789',
  'xyzab-67892',
  'cdefg-78923',
  'hjkmn-89234',
  'pqrst-92345',
  'uvwxy-23457',
  'zabcd-34568',
]

export function renderTwoFactor(
  entry: string | string[],
  answer: (request: SentRequest) => Response | Promise<Response> | undefined,
  { mfaEnabled = false }: { mfaEnabled?: boolean } = {},
) {
  sent = []
  reReads = 0
  const account = { ...ME, mfaEnabled }
  fetchMock.mockReset()
  fetchMock.mockImplementation((input, init) => {
    const url = new URL(
      typeof input === 'string' ? input : input instanceof URL ? input.href : input.url,
    )
    const request = {
      method: init?.method ?? 'GET',
      path: url.pathname + url.search,
      body: typeof init?.body === 'string' ? init.body : null,
    }
    const response = answer(request)
    // The page re-reading the signed-in account as it opens
    // (useRefreshedCurrentUser), when the test doesn't answer it itself:
    // answered with the account as cached, and counted apart (meReads) —
    // so the request lists stay about the page's own requests. A test that
    // answers /auth/me itself (another account state) sees it listed.
    if (!response && request.method === 'GET' && request.path === '/auth/me' && account) {
      reReads += 1
      return Promise.resolve(json(account))
    }
    sent.push(request)
    if (!response) {
      return Promise.reject(new Error(`unexpected request: ${request.method} ${request.path}`))
    }
    return Promise.resolve(response)
  })
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 30_000 }, mutations: { retry: false } },
  })
  queryClient.setQueryData(currentUserQueryKey, { ...ME, mfaEnabled })
  // The profile's own copy of the account (GET /users/:id — what the real
  // profile page shows), already loaded, as after visiting the profile.
  queryClient.setQueryData(userQueryKey(ME.id), { ...ME, mfaEnabled })
  const entries = Array.isArray(entry) ? entry : [entry]
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={entries} initialIndex={entries.length - 1}>
        <Routes>
          <Route path="/profile" element={<ProfileStub />} />
          <Route path="/profile/two-factor" element={<TwoFactorPage />} />
        </Routes>
        <Address />
        <TestBack />
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return { queryClient }
}

export function address() {
  return screen.getByTestId('address').textContent
}