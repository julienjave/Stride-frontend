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
    sent.push(request)
    const response = answer(request)
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