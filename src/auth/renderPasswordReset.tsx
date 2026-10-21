import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router'
import { vi } from 'vitest'
import { currentUserQueryKey } from './useCurrentUser'
import { ForgotPasswordPage } from './ForgotPasswordPage'
import { ResetPasswordPage } from './ResetPasswordPage'
import { Address, LoginStub, TestBack } from './passwordResetTestStubs'

// The two password reset pages as routes.tsx mounts them, beside a stub
// sign-in page that SHOWS the navigation state it received (the email and
// the reset flag travel in it). Each request is recorded as { method, path,
// body } and answered by the test's `answer`.

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
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

export function apiError(status: number, message: string) {
  return json({ statusCode: status, message: [message], error: 'Error' }, status)
}

export function renderPasswordReset(
  entry: string | { pathname: string; state?: unknown } | string[],
  answer: (request: SentRequest) => Response | Promise<Response> | undefined,
  signedIn?: { email: string },
) {
  sent = []
  fetchMock.mockReset()
  fetchMock.mockImplementation((input, init) => {
    const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url)
    const request = {
      method: init?.method ?? 'GET',
      path: url.pathname + url.search,
      body: typeof init?.body === 'string' ? init.body : null,
    }
    sent.push(request)
    const response = answer(request)
    if (!response) return Promise.reject(new Error(`unexpected request: ${request.method} ${request.path}`))
    return Promise.resolve(response)
  })
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  queryClient.setQueryData(
    currentUserQueryKey,
    signedIn ? { id: 3, firstName: 'Alex', lastName: 'Chen', activeRole: 'practitioner', roles: ['practitioner'], ...signedIn } : null,
  )
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter
        initialEntries={Array.isArray(entry) ? entry : [entry]}
        initialIndex={Array.isArray(entry) ? entry.length - 1 : 0}
      >
        <Routes>
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/login" element={<LoginStub />} />
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