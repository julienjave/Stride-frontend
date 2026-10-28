import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
import { DeactivateUserButton } from './DeactivateUserButton'
import { userQueryKey } from './api'
import { currentUserQueryKey } from '@/auth/useCurrentUser'
import { adminMetricsQueryKey } from '@/app/home/admin/api'

const fetchMock = vi.fn<typeof fetch>()
vi.stubGlobal('fetch', fetchMock)

beforeEach(() => {
  fetchMock.mockReset()
})

function renderButton(
  adminId: number,
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } }),
  roles: string[] = ['patient'],
) {
  queryClient.setQueryData(currentUserQueryKey, { id: adminId })
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/admin/users/7']}>
        <DeactivateUserButton userId={7} userName="Jamie Doe" roles={roles} />
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return { ...utils, queryClient }
}

describe('DeactivateUserButton — the self-deactivation guard', () => {
  it('shows an explanatory message instead of the button when viewing your own account', () => {
    renderButton(7) // admin id matches the viewed user's id

    expect(
      screen.getByText("You can't deactivate your own account from here."),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Deactivate user' })).not.toBeInTheDocument()
  })

  it('shows the real button when viewing someone else', () => {
    renderButton(1) // a different admin id than the viewed user (7)

    expect(screen.getByRole('button', { name: 'Deactivate user' })).toBeInTheDocument()
  })
})

describe('DeactivateUserButton — opening the dialog', () => {
  it('clicking the trigger reveals confirmation copy naming the user', async () => {
    const user = userEvent.setup()
    renderButton(1)

    await user.click(screen.getByRole('button', { name: 'Deactivate user' }))

    expect(await screen.findByText('Deactivate Jamie Doe?')).toBeInTheDocument()
    expect(screen.getByText(/signs Jamie Doe out immediately/)).toBeInTheDocument()
  })
})

// What happens to care-team links, said per role (2026-10-25): the server
// ends a PRACTITIONER's links; a patient keeps their care team. Each case
// checks the other sentence is absent too.
describe('DeactivateUserButton — what happens to care-team links', () => {
  const ENDS = "Their current care-team links end too. Reactivating the account doesn't restore them."
  const KEEPS = 'Their care team keeps access to their records.'

  async function openFor(roles: string[]) {
    const user = userEvent.setup()
    renderButton(1, undefined, roles)
    await user.click(screen.getByRole('button', { name: 'Deactivate user' }))
    // Inside the modal dialog: role queries see only it.
    return screen.findByRole('dialog', { name: 'Deactivate Jamie Doe?' })
  }

  it("says a practitioner's links end, and aren't restored", async () => {
    const dialog = await openFor(['practitioner'])

    expect(within(dialog).getByText(ENDS)).toBeInTheDocument()
    expect(within(dialog).queryByText(KEEPS)).not.toBeInTheDocument()
  })

  it("says a patient's care team keeps access to their records", async () => {
    const dialog = await openFor(['patient'])

    expect(within(dialog).getByText(KEEPS)).toBeInTheDocument()
    expect(within(dialog).queryByText(ENDS)).not.toBeInTheDocument()
  })

  it('says both for an account with both roles — one sentence per side', async () => {
    const dialog = await openFor(['patient', 'practitioner'])

    expect(within(dialog).getByText(ENDS)).toBeInTheDocument()
    expect(within(dialog).getByText(KEEPS)).toBeInTheDocument()
  })

  it('says nothing about care teams for an admin-only account', async () => {
    const dialog = await openFor(['admin'])

    expect(within(dialog).queryByText(ENDS)).not.toBeInTheDocument()
    expect(within(dialog).queryByText(KEEPS)).not.toBeInTheDocument()
  })
})

describe('DeactivateUserButton — cancelling', () => {
  it('Cancel closes the dialog and never calls the API', async () => {
    const user = userEvent.setup()
    renderButton(1)
    await user.click(screen.getByRole('button', { name: 'Deactivate user' }))
    await screen.findByText('Deactivate Jamie Doe?')

    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    await waitFor(() =>
      expect(screen.queryByText('Deactivate Jamie Doe?')).not.toBeInTheDocument(),
    )
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('DeactivateUserButton — confirming successfully', () => {
  it('DELETEs the user and updates both the detail cache and the list cache', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ id: 7, firstName: 'Jamie', lastName: 'Doe', isActive: false }), {
        status: 200,
      }),
    )

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    queryClient.setQueryData(userQueryKey(7), { id: 7, isActive: true })
    queryClient.setQueryData(['users-list', false], [{ id: 7, isActive: true }])
    queryClient.setQueryData(['users-list', true], [{ id: 7, isActive: true }])
    // The admin home's numbers, and two patients' care teams the
    // practitioner may have been on (nothing says which).
    queryClient.setQueryData(adminMetricsQueryKey, {})
    queryClient.setQueryData(['care-team', 5, false], [])
    queryClient.setQueryData(['care-team', 6, true], [])

    const user = userEvent.setup()
    renderButton(1, queryClient, ['practitioner'])

    await user.click(screen.getByRole('button', { name: 'Deactivate user' }))
    await screen.findByText('Deactivate Jamie Doe?')
    await user.click(screen.getByRole('button', { name: 'Deactivate' }))

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/users/7'),
        expect.objectContaining({ method: 'DELETE' }),
      ),
    )

    expect(queryClient.getQueryData(userQueryKey(7))).toEqual({
      id: 7,
      firstName: 'Jamie',
      lastName: 'Doe',
      isActive: false,
    })
    // BOTH list variants get invalidated — this user needs to disappear
    // from the active-only view and (re)appear correctly in the
    // include-inactive one.
    expect(queryClient.getQueryState(['users-list', false])?.isInvalidated).toBe(true)
    expect(queryClient.getQueryState(['users-list', true])?.isInvalidated).toBe(true)
    // The home's counts changed, and the practitioner's links ended on the
    // server: every cached care team is stale.
    expect(queryClient.getQueryState(adminMetricsQueryKey)?.isInvalidated).toBe(true)
    expect(queryClient.getQueryState(['care-team', 5, false])?.isInvalidated).toBe(true)
    expect(queryClient.getQueryState(['care-team', 6, true])?.isInvalidated).toBe(true)
  })
})

describe('DeactivateUserButton — a failed confirm', () => {
  it('shows the error message and keeps the dialog open', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ statusCode: 400, message: ['Refused by the server'] }), {
        status: 400,
      }),
    )

    const user = userEvent.setup()
    renderButton(1)

    await user.click(screen.getByRole('button', { name: 'Deactivate user' }))
    await screen.findByText('Deactivate Jamie Doe?')
    await user.click(screen.getByRole('button', { name: 'Deactivate' }))

    expect(await screen.findByText('Refused by the server')).toBeInTheDocument()
    expect(screen.getByText('Deactivate Jamie Doe?')).toBeInTheDocument()
  })
})