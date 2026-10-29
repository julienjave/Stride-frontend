import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, useLocation, useNavigate } from 'react-router'
import { UsersListPage } from './UsersListPage'
import { expectLoadError, retryThenExpectFocusOn } from '@/common/loadFailureAssertions'
import { expectSkeleton } from '@/common/loadingAssertions'

const fetchMock = vi.fn<typeof fetch>()
vi.stubGlobal('fetch', fetchMock)

beforeEach(() => {
  fetchMock.mockReset()
})

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

// Every request for USERS as "path?search", in order — literal strings to
// compare. `input as string`: apiRequest always calls fetch with a string
// address. The merges (for the "Merged" badge, decisions §27) are asked for
// beside the list, whatever is shown — left out here, tested on their own.
function requests() {
  return fetchMock.mock.calls
    .map(([input]) => {
      const url = new URL(input as string)
      return `${url.pathname}${url.search}`
    })
    .filter((request) => request !== '/patient-merges')
}

// The address the page is at — the filter lives there — and the browser's
// Back, to prove a choice is a new history entry.
function LocationProbe() {
  const location = useLocation()
  const navigate = useNavigate()
  return (
    <>
      <output data-testid="location">{`${location.pathname}${location.search}`}</output>
      <button type="button" onClick={() => void navigate(-1)}>
        Test back
      </button>
    </>
  )
}

function renderUsersListPage(path = '/admin/users') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 30_000 } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <UsersListPage />
        <LocationProbe />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const location = () => screen.getByTestId('location').textContent
const showSelect = () => screen.getByRole('combobox', { name: 'Show' })

const dana = {
  id: 43,
  firstName: 'Dana',
  lastName: 'Ortiz',
  email: 'dana@example.com',
  isActive: true,
  roles: ['patient'],
  clinics: [{ id: 1, name: 'Riverside' }],
}

