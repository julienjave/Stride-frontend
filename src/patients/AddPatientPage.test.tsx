import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
import { AddPatientPage } from './AddPatientPage'
import type { DirectoryPatient } from './types'

const fetchMock = vi.fn<typeof fetch>()
vi.stubGlobal('fetch', fetchMock)

const riverside = { id: 1, name: 'Riverside Physio' }

function directoryPatient(
  id: number,
  firstName: string,
  lastName: string,
  onMyCareTeam = false,
): DirectoryPatient {
  return {
    id,
    firstName,
    lastName,
    avatarUrl: null,
    dateOfBirth: '1988-04-12',
    sharedClinics: [riverside],
    onMyCareTeam,
  }
}

// What GET /directory/patients answers. A variable, not a fixed response:
// after a join, the refetch must see the patient as `onMyCareTeam` — the
// tests change it the way the server's data would change.
let directoryRows: DirectoryPatient[] = []
// What POST /users/:id/care-team answers.
let joinResponse: { status: number; body: object } = { status: 201, body: { id: 1 } }

function urlOf(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input
  if (input instanceof URL) return input.toString()
  return input.url
}

beforeEach(() => {
  fetchMock.mockReset()
  directoryRows = []
  joinResponse = { status: 201, body: { id: 1 } }
  fetchMock.mockImplementation((input) => {
    const url = urlOf(input)
    if (url.includes('/care-team')) {
      return Promise.resolve(
        new Response(JSON.stringify(joinResponse.body), { status: joinResponse.status }),
      )
    }
    if (url.includes('/directory/patients')) {
      return Promise.resolve(new Response(JSON.stringify(directoryRows), { status: 200 }))
    }
    if (url.match(/\/users$/)) {
      return Promise.resolve(new Response('[]', { status: 200 }))
    }
    throw new Error(`Unexpected fetch to ${url}`)
  })
})

function renderAddPatientPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/practitioner/patients/add']}>
        <AddPatientPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return { queryClient }
}

// Every directory request's URL, in order (the path and query only).
function directoryRequests() {
  return fetchMock.mock.calls
    .map(([input]) => urlOf(input))
    .filter((url) => url.includes('/directory/patients'))
    .map((url) => url.slice(url.indexOf('/directory')))
}

describe('AddPatientPage — searching', () => {
  it('lists the clinic directory straight away, with no search', async () => {
    directoryRows = [directoryPatient(6, 'Pat', 'Lee')]
    renderAddPatientPage()

    expect(await screen.findByText('Pat Lee')).toBeInTheDocument()
    expect(directoryRequests()).toEqual(['/directory/patients'])
  })

  it('does not search on one letter, and says how many are needed', async () => {
    const user = userEvent.setup()
    renderAddPatientPage()
    await waitFor(() => expect(directoryRequests()).toHaveLength(1))

    await user.type(screen.getByRole('searchbox', { name: 'Search patients by name' }), 'm')

    expect(screen.getByText('Type at least 2 letters to search.')).toBeInTheDocument()
    // Longer than the debounce: had it searched, it would have by now.
    await new Promise((resolve) => setTimeout(resolve, 400))
    expect(directoryRequests()).toEqual(['/directory/patients'])
  })

  it('searches from two letters, once the typing pauses, with the term encoded', async () => {
    const user = userEvent.setup()
    renderAddPatientPage()
    await waitFor(() => expect(directoryRequests()).toHaveLength(1))

    await user.type(screen.getByRole('searchbox'), 'Marie O')

    await waitFor(() =>
      expect(directoryRequests()).toEqual([
        '/directory/patients',
        '/directory/patients?search=Marie+O',
      ]),
    )
    // Typed in one go: no request for "Ma", "Mar", … (the debounce).
    expect(screen.queryByText(/Type at least/)).not.toBeInTheDocument()
  })

  it('says when nobody matches, and offers to invite with the name filled in', async () => {
    const user = userEvent.setup()
    renderAddPatientPage()
    await user.type(screen.getByRole('searchbox'), 'Marie Martin')

    expect(
      await screen.findByText('No patient in your clinics matches "Marie Martin".'),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Invite a new patient' })).toHaveAttribute(
      'href',
      '/practitioner/patients/invite?firstName=Marie&lastName=Martin',
    )
  })

  it('offers to invite without names when nothing was searched', async () => {
    renderAddPatientPage()
    expect(await screen.findByText('Your clinics have no patients yet.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Invite a new patient' })).toHaveAttribute(
      'href',
      '/practitioner/patients/invite',
    )
  })

  it('warns that the list may be cut when it holds the backend’s 50-row maximum', async () => {
    directoryRows = Array.from({ length: 50 }, (_, i) =>
      directoryPatient(i + 1, 'Patient', `Number${i + 1}`),
    )
    renderAddPatientPage()

    expect(
      await screen.findByText(
        'Showing the first 50 patients. Type a name to narrow the list.',
      ),
    ).toBeInTheDocument()
  })

  it('does not warn below 50 rows', async () => {
    directoryRows = Array.from({ length: 49 }, (_, i) =>
      directoryPatient(i + 1, 'Patient', `Number${i + 1}`),
    )
    renderAddPatientPage()
    await screen.findByText('Patient Number49')
    expect(screen.queryByText(/Showing the first/)).not.toBeInTheDocument()
  })
})

