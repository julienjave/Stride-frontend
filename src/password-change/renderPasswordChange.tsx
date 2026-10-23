import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router'
import { vi } from 'vitest'
import { currentUserQueryKey } from '@/auth/useCurrentUser'
import { Address, TestBack } from '@/auth/passwordResetTestStubs'
import { ChangePasswordPage } from './ChangePasswordPage'
import { ProfileStub } from './passwordChangeTestStubs'

// The change-of-password page as routes.tsx mounts it, beside a stub
// profile. Each request is recorded as { method, path, body } — bodies as the
// literal strings sent — and answered by the test (`answer`); a request the
// test didn't expect fails loudly.

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

// The page asks whether a change of email is waiting; every test answers it.
export const PENDING_EMAIL = {
  newEmail: 'pat.new@example.com',
  createdAt: '2031-03-13T13:30:00.000Z',
  expiresAt: '2031-03-14T13:30:00.000Z',
}
export function pendingAnswer(pending: typeof PENDING_EMAIL | null) {
  return ({ method, path }: SentRequest) =>
    method === 'GET' && path === '/auth/email-change' ? json({ pending }) : undefined
}

export function renderPasswordChange(
  entry: string | string[],
  answer: (request: SentRequest) => Response | Promise<Response> | undefined,
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
  queryClient.setQueryData(currentUserQueryKey, ME)
  const entries = Array.isArray(entry) ? entry : [entry]
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={entries} initialIndex={entries.length - 1}>
        <Routes>
          <Route path="/profile" element={<ProfileStub />} />
          <Route path="/profile/password" element={<ChangePasswordPage />} />
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