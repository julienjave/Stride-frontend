import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { currentUserQueryKey } from '@/auth/useCurrentUser'
import { expectLoading } from '@/common/loadingAssertions'
import type { User } from '@/users/types'
import { MergePatientPage } from './MergePatientPage'
import { DEACTIVATED_CANNOT_STAY_MESSAGE, STAFF_CANNOT_GO_MESSAGE } from './mergeRules'

// The admin's merge page (decisions §27, pass 4), through the real page and
// a fake backend that answers by address.
const fetchMock = vi.fn<typeof fetch>()
vi.stubGlobal('fetch', fetchMock)

function person(fields: Partial<User> & { id: number }): User {
  return {
    email: `pat${fields.id}@example.com`,
    firstName: 'Pat',
    lastName: 'Lee',
    avatarUrl: null,
    phone: null,
    addressLine1: null,
    addressLine2: null,
    addressCity: null,
    addressState: null,
    addressPostalCode: null,
    addressCountry: null,
    isActive: true,
    createdAt: '2031-01-05T12:00:00.000Z',
    mfaEnabled: false,
    preferredWeightUnit: 'kg',
    messageEmailNotices: true,
    readableFont: false,
    roles: ['patient'],
    patientProfile: { dateOfBirth: '1988-04-12' },
    clinics: [{ id: 1, name: 'Riverside' }],
    ...fields,
  }
}

const pat = person({ id: 1 })
const twin = person({ id: 2, phone: '555-0101' })
const merged = person({ id: 3, isActive: false })
const alex = person({ id: 4, firstName: 'Alex', lastName: 'Chen', roles: ['practitioner'] })
const staffTwin = person({ id: 5, roles: ['patient', 'admin'] })
const sleepingTwin = person({ id: 6, isActive: false })

let users: User[]
let mergeAnswer: () => Response

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

beforeEach(() => {
  fetchMock.mockReset()
  users = [pat, twin, merged, alex, staffTwin, sleepingTwin]
  mergeAnswer = () => json({ mergeId: 9, mergedId: 2, survivorId: 1 })
  fetchMock.mockImplementation((input, init) => {
    const url = new URL(input as string)
    if (init?.method === 'POST' && url.pathname === '/users/2/merge') {
      return Promise.resolve(mergeAnswer())
    }
    const single = /^\/users\/(\d+)$/.exec(url.pathname)
    if (single) {
      const user = users.find((candidate) => candidate.id === Number(single[1]))
      return Promise.resolve(user ? json(user) : json({ message: ['User not found'] }, 404))
    }
    if (url.pathname === '/users') return Promise.resolve(json(users))
    if (url.pathname === '/patient-merges') {
      return Promise.resolve(
        json([
          {
            id: 7,
            mergedId: 3,
            survivorId: 99,
            mergedAt: '2031-06-01T12:00:00.000Z',
            mergedBy: { id: 9, firstName: 'Ada', lastName: 'Admin' },
          },
        ]),
      )
    }
    // Each account's care team and invitations: none.
    return Promise.resolve(json([]))
  })
})

function Where() {
  const location = useLocation()
  // A plain element: <output> has the implicit role "status", which the page's
  // own status would then share.
  return <p data-testid="where">{`${location.pathname}${location.search}`}</p>
}