describe('AddPatientPage — rows', () => {
  it('leads to a patient already mine instead of offering to add them', async () => {
    directoryRows = [directoryPatient(7, 'Jo', 'Novak', true), directoryPatient(6, 'Pat', 'Lee')]
    renderAddPatientPage()

    const joRow = (await screen.findByText('Jo Novak')).closest('li')!
    expect(within(joRow).getByText('In your patients')).toBeInTheDocument()
    expect(within(joRow).getByRole('link', { name: 'Open Jo Novak' })).toHaveAttribute(
      'href',
      '/practitioner/patients/7',
    )
    expect(within(joRow).queryByRole('button')).not.toBeInTheDocument()

    const patRow = screen.getByText('Pat Lee').closest('li')!
    expect(within(patRow).getByRole('button', { name: 'Add to my patients' })).toBeInTheDocument()
  })
})

describe('AddPatientPage — adding a patient', () => {
  async function openDialogForPat(user: ReturnType<typeof userEvent.setup>) {
    directoryRows = [directoryPatient(6, 'Pat', 'Lee')]
    const rendered = renderAddPatientPage()
    const patRow = (await screen.findByText('Pat Lee')).closest('li')!
    await user.click(within(patRow).getByRole('button', { name: 'Add to my patients' }))
    return { ...rendered, dialog: await screen.findByRole('dialog') }
  }

  function joinCalls() {
    return fetchMock.mock.calls.filter(([input]) => urlOf(input).includes('/care-team'))
  }

  it('says what joining means before doing it', async () => {
    const user = userEvent.setup()
    const { dialog } = await openDialogForPat(user)

    expect(
      within(dialog).getByRole('heading', { name: 'Add Pat Lee to your patients?' }),
    ).toBeInTheDocument()
    expect(
      within(dialog).getByText(
        "You'll join Pat's care team, which gives you access to their clinical record: programs, sessions, medical files and messages. This is recorded, and Pat can see who is on their care team.",
      ),
    ).toBeInTheDocument()
    expect(joinCalls()).toHaveLength(0)
  })

  it('joins with the reason given, then confirms and shows Pat as mine', async () => {
    const user = userEvent.setup()
    const { dialog, queryClient } = await openDialogForPat(user)
    // A cached "My patients" list, to check it's refreshed after the join.
    queryClient.setQueryData(['users-list', false], [])

    await user.type(within(dialog).getByLabelText('Reason (optional)'), '  First assessment ')
    // The server's data after the join: the refetch must see it.
    directoryRows = [directoryPatient(6, 'Pat', 'Lee', true)]
    await user.click(within(dialog).getByRole('button', { name: 'Add to my patients' }))

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Pat Lee is now in your patients. Go to my patients',
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByText('In your patients')).toBeInTheDocument()

    expect(joinCalls()).toHaveLength(1)
    const [url, init] = joinCalls()[0]
    expect(urlOf(url)).toMatch(/\/users\/6\/care-team$/)
    expect(init?.method).toBe('POST')
    // Trimmed; a literal string, so an undefined/dropped key can't hide.
    expect(init?.body).toBe('{"reason":"First assessment"}')
    // "My patients" is marked stale, so it's refetched when shown.
    expect(queryClient.getQueryState(['users-list', false])?.isInvalidated).toBe(true)
  })

  it('sends no reason at all when none was typed', async () => {
    const user = userEvent.setup()
    const { dialog } = await openDialogForPat(user)

    await user.type(within(dialog).getByLabelText('Reason (optional)'), '   ')
    await user.click(within(dialog).getByRole('button', { name: 'Add to my patients' }))

    await waitFor(() => expect(joinCalls()).toHaveLength(1))
    expect(joinCalls()[0][1]?.body).toBe('{}')
  })

  it('shows the backend’s refusal inside the dialog, and keeps it open', async () => {
    joinResponse = {
      status: 403,
      body: {
        statusCode: 403,
        message: ['You can only join the care team of a patient in one of your clinics'],
      },
    }
    const user = userEvent.setup()
    const { dialog } = await openDialogForPat(user)

    await user.click(within(dialog).getByRole('button', { name: 'Add to my patients' }))

    expect(
      await within(dialog).findByText(
        'You can only join the care team of a patient in one of your clinics',
      ),
    ).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('starts clean when opened again after a cancel', async () => {
    joinResponse = { status: 403, body: { statusCode: 403, message: ['Refused'] } }
    const user = userEvent.setup()
    const { dialog } = await openDialogForPat(user)
    await user.type(within(dialog).getByLabelText('Reason (optional)'), 'Covering')
    await user.click(within(dialog).getByRole('button', { name: 'Add to my patients' }))
    await within(dialog).findByText('Refused')

    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    await user.click(screen.getByRole('button', { name: 'Add to my patients' }))

    const reopened = await screen.findByRole('dialog')
    expect(within(reopened).getByLabelText('Reason (optional)')).toHaveValue('')
    expect(within(reopened).queryByText('Refused')).not.toBeInTheDocument()
  })
})