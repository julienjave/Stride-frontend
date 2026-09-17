import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
import { DeactivateUserButton } from './DeactivateUserButton'
import { userQueryKey } from './api'
import { currentUserQueryKey } from '@/auth/useCurrentUser'

const fetchMock = vi.fn<typeof fetch>()
vi.stubGlobal('fetch', fetchMock)

beforeEach(() => {
  fetchMock.mockReset()
})

function renderButton(
  adminId: number,
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } }),
) {
  queryClient.setQueryData(currentUserQueryKey, { id: adminId })
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/admin/users/7']}>
        <DeactivateUserButton userId={7} userName="Jamie Doe" />
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

    const user = userEvent.setup()
    renderButton(1, queryClient)

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
  })
})

describe('DeactivateUserButton — a failed confirm', () => {
  it('shows the error message and keeps the dialog open', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ statusCode: 500, message: ['Internal server error'] }), {
        status: 500,
      }),
    )

    const user = userEvent.setup()
    renderButton(1)

    await user.click(screen.getByRole('button', { name: 'Deactivate user' }))
    await screen.findByText('Deactivate Jamie Doe?')
    await user.click(screen.getByRole('button', { name: 'Deactivate' }))

    expect(await screen.findByText('Internal server error')).toBeInTheDocument()
    expect(screen.getByText('Deactivate Jamie Doe?')).toBeInTheDocument()
  })
})