import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
import { LoginPage } from './LoginPage'
import { setupStatusQueryKey } from './useSetupStatus'

// Default: an install that's already set up, like nearly every real visit
// to the sign-in page.
const fetchMock = vi.fn<typeof fetch>()
vi.stubGlobal('fetch', fetchMock)

// The page asks GET /auth/setup-status as soon as it renders (useSetupStatus),
// on top of whatever call a test is about. Every OTHER request goes to
// apiMock, so each test sets up and asserts on just the call it's about, as
// if setup-status weren't there. One shared Response for both would break:
// a Response's body can be read only once.
const apiMock = vi.fn<typeof fetch>()
// What GET /auth/setup-status answers. Reset before each test; a test that
// needs another answer replaces it BEFORE rendering.
let setupStatusResponse: () => Promise<Response>

function setupStatusIs(setupComplete: boolean) {
  setupStatusResponse = () =>
    Promise.resolve(new Response(JSON.stringify({ setupComplete }), { status: 200 }))
}

// See CreateUserPage.test.tsx for why a Request needs .url, not toString().
function urlOf(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input
  if (input instanceof URL) return input.toString()
  return input.url
}

beforeEach(() => {
  fetchMock.mockReset()
  apiMock.mockReset()
  setupStatusIs(true)
  fetchMock.mockImplementation((input, init) =>
    urlOf(input).endsWith('/auth/setup-status') ? setupStatusResponse() : apiMock(input, init),
  )
})

// `state` = what the previous page passed with its navigate() call (the
// accept-invitation page passes the email and passwordSet).
function renderLoginPage(state?: unknown) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  // MemoryRouter — a router that doesn't touch the real browser URL bar,
  // appropriate for tests. useNavigate() (used inside LoginPage) needs
  // SOME router context to exist above it, or it throws immediately.
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[{ pathname: '/login', state }]}>
        <LoginPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return { queryClient }
}

// Resolves once the setup-status request has settled either way — so a
// test asserting that the link is ABSENT asserts it after the answer
// arrived, not before (when it would be absent no matter what).
async function setupStatusSettled(queryClient: QueryClient) {
  await waitFor(() =>
    expect(queryClient.getQueryState(setupStatusQueryKey)?.status).not.toBe('pending'),
  )
}