function renderAt(path: string, me: Partial<User> = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  queryClient.setQueryData(currentUserQueryKey, {
    id: 9,
    firstName: 'Ada',
    lastName: 'Admin',
    email: 'ada@example.com',
    activeRole: 'admin',
    roles: ['admin'],
    mfaEnabled: false,
    ...me,
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/admin/users/:id/merge" element={<MergePatientPage />} />
        </Routes>
        <Where />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const picker = () => screen.getByRole('combobox', { name: 'The other account' })

function posts() {
  return fetchMock.mock.calls
    .filter(([, init]) => init?.method === 'POST')
    .map(
      ([input, init]) =>
        `${new URL(input as string).pathname} ${typeof init?.body === 'string' ? init.body : ''}`,
    )
}

describe('MergePatientPage', () => {
  it('shows a loading state first', () => {
    fetchMock.mockReturnValue(new Promise(() => {}))
    renderAt('/admin/users/1/merge')
    expectLoading('Loading the accounts…')
  })

  it('offers the other patient accounts — not itself, not staff-only, not merged away', async () => {
    renderAt('/admin/users/1/merge')
    await screen.findByRole('heading', { level: 1, name: 'Merge Pat Lee with another account' })
    expect(
      Array.from(picker().querySelectorAll('option')).map((option) => option.textContent),
    ).toStrictEqual([
      'Choose an account…',
      'Pat Lee · pat2@example.com · born 1988-04-12',
      'Pat Lee · pat5@example.com · born 1988-04-12',
      'Pat Lee · pat6@example.com · born 1988-04-12 · deactivated',
    ])
    // Nothing more until an account is chosen.
    expect(screen.queryByRole('group', { name: 'Which account do you keep?' })).toBeNull()
  })

  it('compares the two chosen accounts, saying what differs, and keeps the choice in the address', async () => {
    const user = userEvent.setup()
    renderAt('/admin/users/1/merge')
    await user.selectOptions(await screen.findByRole('combobox'), '2')
    expect(screen.getByTestId('where')).toHaveTextContent('/admin/users/1/merge?with=2')
    expect(await screen.findByText('These differ: phone.')).toBeInTheDocument()
    const second = screen.getByRole('region', { name: 'Pat Lee, pat2@example.com' })
    expect(within(second).getByText('555-0101')).toBeInTheDocument()
  })

  it("says, with Try again, when an account's care team couldn't be read — the cell shows —", async () => {
    const answer = fetchMock.getMockImplementation()!
    fetchMock.mockImplementation((input, init) => {
      if (new URL(input as string).pathname === '/users/2/care-team') {
        return Promise.resolve(json({ message: ['Internal server error'] }, 500))
      }
      return answer(input, init)
    })
    renderAt('/admin/users/1/merge?with=2')
    expect(await screen.findByText(/^Couldn't load part of these accounts\./)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
    const second = screen.getByRole('region', { name: 'Pat Lee, pat2@example.com' })
    expect(within(second).getByText('—')).toBeInTheDocument()
  })

  it('refuses, in words, to merge away a staff account or to keep a deactivated one', async () => {
    renderAt('/admin/users/1/merge?with=5')
    const keepPat = await screen.findByRole('radio', { name: 'Keep Pat Lee (pat1@example.com)' })
    expect(keepPat).toBeDisabled()
    expect(keepPat).toHaveAccessibleDescription(STAFF_CANNOT_GO_MESSAGE)
    expect(screen.getByRole('radio', { name: 'Keep Pat Lee (pat5@example.com)' })).toBeEnabled()
  })

  it('refuses to keep a deactivated account', async () => {
    renderAt('/admin/users/1/merge?with=6')
    const keepSleeping = await screen.findByRole('radio', {
      name: 'Keep Pat Lee (pat6@example.com)',
    })
    expect(keepSleeping).toBeDisabled()
    expect(keepSleeping).toHaveAccessibleDescription(DEACTIVATED_CANNOT_STAY_MESSAGE)
  })

  it('merges the other account into the one kept, after the password — and says so', async () => {
    const user = userEvent.setup()
    renderAt('/admin/users/1/merge?with=2')
    await user.click(
      await screen.findByRole('radio', { name: 'Keep Pat Lee (pat1@example.com)' }),
    )
    expect(
      screen.getByRole('heading', { level: 2, name: 'Merge into Pat Lee (pat1@example.com)' }),
    ).toBeInTheDocument()
    expect(screen.getByText(/pat2@example.com is deactivated for good/)).toBeInTheDocument()
    // No two-factor on the admin's account: the password only.
    expect(screen.queryByLabelText(/code/i)).toBeNull()
    await user.type(screen.getByLabelText('Current password'), 'password123')
    await user.click(screen.getByRole('button', { name: 'Merge the accounts' }))

    // The account in the address is the one merged AWAY: here, the OTHER one.
    expect(posts()).toStrictEqual([
      '/users/2/merge {"intoUserId":1,"currentPassword":"password123"}',
    ])
    // (The page's other statuses — a refetch's skeleton — may be on screen
    // too: the one that says what happened is the one asserted.)
    const done = await screen.findByRole('status')
    expect(done).toHaveTextContent(
      "Merged. Pat Lee (pat2@example.com) is now part of Pat Lee's account. The care team is told, and the patient gets an email at pat1@example.com.",
    )
    expect(within(done).getByRole('link', { name: 'Open Pat Lee' })).toHaveAttribute(
      'href',
      '/admin/users/1',
    )
    await waitFor(() =>
      expect(screen.getByRole('heading', { level: 1 })).toHaveFocus(),
    )
  })

  it('asks for the code too when the admin has two-factor on', async () => {
    const user = userEvent.setup()
    renderAt('/admin/users/1/merge?with=2', { mfaEnabled: true })
    await user.click(
      await screen.findByRole('radio', { name: 'Keep Pat Lee (pat2@example.com)' }),
    )
    expect(
      screen.getByText('Confirm with your own password and a code from your app.'),
    ).toBeInTheDocument()
  })

  it('forgets which account to keep when another account is chosen', async () => {
    const user = userEvent.setup()
    renderAt('/admin/users/1/merge?with=2')
    await user.click(
      await screen.findByRole('radio', { name: 'Keep Pat Lee (pat1@example.com)' }),
    )
    await user.selectOptions(picker(), '5')
    expect(
      screen.queryByRole('heading', { level: 2, name: /^Merge into/ }),
    ).not.toBeInTheDocument()
  })

  it('says an account already merged away was merged, with the way to the other one', async () => {
    renderAt('/admin/users/3/merge')
    expect(await screen.findByText(/This account was already merged into another/)).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Open the account it was merged into' }),
    ).toHaveAttribute('href', '/admin/users/99')
    expect(screen.queryByRole('combobox')).toBeNull()
  })

  it("says a non-patient account can't be merged", async () => {
    renderAt('/admin/users/4/merge')
    expect(await screen.findByText('Only patient accounts can be merged.')).toBeInTheDocument()
    expect(screen.queryByRole('combobox')).toBeNull()
  })
})