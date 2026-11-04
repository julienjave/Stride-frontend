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
import { createMemoryRouter, RouterProvider, useLocation } from 'react-router'
import { currentUserQueryKey } from '@/auth/useCurrentUser'
import { AcceptInvitationPage } from './AcceptInvitationPage'

const fetchMock = vi.fn<typeof fetch>()
vi.stubGlobal('fetch', fetchMock)

// See CreateUserPage.test.tsx for why a Request needs .url, not toString().
function urlOf(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input
  if (input instanceof URL) return input.toString()
  return input.url
}

// A fresh Response per call: a Response's body can be read only once.
function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve(new Response(JSON.stringify(body), { status }))
}

const EXPIRES_AT = '2026-10-14T10:00:00.000Z'
const preview = {
  email: 'jane@example.com',
  firstName: 'Jane',
  lastName: 'Doe',
  clinicNames: ['Acme Clinic', 'Beta Physio'],
  expiresAt: EXPIRES_AT,
}

// What the two invitation endpoints answer — a test replaces either one
// BEFORE rendering. Defaults: a valid invitation that accepts (204).
let lookupResponse: () => Promise<Response>
let acceptResponse: () => Promise<Response>

beforeEach(() => {
  fetchMock.mockReset()
  lookupResponse = () => jsonResponse(preview)
  acceptResponse = () => Promise.resolve(new Response(null, { status: 204 }))
  fetchMock.mockImplementation((input) => {
    const url = urlOf(input)
    if (url.endsWith('/invitations/lookup')) return lookupResponse()
    if (url.endsWith('/invitations/accept')) return acceptResponse()
    if (url.endsWith('/auth/logout')) return Promise.resolve(new Response(null, { status: 204 }))
    throw new Error(`Unexpected fetch to ${url}`)
  })
})

// The backend's 404 / 410 bodies, as HttpExceptionFilter shapes them.
function refusal(status: 404 | 410, message: string, reason?: string) {
  return () => jsonResponse({ statusCode: status, message: [message], reason }, status)
}

// Stands in for the sign-in page: shows the state it was navigated with,
// so a test can read what the accept page handed over.
function LoginProbe() {
  const location = useLocation()
  return <pre data-testid="login-state">{JSON.stringify(location.state)}</pre>
}

// A memory router rather than MemoryRouter: the test needs the router
// object itself, to read the URL the page left behind (router.state).
function renderPage({
  url = '/accept-invitation?token=abc123',
  signedInAs = null as null | { id: number; email: string },
} = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  // The current user, as App's bootstrap would have cached it: null =
  // known to be signed out (useCurrentUser never fetches by itself here).
  queryClient.setQueryData(currentUserQueryKey, signedInAs)
  const router = createMemoryRouter(
    [
      { path: '/accept-invitation', element: <AcceptInvitationPage /> },
      { path: '/login', element: <LoginProbe /> },
    ],
    { initialEntries: [url] },
  )
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return { router }
}

// The bodies the page sent to one endpoint, parsed.
function bodiesSentTo(path: string) {
  return fetchMock.mock.calls
    .filter(([input]) => urlOf(input).endsWith(path))
    .map(([, init]) => JSON.parse(init?.body as string) as unknown)
}

async function choosePassword(
  user: ReturnType<typeof userEvent.setup>,
  password: string,
  confirmation = password,
) {
  await user.type(await screen.findByLabelText('Password'), password)
  await user.type(screen.getByLabelText('Confirm password'), confirmation)
  await user.click(screen.getByRole('button', { name: 'Set password' }))
}

