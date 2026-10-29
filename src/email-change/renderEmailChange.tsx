import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router'
import { vi } from 'vitest'
import { currentUserQueryKey } from '@/auth/useCurrentUser'
import { Address, LoginStub, TestBack } from '@/auth/passwordResetTestStubs'
import { ChangeEmailPage } from './ChangeEmailPage'
import { ConfirmEmailPage } from './ConfirmEmailPage'
import { CancelEmailChangePage } from './CancelEmailChangePage'
import { ProfileStub } from './emailChangeTestStubs'

// The change-of-email screens as routes.tsx mounts them, beside a stub
// profile (just the real Email row) and a stub sign-in page that SHOWS the
// navigation state it received. Each request is recorded as { method, path,
// body } — bodies as the literal strings sent — and answered by the test.

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
// answered it (see renderEmailChange below).
let reReads = 0
export function meReads() {
  return reReads
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
}

export function renderEmailChange(
  entry: string | string[],
  answer: (request: SentRequest) => Response | Promise<Response> | undefined,
  // `mfaEnabled`: the account has two-factor sign-in on (the form asks a code).
  signedIn: { email: string; mfaEnabled?: boolean } | null = ME,
) {
  sent = []
  reReads = 0
  const account = signedIn ? { ...ME, ...signedIn } : null
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
  queryClient.setQueryData(currentUserQueryKey, signedIn ? { ...ME, ...signedIn } : null)
  const entries = Array.isArray(entry) ? entry : [entry]
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={entries} initialIndex={entries.length - 1}>
        <Routes>
          <Route path="/profile" element={<ProfileStub />} />
          <Route path="/profile/email" element={<ChangeEmailPage />} />
          <Route path="/confirm-email" element={<ConfirmEmailPage />} />
          <Route path="/cancel-email-change" element={<CancelEmailChangePage />} />
          <Route path="/login" element={<LoginStub />} />
          <Route path="/forgot-password" element={<p>forgot-password page</p>} />
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