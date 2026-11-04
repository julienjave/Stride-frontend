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
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, useLocation, useNavigate } from 'react-router'
import { UsersListPage } from './UsersListPage'
import { expectLoadError, retryThenExpectFocusOn } from '@/common/loadFailureAssertions'
import { expectSkeleton } from '@/common/loadingAssertions'
import type { User } from './types'

const fetchMock = vi.fn<typeof fetch>()
vi.stubGlobal('fetch', fetchMock)

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

// GET /admin/users answers (Phase 6.5): one page and its description.
type ListAnswer = Response | Promise<Response>
const page = (data: Partial<User>[], meta: Partial<{ total: number; page: number; totalPages: number }> = {}) =>
  json({ data, meta: { total: data.length, page: 1, limit: 25, totalPages: 1, ...meta } })

const CLINICS = [
  { id: 1, name: 'Riverside', isActive: true },
  { id: 2, name: 'Harbour', isActive: false },
]

// The harness answers the page's three requests by address: the list (what
// the test says), the clinics (for the Clinic select) and the merges (for
// the "Merged" badge — tested on its own).
let answerList: (path: string) => ListAnswer
let merges: unknown[]
beforeEach(() => {
  fetchMock.mockReset()
  answerList = () => page([])
  merges = []
  fetchMock.mockImplementation((input) => {
    const url = new URL(input as string)
    if (url.pathname === '/clinics') return Promise.resolve(json(CLINICS))
    if (url.pathname === '/patient-merges') return Promise.resolve(json(merges))
    return Promise.resolve(answerList(`${url.pathname}${url.search}`))
  })
})

// Every request for the LIST as "path?search", in order — literal strings.
function requests() {
  return fetchMock.mock.calls
    .map(([input]) => {
      const url = new URL(input as string)
      return `${url.pathname}${url.search}`
    })
    .filter((request) => request.startsWith('/admin/users'))
}

// The address the page is at — the filters live there — and the browser's
// Back, to prove what is (and isn't) a new history entry.
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

function renderUsersListPage(entries: string[] = ['/admin/users']) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 30_000 } },
  })
  const view = render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={entries} initialIndex={entries.length - 1}>
        <UsersListPage />
        <LocationProbe />
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return { ...view, queryClient }
}