describe('AcceptInvitationPage', () => {
  it('looks the invitation up and greets the person by name, with their clinics and the expiry', async () => {
    renderPage()

    expect(
      await screen.findByRole('heading', { name: 'Welcome to Stride, Jane' }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        'Your account at Acme Clinic and Beta Physio is ready. Choose a password to finish setting it up.',
      ),
    ).toBeInTheDocument()
    // Same formatting as the page, so the test holds in any locale.
    const expiry = new Intl.DateTimeFormat(undefined, { dateStyle: 'long' }).format(
      new Date(EXPIRES_AT),
    )
    expect(screen.getByText(`This invitation expires on ${expiry}.`)).toBeInTheDocument()
    // The token went in the BODY of a POST, never in a URL.
    expect(bodiesSentTo('/invitations/lookup')).toEqual([{ token: 'abc123' }])
  })

  it('shows the email read-only, marked as the username for password managers', async () => {
    renderPage()

    const email = await screen.findByLabelText('Email')
    expect(email).toHaveValue('jane@example.com')
    expect(email).toHaveAttribute('readonly')
    expect(email).toHaveAttribute('autocomplete', 'username')
  })

  it('leaves out "at …" when the account belongs to no clinic', async () => {
    lookupResponse = () => jsonResponse({ ...preview, clinicNames: [] })
    renderPage()

    expect(
      await screen.findByText(
        'Your account is ready. Choose a password to finish setting it up.',
      ),
    ).toBeInTheDocument()
  })

  it('removes the token from the address bar, replacing the history entry', async () => {
    const { router } = renderPage()

    await waitFor(() => expect(router.state.location.search).toBe(''))
    expect(router.state.historyAction).toBe('REPLACE')
    // Still usable: the page captured it before taking it out.
    expect(await screen.findByLabelText('Password')).toBeInTheDocument()
  })

  it('sets the password, then sends the person to log in with their email filled in', async () => {
    const user = userEvent.setup()
    const { router } = renderPage()

    await choosePassword(user, 'my-new-password')

    expect(await screen.findByTestId('login-state')).toHaveTextContent(
      JSON.stringify({ email: 'jane@example.com', passwordSet: true }),
    )
    // A literal string: the exact body the backend receives — the token
    // captured from the link, and the password, nothing else.
    const acceptCall = fetchMock.mock.calls.find(([input]) =>
      urlOf(input).endsWith('/invitations/accept'),
    )
    expect(acceptCall?.[1]).toEqual(
      expect.objectContaining({
        method: 'POST',
        body: '{"token":"abc123","password":"my-new-password"}',
      }),
    )
    // Back must not return to an invitation that's now used.
    expect(router.state.historyAction).toBe('REPLACE')
  })

  it("refuses passwords that don't match, without calling the API", async () => {
    const user = userEvent.setup()
    renderPage()

    await choosePassword(user, 'my-new-password', 'something-else')

    expect(await screen.findByText("Passwords don't match")).toBeInTheDocument()
    expect(bodiesSentTo('/invitations/accept')).toEqual([])
  })

  it('refuses a password shorter than 8 characters, without calling the API', async () => {
    const user = userEvent.setup()
    renderPage()

    await choosePassword(user, 'short')

    expect(
      await screen.findByText('Password must be at least 8 characters'),
    ).toBeInTheDocument()
    expect(bodiesSentTo('/invitations/accept')).toEqual([])
  })

  describe('a link that cannot be used', () => {
    it('shows the backend\'s explanation instead of the form (expired)', async () => {
      lookupResponse = refusal(
        410,
        'This invitation has expired. Ask your clinic to send you a new one.',
        'expired',
      )
      renderPage()

      expect(
        await screen.findByRole('heading', { name: "This invitation can't be used" }),
      ).toBeInTheDocument()
      expect(
        screen.getByText('This invitation has expired. Ask your clinic to send you a new one.'),
      ).toBeInTheDocument()
      expect(screen.queryByLabelText('Password')).not.toBeInTheDocument()
      expect(screen.queryByRole('link', { name: 'Go to log in' })).not.toBeInTheDocument()
    })

    it('offers to log in when the invitation was already used', async () => {
      lookupResponse = refusal(
        410,
        'This invitation has already been used. Sign in with the password you chose.',
        'accepted',
      )
      renderPage()

      expect(await screen.findByRole('link', { name: 'Go to log in' })).toHaveAttribute(
        'href',
        '/login',
      )
    })

    it('says so when the link does not exist at all (404)', async () => {
      lookupResponse = refusal(404, 'This invitation link is not valid')
      renderPage()

      expect(
        await screen.findByRole('heading', { name: "This invitation can't be used" }),
      ).toBeInTheDocument()
      expect(screen.getByText('This invitation link is not valid')).toBeInTheDocument()
    })

    // The link worked when the page opened, then stopped (replaced by a
    // newer invitation while the person was typing).
    it('switches to the same explanation when accepting is refused', async () => {
      acceptResponse = refusal(
        410,
        'This invitation was cancelled or replaced by a newer one. Use the most recent invitation email, or ask your clinic for a new one.',
        'revoked',
      )
      const user = userEvent.setup()
      renderPage()

      await choosePassword(user, 'my-new-password')

      expect(
        await screen.findByRole('heading', { name: "This invitation can't be used" }),
      ).toBeInTheDocument()
      expect(screen.queryByLabelText('Password')).not.toBeInTheDocument()
    })
  })

  it('keeps the form and shows the message for any other failure when accepting', async () => {
    acceptResponse = () =>
      jsonResponse(
        { statusCode: 429, message: ['ThrottlerException: Too Many Requests'] },
        429,
      )
    const user = userEvent.setup()
    renderPage()

    await choosePassword(user, 'my-new-password')

    const message = await screen.findByText('ThrottlerException: Too Many Requests')
    expect(message).toHaveClass('text-destructive')
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
  })

  it('offers to try again when the invitation could not be loaded, and loads it on retry', async () => {
    lookupResponse = () =>
      jsonResponse({ statusCode: 500, message: ['Internal server error'] }, 500)
    const user = userEvent.setup()
    renderPage()

    expect(
      await screen.findByRole('heading', { name: "We couldn't load your invitation" }),
    ).toBeInTheDocument()

    lookupResponse = () => jsonResponse(preview)
    await user.click(screen.getByRole('button', { name: 'Try again' }))

    expect(
      await screen.findByRole('heading', { name: 'Welcome to Stride, Jane' }),
    ).toBeInTheDocument()
  })

  it('shows a loading line while the invitation is being looked up', () => {
    lookupResponse = () => new Promise<Response>(() => {})
    renderPage()

    expect(screen.getByRole('status')).toHaveTextContent('Loading…')
    expect(screen.queryByLabelText('Password')).not.toBeInTheDocument()
  })

  it('asks for the link from the email when the address has no token', () => {
    renderPage({ url: '/accept-invitation' })

    expect(
      screen.getByRole('heading', { name: 'Open your invitation link' }),
    ).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('asks a signed-in visitor to log out first, without looking the invitation up', async () => {
    const user = userEvent.setup()
    renderPage({ signedInAs: { id: 7, email: 'someone@example.com' } })

    expect(
      screen.getByRole('heading', { name: "You're already signed in" }),
    ).toBeInTheDocument()
    expect(screen.getByText(/You're signed in as someone@example\.com\./)).toBeInTheDocument()
    expect(bodiesSentTo('/invitations/lookup')).toEqual([])

    await user.click(screen.getByRole('button', { name: 'Log out' }))

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/auth/logout'),
        expect.objectContaining({ method: 'POST' }),
      ),
    )
  })
})