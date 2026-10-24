import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { UserClinicMemberships } from './UserClinicMemberships'
import { userQueryKey } from './api'

const fetchMock = vi.fn<typeof fetch>()
vi.stubGlobal('fetch', fetchMock)

const allClinics = [
  { id: 1, name: 'Acme Clinic', logoUrl: null },
  { id: 2, name: 'Second Clinic', logoUrl: null },
  { id: 3, name: 'Third Clinic', logoUrl: null },
]

beforeEach(() => {
  fetchMock.mockReset()
})

// typeof fetch's first parameter can be a string, Request, or URL —
// .toString() on a Request gives the useless "[object Request]", not its
// URL. Every call site in this app always passes a plain string, but
// narrowing properly keeps this helper correct regardless.
function urlOf(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input
  if (input instanceof URL) return input.toString()
  return input.url
}

function mockClinicsAnd(membershipResponse: unknown, membershipStatus = 201) {
  fetchMock.mockImplementation((input) => {
    const url = urlOf(input)
    if (url.includes('/clinics') && !url.includes('/members')) {
      return Promise.resolve(new Response(JSON.stringify(allClinics), { status: 200 }))
    }
    if (url.includes('/members')) {
      return Promise.resolve(
        new Response(
          membershipResponse === undefined ? '' : JSON.stringify(membershipResponse),
          { status: membershipStatus },
        ),
      )
    }
    throw new Error(`Unexpected fetch to ${url}`)
  })
}

function renderMemberships(
  currentClinics: { id: number; name: string }[],
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } }),
) {
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <UserClinicMemberships userId={7} currentClinics={currentClinics} />
    </QueryClientProvider>,
  )
  return { ...utils, queryClient }
}

describe('UserClinicMemberships — displaying current memberships', () => {
  it('shows a message when the user belongs to no clinic yet', () => {
    mockClinicsAnd({})
    renderMemberships([])

    expect(screen.getByText('Not a member of any clinic yet.')).toBeInTheDocument()
  })

  it('lists each current clinic with a Remove button', () => {
    mockClinicsAnd({})
    renderMemberships([{ id: 1, name: 'Acme Clinic' }])

    expect(screen.getByText('Acme Clinic')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Remove' })).toBeInTheDocument()
  })
})

describe('UserClinicMemberships — the add dropdown', () => {
  it('excludes clinics the user already belongs to', async () => {
    mockClinicsAnd({})
    const user = userEvent.setup()
    renderMemberships([{ id: 1, name: 'Acme Clinic' }])

    await user.click(screen.getByRole('combobox'))

    expect(screen.queryByRole('option', { name: 'Acme Clinic' })).not.toBeInTheDocument()
    expect(await screen.findByRole('option', { name: 'Second Clinic' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Third Clinic' })).toBeInTheDocument()
  })

  it('disables the Add button until a clinic is selected', async () => {
    mockClinicsAnd({})
    const user = userEvent.setup()
    renderMemberships([])

    expect(screen.getByRole('button', { name: 'Add' })).toBeDisabled()

    await user.click(screen.getByRole('combobox'))
    await user.click(await screen.findByRole('option', { name: 'Acme Clinic' }))

    expect(screen.getByRole('button', { name: 'Add' })).toBeEnabled()
  })
})

describe('UserClinicMemberships — adding a clinic', () => {
  it("POSTs to the right clinic and invalidates this user's cache", async () => {
    mockClinicsAnd({ id: 99, clinicId: 2, userId: 7 })
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
    const user = userEvent.setup()
    renderMemberships([], queryClient)

    await user.click(screen.getByRole('combobox'))
    await user.click(await screen.findByRole('option', { name: 'Second Clinic' }))
    await user.click(screen.getByRole('button', { name: 'Add' }))

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/clinics/2/members'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ userId: 7 }),
        }),
      ),
    )
    await waitFor(() =>
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: userQueryKey(7),
        exact: true,
      }),
    )
    // Care teams too: a membership change can add candidates, or (when
    // removed) end links — for this user's team, or their patients'.
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['care-team'] })
    // And the admin home's "needs attention" (decisions §17): its numbers
    // and every users list, filtered or not.
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['admin-metrics'] })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['users-list'] })
  })

  it('shows an error and does not clear the selection on failure', async () => {
    mockClinicsAnd(
      { statusCode: 409, message: ['This user is already a member of this clinic'] },
      409,
    )
    const user = userEvent.setup()
    renderMemberships([])

    await user.click(screen.getByRole('combobox'))
    await user.click(await screen.findByRole('option', { name: 'Acme Clinic' }))
    await user.click(screen.getByRole('button', { name: 'Add' }))

    expect(
      await screen.findByText('This user is already a member of this clinic'),
    ).toBeInTheDocument()
  })
})

describe('UserClinicMemberships — removing a clinic', () => {
  it("DELETEs the right membership and invalidates this user's cache", async () => {
    mockClinicsAnd(undefined, 200)
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
    const user = userEvent.setup()
    renderMemberships(
      [
        { id: 1, name: 'Acme Clinic' },
        { id: 2, name: 'Second Clinic' },
      ],
      queryClient,
    )

    // Two "Remove" buttons exist (one per clinic) — click the one next to
    // Second Clinic specifically, to confirm the RIGHT clinicId is sent,
    // not just that removal happens at all.
    const secondClinicRow = screen.getByText('Second Clinic').closest('li')!
    await user.click(within(secondClinicRow).getByRole('button', { name: 'Remove' }))

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/clinics/2/members/7'),
        expect.objectContaining({ method: 'DELETE' }),
      ),
    )
    await waitFor(() =>
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: userQueryKey(7),
        exact: true,
      }),
    )
    // Care teams too: a membership change can add candidates, or (when
    // removed) end links — for this user's team, or their patients'.
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['care-team'] })
    // And the admin home's "needs attention" (decisions §17): its numbers
    // and every users list, filtered or not.
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['admin-metrics'] })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['users-list'] })
  })
})