const location = () => screen.getByTestId('location').textContent
const select = (name: string) => screen.getByRole('combobox', { name })
const searchBox = () => screen.getByRole('searchbox', { name: 'Search' })
const optionsOf = (name: string) =>
  Array.from(select(name).querySelectorAll('option')).map((option) => [
    option.value,
    option.textContent,
  ])

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
    answerList = () => new Promise(() => {}) // never resolves
    renderUsersListPage()
    expectSkeleton('Loading the users…')
  })

  it('renders each user with a link to their edit view, plus roles, clinics and the count', async () => {
    answerList = () =>
      page([
        { ...dana, id: 1, firstName: 'Jamie', lastName: 'Doe', email: 'jamie@example.com', clinics: [{ id: 1, name: 'Acme Clinic' }] },
        { ...dana, id: 2, firstName: 'Sam', lastName: 'Lee', email: 'sam@example.com', isActive: false, roles: ['practitioner'], clinics: [] },
      ])
    renderUsersListPage()

    expect(await screen.findByText('Jamie Doe')).toBeInTheDocument()
    expect(screen.getByText('jamie@example.com')).toBeInTheDocument()
    expect(screen.getByText('patient · Acme Clinic')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Jamie Doe/ })).toHaveAttribute('href', '/admin/users/1')
    expect(screen.getByRole('link', { name: /Sam Lee/ })).toHaveAttribute('href', '/admin/users/2')
    // Sam is deactivated and belongs to no clinic — both visible at once.
    // (Scoped to the list: the Clinic select says "(deactivated)" too.)
    const list = screen.getByRole('list')
    expect(within(list).getByText(/\(deactivated\)/)).toBeInTheDocument()
    expect(within(list).getByText('practitioner')).toBeInTheDocument()
    // The count, in a live region: heard after each filter change.
    expect(screen.getByText('2 users', { selector: '[role="status"]' })).toBeInTheDocument()
    // The first request: no filters, page 1 — the backend's defaults.
    expect(requests()).toEqual(['/admin/users'])
  })

  it('says "1 user" for one', async () => {
    answerList = () => page([dana])
    renderUsersListPage()
    expect(await screen.findByText('1 user', { selector: '[role="status"]' })).toBeInTheDocument()
  })

  describe('empty answers', () => {
    it('says "No users yet." with no filter', async () => {
      renderUsersListPage()
      expect(await screen.findByText('No users yet.')).toBeInTheDocument()
      expect(screen.queryByText('No users match these filters.')).not.toBeInTheDocument()
      expect(screen.queryByText(/^Every /)).not.toBeInTheDocument()
    })

    it('says no user matches when a filter narrows the list', async () => {
      renderUsersListPage(['/admin/users?role=admin'])
      expect(await screen.findByText('No users match these filters.')).toBeInTheDocument()
      expect(screen.queryByText('No users yet.')).not.toBeInTheDocument()
    })

    it.each([
      ['patients-without-care-team', 'Every patient has someone on their care team.'],
      ['practitioners-without-clinic', 'Every practitioner belongs to a clinic.'],
      ['invitations-to-send-again', 'No invitation needs sending again.'],
    ])("uses the %s group's own words when it is alone", async (kind, words) => {
      renderUsersListPage([`/admin/users?attention=${kind}`])
      expect(await screen.findByText(words)).toBeInTheDocument()
      expect(screen.queryByText('No users yet.')).not.toBeInTheDocument()
      expect(screen.queryByText('No users match these filters.')).not.toBeInTheDocument()
    })

    it("says no user matches when a group is narrowed further — not the group's words", async () => {
      renderUsersListPage(['/admin/users?search=zed&attention=patients-without-care-team'])
      expect(await screen.findByText('No users match these filters.')).toBeInTheDocument()
      expect(screen.queryByText('Every patient has someone on their care team.')).not.toBeInTheDocument()
    })
  })

  it('offers "Try again" when the list fails to load, and shows it once it does', async () => {
    const user = userEvent.setup()
    answerList = () => json({ statusCode: 500, message: ['Internal server error'] }, 500)
    renderUsersListPage()
    await expectLoadError('the users')

    answerList = () => page([dana])
    await retryThenExpectFocusOn(user, { level: 1, name: 'Users' })
    expect(await screen.findByText('Dana Ortiz')).toBeInTheDocument()
  })

  it('has an "Add user" link pointing to the create route', async () => {
    renderUsersListPage()
    await screen.findByText('No users yet.')
    expect(screen.getByRole('link', { name: 'Add user' })).toHaveAttribute('href', '/admin/users/new')
  })

  it('marks an account merged into another with a "Merged" badge', async () => {
    merges = [
      {
        id: 1,
        mergedId: 44,
        survivorId: 43,
        mergedAt: '2031-06-10T12:00:00.000Z',
        mergedBy: { id: 1, firstName: 'Avery', lastName: 'Admin' },
      },
    ]
    answerList = () => page([dana, { ...dana, id: 44, email: 'dana.other@example.com', isActive: false }])
    renderUsersListPage()
    const links = await screen.findAllByRole('link', { name: /Dana Ortiz/ })
    await waitFor(() => expect(links[1]).toHaveTextContent('Merged'))
    expect(links[0]).not.toHaveTextContent('Merged')
  })

  describe('the selects', () => {
    it('offers each role, any role first', async () => {
      renderUsersListPage()
      await screen.findByText('No users yet.')
      expect(optionsOf('Role')).toEqual([
        ['', 'Any role'],
        ['admin', 'Admins'],
        ['practitioner', 'Practitioners'],
        ['patient', 'Patients'],
      ])
    })

    it('offers every clinic, a deactivated one said so, and "No clinic"', async () => {
      renderUsersListPage()
      await waitFor(() =>
        expect(optionsOf('Clinic')).toEqual([
          ['', 'Any clinic'],
          ['none', 'No clinic'],
          ['1', 'Riverside'],
          ['2', 'Harbour (deactivated)'],
        ]),
      )
    })

    it('keeps a clinic the address names but the list lacks, so the choice shown is the one in force', async () => {
      renderUsersListPage(['/admin/users?clinic=99'])
      await waitFor(() => expect(select('Clinic')).toHaveValue('99'))
      expect(optionsOf('Clinic').at(-1)).toEqual(['99', 'Clinic 99'])
    })

    it('offers the account statuses, active first and chosen', async () => {
      renderUsersListPage()
      await screen.findByText('No users yet.')
      expect(optionsOf('Status')).toEqual([
        ['active', 'Active accounts'],
        ['deactivated', 'Deactivated accounts'],
        ['all', 'All accounts'],
      ])
      expect(select('Status')).toHaveValue('active')
    })

    // Each choice: its request, the address, and back to page 1.
    it.each([
      ['Role', 'patient', '/admin/users?role=patient'],
      ['Clinic', 'none', '/admin/users?clinic=none'],
      ['Clinic', '2', '/admin/users?clinic=2'],
      ['Status', 'deactivated', '/admin/users?status=deactivated'],
      ['Status', 'all', '/admin/users?status=all'],
    ])('choosing %s = %s asks for it, starting on page 1', async (name, value, expected) => {
      const user = userEvent.setup()
      answerList = () => page([dana], { total: 60, page: 3, totalPages: 3 })
      renderUsersListPage(['/admin/users?page=3'])
      await screen.findByText('Dana Ortiz')
      await waitFor(() => expect(optionsOf('Clinic')).toHaveLength(4))

      await user.selectOptions(select(name), value)

      await waitFor(() => expect(location()).toBe(expected))
      await waitFor(() => expect(requests()).toEqual(['/admin/users?page=3', expected]))
    })

    it('reads every filter from the address and asks for exactly that', async () => {
      renderUsersListPage(['/admin/users?search=lee&role=practitioner&clinic=1&status=all&page=2'])
      await screen.findByText('No users match these filters.')
      expect(searchBox()).toHaveValue('lee')
      expect(select('Role')).toHaveValue('practitioner')
      await waitFor(() => expect(select('Clinic')).toHaveValue('1'))
      expect(select('Status')).toHaveValue('all')
      expect(requests()).toEqual(['/admin/users?search=lee&role=practitioner&clinic=1&status=all&page=2'])
    })
  })

  describe('Show — the "needs attention" groups', () => {
    it('offers every user, then each group, starting on every user', async () => {
      renderUsersListPage()
      await screen.findByText('No users yet.')
      expect(select('Show')).toHaveValue('')
      expect(optionsOf('Show')).toEqual([
        ['', 'All users'],
        ['patients-without-care-team', 'Patients without a care team'],
        ['practitioners-without-clinic', 'Practitioners without a clinic'],
        ['invitations-to-send-again', 'Invitations to send again'],
      ])
    })

    it('shows a group: its request, its rule instead of the status, the choice in the address', async () => {
      const user = userEvent.setup()
      renderUsersListPage()
      await screen.findByText('No users yet.')

      answerList = () => page([dana])
      await user.selectOptions(select('Show'), 'patients-without-care-team')

      expect(await screen.findByText('Dana Ortiz')).toBeInTheDocument()
      expect(location()).toBe('/admin/users?attention=patients-without-care-team')
      expect(requests()).toEqual(['/admin/users', '/admin/users?attention=patients-without-care-team'])
      expect(screen.getByText('No current care-team link to an active practitioner.')).toBeInTheDocument()
      // A group is about active accounts: no status choice there.
      expect(screen.queryByRole('combobox', { name: 'Status' })).not.toBeInTheDocument()
    })

    it('puts the status back to active when a group is chosen', async () => {
      const user = userEvent.setup()
      renderUsersListPage(['/admin/users?status=deactivated'])
      await screen.findByText('No users match these filters.')

      await user.selectOptions(select('Show'), 'practitioners-without-clinic')

      await waitFor(() => expect(location()).toBe('/admin/users?attention=practitioners-without-clinic'))
    })

    it('makes each choice a history entry: Back returns to the previous view', async () => {
      const user = userEvent.setup()
      renderUsersListPage()
      await screen.findByText('No users yet.')
      await user.selectOptions(select('Show'), 'practitioners-without-clinic')
      await screen.findByText('Every practitioner belongs to a clinic.')

      await user.click(screen.getByRole('button', { name: 'Test back' }))

      expect(location()).toBe('/admin/users')
      expect(await screen.findByText('No users yet.')).toBeInTheDocument()
      expect(select('Show')).toHaveValue('')
    })

    it('goes back to every user, and out of the address', async () => {
      const user = userEvent.setup()
      answerList = () => page([dana])
      renderUsersListPage(['/admin/users?attention=patients-without-care-team'])
      await screen.findByText('Dana Ortiz')

      answerList = () => page([])
      await user.selectOptions(select('Show'), '')

      expect(await screen.findByText('No users yet.')).toBeInTheDocument()
      expect(location()).toBe('/admin/users')
      expect(select('Status')).toBeInTheDocument()
    })

    it('reads an unknown value in the address as every user', async () => {
      renderUsersListPage(['/admin/users?attention=everyone'])
      await screen.findByText('No users yet.')
      expect(select('Show')).toHaveValue('')
      expect(requests()).toEqual(['/admin/users'])
    })
  })

  // The box answers every keystroke; the address and the request follow
  // once typing pauses (300 ms) — and REPLACE the history entry.
  describe('search', () => {
    it('asks once typing pauses, not for every letter', async () => {
      const user = userEvent.setup()
      renderUsersListPage()
      await screen.findByText('No users yet.')

      await user.type(searchBox(), 'lee')

      expect(searchBox()).toHaveValue('lee')
      await waitFor(() => expect(location()).toBe('/admin/users?search=lee'))
      await waitFor(() => expect(requests()).toEqual(['/admin/users', '/admin/users?search=lee']))
    })

    it('replaces the history entry: Back leaves the list, not a letter', async () => {
      const user = userEvent.setup()
      renderUsersListPage(['/somewhere-before', '/admin/users'])
      await screen.findByText('No users yet.')
      await user.type(searchBox(), 'lee')
      await waitFor(() => expect(location()).toBe('/admin/users?search=lee'))

      await user.click(screen.getByRole('button', { name: 'Test back' }))

      expect(location()).toBe('/somewhere-before')
    })

    it('starts again on page 1', async () => {
      const user = userEvent.setup()
      renderUsersListPage(['/admin/users?page=2'])
      await screen.findByText('No users yet.')
      await user.type(searchBox(), 'a')
      await waitFor(() => expect(location()).toBe('/admin/users?search=a'))
    })

    it('keeps a trailing space being typed, while asking for the trimmed text', async () => {
      const user = userEvent.setup()
      renderUsersListPage()
      await screen.findByText('No users yet.')
      await user.type(searchBox(), 'ana ')
      await waitFor(() => expect(location()).toBe('/admin/users?search=ana'))
      expect(searchBox()).toHaveValue('ana ')
    })

    it('keeps a filter chosen while the search was waiting', async () => {
      const user = userEvent.setup()
      renderUsersListPage()
      await screen.findByText('No users yet.')
      await user.type(searchBox(), 'lee')
      await user.selectOptions(select('Role'), 'patient')

      await waitFor(() => expect(location()).toBe('/admin/users?search=lee&role=patient'))
    })

    it('shows the address\'s search again after Back', async () => {
      const user = userEvent.setup()
      renderUsersListPage(['/admin/users?search=ana', '/admin/users?search=ana&role=admin'])
      await screen.findByText('No users match these filters.')
      await user.clear(searchBox())
      await user.type(searchBox(), 'bob')
      await waitFor(() => expect(location()).toBe('/admin/users?search=bob&role=admin'))

      await user.click(screen.getByRole('button', { name: 'Test back' }))

      expect(location()).toBe('/admin/users?search=ana')
      await waitFor(() => expect(searchBox()).toHaveValue('ana'))
    })
  })

  describe('pages', () => {
    it('moves between pages, said as "Page N of M", the page in the address', async () => {
      const user = userEvent.setup()
      answerList = (path) =>
        page([{ ...dana, id: path.includes('page=2') ? 2 : 1, firstName: path.includes('page=2') ? 'Two' : 'One' }], {
          total: 60,
          page: path.includes('page=2') ? 2 : 1,
          totalPages: 3,
        })
      renderUsersListPage()
      await screen.findByText('One Ortiz')
      const pages = screen.getByRole('navigation', { name: 'Pages' })
      expect(pages).toHaveTextContent('Page 1 of 3')
      expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled()

      await user.click(screen.getByRole('button', { name: 'Next' }))

      expect(await screen.findByText('Two Ortiz')).toBeInTheDocument()
      expect(location()).toBe('/admin/users?page=2')
      expect(pages).toHaveTextContent('Page 2 of 3')
      expect(requests()).toEqual(['/admin/users', '/admin/users?page=2'])

      await user.click(screen.getByRole('button', { name: 'Previous' }))
      await waitFor(() => expect(location()).toBe('/admin/users'))
    })

    it('offers no pager for a single page', async () => {
      answerList = () => page([dana])
      renderUsersListPage()
      await screen.findByText('Dana Ortiz')
      expect(screen.queryByRole('navigation', { name: 'Pages' })).not.toBeInTheDocument()
    })

    it('disables Next on the last page', async () => {
      answerList = () => page([dana], { total: 30, page: 2, totalPages: 2 })
      renderUsersListPage(['/admin/users?page=2'])
      await screen.findByText('Dana Ortiz')
      expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled()
      expect(screen.getByRole('button', { name: 'Previous' })).toBeEnabled()
    })

    it('says so on a page past the last, and offers the way back', async () => {
      const user = userEvent.setup()
      answerList = (path) =>
        path.includes('page=9') ? page([], { total: 3, page: 9, totalPages: 1 }) : page([dana])
      renderUsersListPage(['/admin/users?page=9'])

      expect(await screen.findByText('There are no users on page 9.')).toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: 'Go to page 1' }))

      expect(await screen.findByText('Dana Ortiz')).toBeInTheDocument()
      expect(location()).toBe('/admin/users')
    })

    // What a failed request shows depends on what is on screen. A refetch
    // of the SAME page that fails (a window regaining focus, say) keeps its
    // rows: nothing replaces a list that was fine a moment ago with an error.
    it('keeps the rows when a refetch of the same page fails', async () => {
      answerList = () => page([dana])
      const { queryClient } = renderUsersListPage()
      await screen.findByText('Dana Ortiz')

      answerList = () => json({ statusCode: 500, message: ['Internal server error'] }, 500)
      await queryClient.refetchQueries({ queryKey: ['users-list'] })

      await waitFor(() => expect(requests()).toEqual(['/admin/users', '/admin/users']))
      expect(screen.getByText('Dana Ortiz')).toBeInTheDocument()
      expect(screen.queryByText(/Couldn't load the users/)).not.toBeInTheDocument()
    })

    // A NEW page that fails has nothing of its own to show: TanStack Query
    // drops the previous page it was showing as a placeholder, and the
    // load error takes its place — with Try again, for that page.
    it('says a new page could not load, rather than showing the old one as if it were it', async () => {
      answerList = (path) =>
        path.includes('page=2')
          ? json({ statusCode: 500, message: ['Internal server error'] }, 500)
          : page([dana], { total: 30, totalPages: 2 })
      const user = userEvent.setup()
      renderUsersListPage()
      await screen.findByText('Dana Ortiz')

      await user.click(screen.getByRole('button', { name: 'Next' }))

      await expectLoadError('the users')
      expect(screen.queryByText('Dana Ortiz')).not.toBeInTheDocument()
    })

    // While the next page loads, the previous rows stay — dimmed and
    // marked busy — instead of vanishing into a skeleton.
    it('keeps the previous rows, marked busy, while the next page loads', async () => {
      const user = userEvent.setup()
      let release: (response: Response) => void = () => {}
      answerList = (path) =>
        path.includes('page=2')
          ? new Promise<Response>((resolve) => {
              release = resolve
            })
          : page([dana], { total: 30, totalPages: 2 })
      renderUsersListPage()
      await screen.findByText('Dana Ortiz')

      await user.click(screen.getByRole('button', { name: 'Next' }))

      await waitFor(() => expect(screen.getByRole('list')).toHaveAttribute('aria-busy', 'true'))
      expect(screen.getByText('Dana Ortiz')).toBeInTheDocument()
      expect(screen.queryByRole('status', { name: /Loading/ })).not.toBeInTheDocument()

      release(page([{ ...dana, id: 2, firstName: 'Two' }], { total: 30, page: 2, totalPages: 2 }))
      expect(await screen.findByText('Two Ortiz')).toBeInTheDocument()
      expect(screen.getByRole('list')).toHaveAttribute('aria-busy', 'false')
    })
  })
})