describe('LoginPage', () => {
  it('logs in directly when the account has no MFA enabled', async () => {
    apiMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 1,
          email: 'a@b.com',
          firstName: 'A',
          lastName: 'B',
          activeRole: 'patient',
          roles: ['patient'],
        }),
        { status: 201 },
      ),
    )

    const user = userEvent.setup()
    renderLoginPage()

    await user.type(screen.getByLabelText('Email'), 'a@b.com')
    await user.type(screen.getByLabelText('Password'), 'password123')
    await user.click(screen.getByRole('button', { name: 'Log in' }))

    // Confirms the request was actually built correctly, end to end,
    // through the real form → real schema → real API function.
    await waitFor(() =>
      expect(apiMock).toHaveBeenCalledWith(
        expect.stringContaining('/auth/login'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ email: 'a@b.com', password: 'password123' }),
        }),
      ),
    )

    // The MFA code screen should never appear on this path.
    expect(screen.queryByLabelText('Authentication code')).not.toBeInTheDocument()
  })

  it('shows the MFA step instead of completing login when mfaRequired is true', async () => {
    apiMock.mockResolvedValue(
      new Response(JSON.stringify({ mfaRequired: true }), { status: 201 }),
    )

    const user = userEvent.setup()
    renderLoginPage()

    await user.type(screen.getByLabelText('Email'), 'a@b.com')
    await user.type(screen.getByLabelText('Password'), 'password123')
    await user.click(screen.getByRole('button', { name: 'Log in' }))

    // The real assertion: the state machine actually transitioned, and
    // the credentials form is gone, replaced by the MFA step — not both
    // shown at once, not stuck on the original form.
    await waitFor(() =>
      expect(screen.getByLabelText('Authentication code')).toBeInTheDocument(),
    )
    expect(screen.queryByLabelText('Email')).not.toBeInTheDocument()
  })

  it('shows a role picker when the backend reports a multi-role account, and resubmits with the chosen role', async () => {
  apiMock.mockResolvedValueOnce(
    new Response(
      JSON.stringify({
        statusCode: 400,
        message: ['This account has multiple roles. Specify which one to log in as.'],
        error: 'BadRequestException',
        timestamp: '2026-08-05T14:22:03.101Z',
        path: '/auth/login',
        roles: ['practitioner', 'admin'],
      }),
      { status: 400 },
    ),
  )

  const user = userEvent.setup()
  renderLoginPage()

  await user.type(screen.getByLabelText('Email'), 'a@b.com')
  await user.type(screen.getByLabelText('Password'), 'password123')
  await user.click(screen.getByRole('button', { name: 'Log in' }))

  const practitionerButton = await screen.findByRole('button', {
    name: 'practitioner',
  })
  expect(screen.getByRole('button', { name: 'admin' })).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'patient' })).not.toBeInTheDocument()

  apiMock.mockResolvedValueOnce(
    new Response(
      JSON.stringify({
        id: 1,
        email: 'a@b.com',
        activeRole: 'practitioner',
        roles: ['practitioner', 'admin'],
      }),
      { status: 201 },
    ),
  )

  await user.click(practitionerButton)

  await waitFor(() =>
    expect(apiMock).toHaveBeenLastCalledWith(
      expect.stringContaining('/auth/login'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          email: 'a@b.com',
          password: 'password123',
          role: 'practitioner',
        }),
      }),
    ),
  )
})

  it('shows a client-side validation error without calling the API for an invalid email', async () => {
    const user = userEvent.setup()
    renderLoginPage()

    await user.type(screen.getByLabelText('Email'), 'not-an-email')
    await user.type(screen.getByLabelText('Password'), 'password123')
    await user.click(screen.getByRole('button', { name: 'Log in' }))

    expect(
      await screen.findByText('Enter a valid email address'),
    ).toBeInTheDocument()
    // The whole point of client-side validation: catch this BEFORE
    // spending a network round trip on something already known invalid.
    expect(apiMock).not.toHaveBeenCalled()
  })

  describe('the first-time setup link', () => {
    it('offers "Set up Stride" on an install that has not been set up yet', async () => {
      setupStatusIs(false)
      renderLoginPage()

      expect(await screen.findByRole('link', { name: 'Set up Stride' })).toHaveAttribute(
        'href',
        '/register-clinic',
      )
    })

    it('does not offer setup once Stride has been set up', async () => {
      const { queryClient } = renderLoginPage()
      await setupStatusSettled(queryClient)

      expect(screen.queryByRole('link', { name: 'Set up Stride' })).not.toBeInTheDocument()
    })

    // An unknown status shows no link: the page doesn't guess.
    it('does not offer setup when the setup status cannot be loaded', async () => {
      setupStatusResponse = () =>
        Promise.resolve(
          new Response(JSON.stringify({ statusCode: 500, message: ['Internal server error'] }), {
            status: 500,
          }),
        )
      const { queryClient } = renderLoginPage()
      await setupStatusSettled(queryClient)

      expect(queryClient.getQueryState(setupStatusQueryKey)?.status).toBe('error')
      expect(screen.queryByRole('link', { name: 'Set up Stride' })).not.toBeInTheDocument()
    })
  })

  describe('arriving from the accept-invitation page', () => {
    it('fills in the email and confirms the password was set', () => {
      renderLoginPage({ email: 'jane@example.com', passwordSet: true })

      expect(screen.getByLabelText('Email')).toHaveValue('jane@example.com')
      expect(screen.getByRole('status')).toHaveTextContent(
        'Your password is set. Log in to continue.',
      )
    })

    it('shows neither on an ordinary visit', () => {
      renderLoginPage()

      expect(screen.getByLabelText('Email')).toHaveValue('')
      expect(screen.queryByRole('status')).not.toBeInTheDocument()
    })
  })
})