describe('UsersListPage', () => {
  it('shows a loading state before the users resolve', () => {
    fetchMock.mockReturnValue(new Promise(() => {})) // never resolves
    renderUsersListPage()
    expectSkeleton('Loading the users…')
  })

  it('renders each user with a link to their edit view, plus roles and clinics', async () => {
    fetchMock.mockResolvedValue(
      json([
        {
          id: 1,
          firstName: 'Jamie',
          lastName: 'Doe',
          email: 'jamie@example.com',
          isActive: true,
          roles: ['patient'],
          clinics: [{ id: 1, name: 'Acme Clinic' }],
        },
        {
          id: 2,
          firstName: 'Sam',
          lastName: 'Lee',
          email: 'sam@example.com',
          isActive: false,
          roles: ['practitioner'],
          clinics: [],
        },
      ]),
    )
    renderUsersListPage()

    expect(await screen.findByText('Jamie Doe')).toBeInTheDocument()
    expect(screen.getByText('jamie@example.com')).toBeInTheDocument()
    expect(screen.getByText('patient · Acme Clinic')).toBeInTheDocument()

    expect(screen.getByRole('link', { name: /Jamie Doe/ })).toHaveAttribute(
      'href',
      '/admin/users/1',
    )
    expect(screen.getByRole('link', { name: /Sam Lee/ })).toHaveAttribute(
      'href',
      '/admin/users/2',
    )
    // Sam is deactivated and belongs to no clinic — both facts should be
    // visible without needing to open their edit page to find out.
    expect(screen.getByText(/\(deactivated\)/)).toBeInTheDocument()
    expect(screen.getByText('practitioner')).toBeInTheDocument()
  })

  it('shows an empty state when there are no users', async () => {
    fetchMock.mockResolvedValue(json([]))
    renderUsersListPage()
    expect(await screen.findByText('No users yet.')).toBeInTheDocument()
  })

  it('offers "Try again" when the list fails to load, and shows it once it does', async () => {
    const user = userEvent.setup()
    fetchMock.mockResolvedValue(json({ statusCode: 500, message: ['Internal server error'] }, 500))
    renderUsersListPage()
    await expectLoadError('the users')

    fetchMock.mockResolvedValue(json([dana]))
    await retryThenExpectFocusOn(user, { level: 1, name: 'Users' })
    expect(await screen.findByText('Dana Ortiz')).toBeInTheDocument()
  })

  it('has an "Add user" link pointing to the create route', async () => {
    fetchMock.mockResolvedValue(json([]))
    renderUsersListPage()
    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    expect(screen.getByRole('link', { name: 'Add user' })).toHaveAttribute(
      'href',
      '/admin/users/new',
    )
  })

  it('marks an account merged into another with a "Merged" badge', async () => {
    fetchMock.mockImplementation((input) => {
      const url = new URL(input as string)
      if (url.pathname === '/patient-merges') {
        return Promise.resolve(
          json([
            {
              id: 1,
              mergedId: 44,
              survivorId: 43,
              mergedAt: '2031-06-10T12:00:00.000Z',
              mergedBy: { id: 1, firstName: 'Avery', lastName: 'Admin' },
            },
          ]),
        )
      }
      return Promise.resolve(
        json([dana, { ...dana, id: 44, email: 'dana.other@example.com', isActive: false }]),
      )
    })
    renderUsersListPage()
    const links = await screen.findAllByRole('link', { name: /Dana Ortiz/ })
    await waitFor(() => expect(links[1]).toHaveTextContent('Merged'))
    expect(links[0]).not.toHaveTextContent('Merged')
  })

  it('refetches with includeInactive=true when the toggle is checked', async () => {
    fetchMock.mockResolvedValue(json([]))
    const user = userEvent.setup()
    renderUsersListPage()
    // Off by default — the very first fetch should NOT already include
    // the flag, or this test couldn't tell the toggle from a no-op.
    await waitFor(() => expect(requests()).toEqual(['/users']))

    await user.click(screen.getByRole('checkbox', { name: 'Show deactivated users' }))

    await waitFor(() => expect(requests()).toEqual(['/users', '/users?includeInactive=true']))
  })

  describe('Show — the "needs attention" groups', () => {
    it('offers every user, then each group, starting on every user', async () => {
      fetchMock.mockResolvedValue(json([]))
      renderUsersListPage()
      await screen.findByText('No users yet.')

      expect(showSelect()).toHaveValue('')
      expect(
        Array.from(showSelect().querySelectorAll('option')).map((option) => [
          option.value,
          option.textContent,
        ]),
      ).toEqual([
        ['', 'All users'],
        ['patients-without-care-team', 'Patients without a care team'],
        ['practitioners-without-clinic', 'Practitioners without a clinic'],
        ['invitations-to-send-again', 'Invitations to send again'],
      ])
    })

    it('shows a group: its own request, its rule, the choice in the address', async () => {
      const user = userEvent.setup()
      fetchMock.mockResolvedValue(json([]))
      renderUsersListPage()
      await screen.findByText('No users yet.')

      fetchMock.mockResolvedValue(json([dana]))
      await user.selectOptions(showSelect(), 'patients-without-care-team')

      expect(await screen.findByText('Dana Ortiz')).toBeInTheDocument()
      expect(location()).toBe('/admin/users?attention=patients-without-care-team')
      expect(requests()).toEqual(['/users', '/users?attention=patients-without-care-team'])
      expect(
        screen.getByText('No current care-team link to an active practitioner.'),
      ).toBeInTheDocument()
      // A group is about active accounts: no "deactivated" choice there.
      expect(
        screen.queryByRole('checkbox', { name: 'Show deactivated users' }),
      ).not.toBeInTheDocument()
    })

    it('makes each choice a history entry: Back returns to the previous view', async () => {
      const user = userEvent.setup()
      // A NEW Response per request: a body can be read only once, and this
      // test makes two requests (mockResolvedValue would hand out the same
      // one, already read, the second time).
      fetchMock.mockImplementation(() => Promise.resolve(json([])))
      renderUsersListPage()
      await screen.findByText('No users yet.')
      await user.selectOptions(showSelect(), 'practitioners-without-clinic')
      await screen.findByText('Every practitioner belongs to a clinic.')

      await user.click(screen.getByRole('button', { name: 'Test back' }))

      expect(location()).toBe('/admin/users')
      expect(await screen.findByText('No users yet.')).toBeInTheDocument()
      expect(showSelect()).toHaveValue('')
    })

    it('opens on the group the address names — asking for that group only', async () => {
      fetchMock.mockResolvedValue(json([dana]))
      renderUsersListPage('/admin/users?attention=practitioners-without-clinic')

      await screen.findByText('Dana Ortiz')
      expect(showSelect()).toHaveValue('practitioners-without-clinic')
      expect(screen.getByText('Not a member of any active clinic.')).toBeInTheDocument()
      expect(requests()).toEqual(['/users?attention=practitioners-without-clinic'])
    })

    it('goes back to every user, and out of the address', async () => {
      const user = userEvent.setup()
      fetchMock.mockResolvedValue(json([dana]))
      renderUsersListPage('/admin/users?attention=patients-without-care-team')
      await screen.findByText('Dana Ortiz')

      fetchMock.mockResolvedValue(json([]))
      await user.selectOptions(showSelect(), '')

      expect(await screen.findByText('No users yet.')).toBeInTheDocument()
      expect(location()).toBe('/admin/users')
      expect(
        screen.getByRole('checkbox', { name: 'Show deactivated users' }),
      ).toBeInTheDocument()
    })

    it("says so when a group is empty — in the group's words, not the whole list's", async () => {
      fetchMock.mockResolvedValue(json([]))
      renderUsersListPage('/admin/users?attention=practitioners-without-clinic')

      expect(
        await screen.findByText('Every practitioner belongs to a clinic.'),
      ).toBeInTheDocument()
      expect(screen.queryByText('No users yet.')).not.toBeInTheDocument()
    })

    it("says the other group's empty words for that group", async () => {
      fetchMock.mockResolvedValue(json([]))
      renderUsersListPage('/admin/users?attention=patients-without-care-team')

      expect(
        await screen.findByText('Every patient has someone on their care team.'),
      ).toBeInTheDocument()
    })

    // The third group (2026-10-25): its own request, rule and empty words.
    it('shows the invitations to send again: its request, its rule, its empty words', async () => {
      fetchMock.mockResolvedValue(json([]))
      renderUsersListPage('/admin/users?attention=invitations-to-send-again')

      expect(await screen.findByText('No invitation needs sending again.')).toBeInTheDocument()
      expect(
        screen.getByText("The invitation expired, or its email couldn't be sent."),
      ).toBeInTheDocument()
      expect(showSelect()).toHaveValue('invitations-to-send-again')
      expect(requests()).toEqual(['/users?attention=invitations-to-send-again'])
    })

    it("doesn't use a group's empty words for the whole list", async () => {
      fetchMock.mockResolvedValue(json([]))
      renderUsersListPage()

      await screen.findByText('No users yet.')
      expect(screen.queryByText(/^Every /)).not.toBeInTheDocument()
      expect(screen.queryByText('No invitation needs sending again.')).not.toBeInTheDocument()
    })

    it('reads an unknown value in the address as every user', async () => {
      fetchMock.mockResolvedValue(json([]))
      renderUsersListPage('/admin/users?attention=everyone')

      await screen.findByText('No users yet.')
      expect(showSelect()).toHaveValue('')
      expect(requests()).toEqual(['/users'])
    })
  })
})