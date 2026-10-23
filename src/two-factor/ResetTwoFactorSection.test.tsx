import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WRONG_PASSWORD_MESSAGE } from '@/auth/currentPassword'
import { userQueryKey } from '@/users/api'
import type { User } from '@/users/types'
import { ResetTwoFactorSection } from './ResetTwoFactorSection'

const fetchMock = vi.fn<typeof fetch>()
vi.stubGlobal('fetch', fetchMock)

const SAM = { id: 9, firstName: 'Sam', lastName: 'Ortiz', mfaEnabled: true } as User

function answer(response: () => Response) {
  fetchMock.mockReset()
  fetchMock.mockImplementation(() => Promise.resolve(response()))
}

function sentBody() {
  const [input, init] = fetchMock.mock.calls[0] ?? []
  // The page calls fetch with a string URL (api/client.ts).
  return { url: typeof input === 'string' ? input : undefined, method: init?.method, body: init?.body }
}

function renderSection({
  user = SAM,
  isSelf = false,
  adminHasMfa = false,
}: { user?: User; isSelf?: boolean; adminHasMfa?: boolean } = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  queryClient.setQueryData(userQueryKey(user.id), user)
  render(
    <QueryClientProvider client={queryClient}>
      <ResetTwoFactorSection
        user={user}
        isSelf={isSelf}
        adminEmail="admin@example.com"
        adminHasMfa={adminHasMfa}
      />
    </QueryClientProvider>,
  )
  return { queryClient }
}

// The admin's "Two-factor sign-in" section of a user's page (decisions §14).
describe('ResetTwoFactorSection', () => {
  it('Off: says so, with nothing to reset', () => {
    renderSection({ user: { ...SAM, mfaEnabled: false } })

    expect(screen.getByRole('region', { name: 'Two-factor sign-in' })).toHaveTextContent('Off')
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it("on the admin's own account: no reset, and what to do instead", () => {
    renderSection({ isSelf: true })

    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.getByText(/managed from your profile/)).toHaveTextContent(
      'Use one of your recovery codes, or ask another admin.',
    )
  })

  it('says what a reset does before anything is sent', async () => {
    renderSection()

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Reset two-factor sign-in' }))

    const dialog = screen.getByRole('dialog', { name: "Reset Sam Ortiz's two-factor sign-in?" })
    expect(dialog).toHaveAccessibleDescription(/signed out everywhere and get an email/)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("asks only the admin's password when their account has no two-factor", async () => {
    answer(() => new Response(null, { status: 204 }))
    const { queryClient } = renderSection()

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Reset two-factor sign-in' }))
    expect(screen.queryByLabelText('Two-factor code')).not.toBeInTheDocument()
    await user.type(screen.getByLabelText('Current password'), 'admin pw')
    await user.click(screen.getByRole('button', { name: 'Reset two-factor sign-in' }))

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Two-factor sign-in is reset. Sam Ortiz was signed out everywhere and told by email.',
    )
    expect(sentBody()).toEqual({
      url: expect.stringMatching(/\/users\/9\/mfa\/reset$/) as string,
      method: 'POST',
      body: '{"currentPassword":"admin pw"}',
    })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(queryClient.getQueryData<User>(userQueryKey(9))?.mfaEnabled).toBe(false)
  })

  it("asks the admin's code too when their account has two-factor on", async () => {
    answer(() => new Response(null, { status: 204 }))
    renderSection({ adminHasMfa: true })

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Reset two-factor sign-in' }))
    expect(screen.getByText('Confirm with your own password and a code from your app.'))
      .toBeInTheDocument()
    await user.type(screen.getByLabelText('Current password'), 'admin pw')
    await user.type(screen.getByLabelText('Two-factor code'), '123456')
    await user.click(screen.getByRole('button', { name: 'Reset two-factor sign-in' }))

    await screen.findByRole('status')
    expect(sentBody().body).toBe('{"currentPassword":"admin pw","mfaCode":"123456"}')
  })

  it("says a wrong password at the admin's password field, the dialog still open", async () => {
    answer(() =>
      new Response(
        JSON.stringify({ statusCode: 400, message: [WRONG_PASSWORD_MESSAGE], error: 'Error' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      ),
    )
    renderSection()

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Reset two-factor sign-in' }))
    await user.type(screen.getByLabelText('Current password'), 'wrong')
    await user.click(screen.getByRole('button', { name: 'Reset two-factor sign-in' }))

    expect(await screen.findByText(WRONG_PASSWORD_MESSAGE)).toHaveAttribute(
      'id',
      'reset-currentPassword-error',
    )
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })
})