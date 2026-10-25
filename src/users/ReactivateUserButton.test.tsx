import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactivateUserButton } from './ReactivateUserButton'
import { userQueryKey } from './api'
import { adminMetricsQueryKey } from '@/app/home/admin/api'

const fetchMock = vi.fn<typeof fetch>()
vi.stubGlobal('fetch', fetchMock)

beforeEach(() => {
  fetchMock.mockReset()
})

function renderButton(
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } }),
  roles: string[] = ['patient'],
) {
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <ReactivateUserButton userId={7} userName="Jamie Doe" roles={roles} />
    </QueryClientProvider>,
  )
  return { ...utils, queryClient }
}

describe('ReactivateUserButton — opening the dialog', () => {
  it('shows a trigger button, and clicking it reveals confirmation copy naming the user', async () => {
    const user = userEvent.setup()
    renderButton()

    expect(screen.getByRole('button', { name: 'Reactivate user' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Reactivate user' }))

    expect(await screen.findByText('Reactivate Jamie Doe?')).toBeInTheDocument()
    expect(screen.getByText(/still attached to this same account/)).toBeInTheDocument()
  })
})

// A practitioner's links ended with the deactivation and don't come back —
// said to the admin, only for an account holding that role.
describe("ReactivateUserButton — a practitioner's care-team links", () => {
  const SENTENCE =
    "Their care-team links ended when the account was deactivated, and don't come back: add them to their patients' care teams again where they're needed."

  it('says the links stay ended for a practitioner', async () => {
    const user = userEvent.setup()
    renderButton(undefined, ['patient', 'practitioner'])
    await user.click(screen.getByRole('button', { name: 'Reactivate user' }))

    expect(await screen.findByText(SENTENCE)).toBeInTheDocument()
  })

  it('says nothing about links for an account without the practitioner role', async () => {
    const user = userEvent.setup()
    renderButton(undefined, ['patient'])
    await user.click(screen.getByRole('button', { name: 'Reactivate user' }))

    await screen.findByText('Reactivate Jamie Doe?')
    expect(screen.queryByText(SENTENCE)).not.toBeInTheDocument()
  })
})

describe('ReactivateUserButton — cancelling', () => {
  it('Cancel closes the dialog and never calls the API', async () => {
    const user = userEvent.setup()
    renderButton()
    await user.click(screen.getByRole('button', { name: 'Reactivate user' }))
    await screen.findByText('Reactivate Jamie Doe?')

    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    await waitFor(() =>
      expect(screen.queryByText('Reactivate Jamie Doe?')).not.toBeInTheDocument(),
    )
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('ReactivateUserButton — confirming successfully', () => {
  it('POSTs to the reactivate route and updates both the detail cache and both list variants', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({ id: 7, firstName: 'Jamie', lastName: 'Doe', isActive: true }),
        { status: 201 },
      ),
    )

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    queryClient.setQueryData(userQueryKey(7), { id: 7, isActive: false })
    queryClient.setQueryData(['users-list', false], [])
    queryClient.setQueryData(['users-list', true], [{ id: 7, isActive: false }])
    queryClient.setQueryData(adminMetricsQueryKey, {})

    const user = userEvent.setup()
    renderButton(queryClient)

    await user.click(screen.getByRole('button', { name: 'Reactivate user' }))
    await screen.findByText('Reactivate Jamie Doe?')
    await user.click(screen.getByRole('button', { name: 'Reactivate' }))

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/users/7/reactivate'),
        expect.objectContaining({ method: 'POST' }),
      ),
    )

    expect(queryClient.getQueryData(userQueryKey(7))).toEqual({
      id: 7,
      firstName: 'Jamie',
      lastName: 'Doe',
      isActive: true,
    })
    expect(queryClient.getQueryState(['users-list', false])?.isInvalidated).toBe(true)
    expect(queryClient.getQueryState(['users-list', true])?.isInvalidated).toBe(true)
    // An active account again changes the admin home's counts.
    expect(queryClient.getQueryState(adminMetricsQueryKey)?.isInvalidated).toBe(true)
  })
})

describe('ReactivateUserButton — a failed confirm', () => {
  it('shows the error message and keeps the dialog open', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ statusCode: 500, message: ['Internal server error'] }), {
        status: 500,
      }),
    )

    const user = userEvent.setup()
    renderButton()

    await user.click(screen.getByRole('button', { name: 'Reactivate user' }))
    await screen.findByText('Reactivate Jamie Doe?')
    await user.click(screen.getByRole('button', { name: 'Reactivate' }))

    expect(await screen.findByText('Internal server error')).toBeInTheDocument()
    expect(screen.getByText('Reactivate Jamie Doe?')).toBeInTheDocument()
  })
})