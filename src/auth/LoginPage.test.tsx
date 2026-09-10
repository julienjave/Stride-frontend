import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
import { LoginPage } from './LoginPage'

const fetchMock = vi.fn<typeof fetch>()
vi.stubGlobal('fetch', fetchMock)

beforeEach(() => {
  fetchMock.mockReset()
})

function renderLoginPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  // MemoryRouter — a router that doesn't touch the real browser URL bar,
  // appropriate for tests. useNavigate() (used inside LoginPage) needs
  // SOME router context to exist above it, or it throws immediately.
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/login']}>
        <LoginPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('LoginPage', () => {
  it('logs in directly when the account has no MFA enabled', async () => {
    fetchMock.mockResolvedValue(
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
      expect(fetchMock).toHaveBeenCalledWith(
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
    fetchMock.mockResolvedValue(
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
  fetchMock.mockResolvedValueOnce(
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

  fetchMock.mockResolvedValueOnce(
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
    expect(fetchMock).toHaveBeenLastCalledWith(
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
    expect(fetchMock).not.toHaveBeenCalled()
  })
})