import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Link, MemoryRouter, Route, Routes, useNavigate } from 'react-router'
import { currentUserQueryKey } from '@/auth/useCurrentUser'
import { formatCalendarDate } from '@/common/formatCalendarDate'
import { formatMomentDate } from '@/common/formatMomentDate'
import { PatientPage } from './PatientPage'
import { PatientsListPage } from './PatientsListPage'
import type { CareTeamEntry } from './types'

const fetchMock = vi.fn<typeof fetch>()
vi.stubGlobal('fetch', fetchMock)

// A fetch call's URL as a string — see CreateUserPage.test.tsx on why
// String(input) would be wrong for a Request object.
function urlOf(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input
  if (input instanceof URL) return input.toString()
  return input.url
}

const ME = { id: 2, firstName: 'Alex', lastName: 'Moreau' }
const SAM = { id: 3, firstName: 'Sam', lastName: 'Okafor' }
const BLAKE = { id: 4, firstName: 'Blake', lastName: 'Martin' }

const pat = {
  id: 6,
  firstName: 'Pat',
  lastName: 'Lee',
  email: 'pat@example.com',
  avatarUrl: null,
  phone: null,
  isActive: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  mfaEnabled: false,
  preferredWeightUnit: 'kg',
  roles: ['patient'],
  patientProfile: { dateOfBirth: '1988-04-12' },
  clinics: [
    { id: 1, name: 'Riverside Physio' },
    { id: 2, name: 'Harbour Sports Clinic' },
  ],
  addressLine1: null,
  addressLine2: null,
  addressCity: null,
  addressState: null,
  addressPostalCode: null,
  addressCountry: null,
}

function program(id: number, title: string, assignedBy: typeof ME, extra: object = {}) {
  return {
    id,
    patientId: 6,
    assignedBy: assignedBy.id,
    assigner: assignedBy,
    basedOnTemplateId: null,
    title,
    startDate: '2026-09-01',
    endDate: null,
    status: 'active',
    isArchived: false,
    ...extra,
  }
}

function link(
  practitioner: typeof ME,
  extra: Partial<CareTeamEntry> = {},
): CareTeamEntry {
  return {
    id: practitioner.id * 100,
    patientId: 6,
    practitioner: { ...practitioner, avatarUrl: null, specialties: [], bio: null },
    sharedClinics: [],
    startedAt: '2026-09-01T10:00:00.000Z',
    endsAt: null,
    isActive: true,
    reason: null,
    createdBy: null,
    endedBy: null,
    ...extra,
  }
}

// What each endpoint answers; tests change them before rendering.
let patientResponse: { status: number; body: object }
let programs: object[]
let josPrograms: object[]
let currentTeam: CareTeamEntry[]
let fullTeam: CareTeamEntry[]
let endResponse: { status: number; body: object }

function json(status: number, body: unknown) {
  return Promise.resolve(new Response(JSON.stringify(body), { status }))
}

beforeEach(() => {
  fetchMock.mockReset()
  patientResponse = { status: 200, body: pat }
  programs = []
  josPrograms = []
  currentTeam = [link(ME)]
  fullTeam = currentTeam
  endResponse = { status: 201, body: link(ME, { isActive: false }) }
  fetchMock.mockImplementation((input, init) => {
    const url = urlOf(input)
    if (url.includes('/care-team/') && url.endsWith('/end') && init?.method === 'POST') {
      return json(endResponse.status, endResponse.body)
    }
    if (url.includes('/care-team?includeEnded=true')) return json(200, fullTeam)
    if (url.includes('/care-team')) return json(200, currentTeam)
    if (url.includes('/invitations')) return json(200, [])
    if (url.includes('/assigned-programs?patientId=6')) return json(200, programs)
    if (url.match(/\/users\/6$/)) return json(patientResponse.status, patientResponse.body)
    if (url.match(/\/users\/7$/)) return json(200, { ...pat, id: 7, firstName: 'Jo', lastName: 'Novak' })
    if (url.includes('/assigned-programs?patientId=7')) return json(200, josPrograms)
    if (url.match(/\/users$/)) return json(200, [])
    throw new Error(`Unexpected fetch to ${url}`)
  })
})

// Test-only controls outside the routes: "go back" in the history, and a
// link to another patient's page (same route, new :id).
function TestControls() {
  const navigate = useNavigate()
  return (
    <>
      <button type="button" onClick={() => void navigate(-1)}>
        test: back
      </button>
      <Link to="/practitioner/patients/7">test: patient 7</Link>
    </>
  )
}

function renderPatientPage(path = '/practitioner/patients/6') {
  // staleTime as in the app (queryClient.ts): with the default 0, every
  // list would refetch on mount anyway, and a missing invalidation could
  // never show.
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 30_000 } },
  })
  queryClient.setQueryData(currentUserQueryKey, {
    ...ME,
    activeRole: 'practitioner',
    roles: ['practitioner'],
    clinics: [{ id: 1, name: 'Riverside Physio' }],
  })
  render(
    <QueryClientProvider client={queryClient}>
      {/* The roster first, so "back" has somewhere to go. */}
      <MemoryRouter initialEntries={['/practitioner/patients', path]} initialIndex={1}>
        <TestControls />
        <Routes>
          <Route path="/practitioner/patients" element={<PatientsListPage />} />
          <Route path="/practitioner/patients/:id" element={<PatientPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return { queryClient }
}

function section(name: string) {
  return screen.getByRole('region', { name })
}

function calls(match: (url: string) => boolean) {
  return fetchMock.mock.calls.filter(([input]) => match(urlOf(input)))
}

describe('PatientPage — the patient', () => {
  it('shows who the patient is: photo initials, name, date of birth, ALL their clinics', async () => {
    renderPatientPage()

    expect(await screen.findByRole('heading', { level: 1, name: 'Pat Lee' })).toBeInTheDocument()
    expect(screen.getByText(`Born ${formatCalendarDate('1988-04-12')}`)).toBeInTheDocument()
    const badges = screen.getAllByRole('list', { name: 'Clinics' })[0]
    expect(within(badges).getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      'Riverside Physio',
      'Harbour Sports Clinic',
    ])
  })

  it('shows the editable profile — email read-only, no photo upload', async () => {
    renderPatientPage()
    await screen.findByRole('heading', { level: 1, name: 'Pat Lee' })

    expect(screen.getByRole('region', { name: 'Personal details' })).toBeInTheDocument()
    expect(screen.getByText('pat@example.com')).toBeInTheDocument()
    expect(screen.getByText("Changing an email address isn't available yet.")).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /photo/i })).not.toBeInTheDocument()
  })

  it("explains, without naming anyone, when I'm not on the care team (403)", async () => {
    patientResponse = {
      status: 403,
      body: { statusCode: 403, message: ['You can only view your own profile'] },
    }
    renderPatientPage()

    expect(
      await screen.findByRole('heading', { name: "You're not on this patient's care team" }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Find a patient' })).toHaveAttribute(
      'href',
      '/practitioner/patients/add',
    )
    // Nothing else of the page is fetched for someone without access.
    expect(calls((url) => url.includes('/care-team') || url.includes('/assigned-programs'))).toEqual([])
  })

  it('says the patient could not be loaded on any other error', async () => {
    patientResponse = { status: 500, body: { statusCode: 500, message: ['Boom'] } }
    renderPatientPage()
    expect(
      await screen.findByText("Couldn't load this patient. Try refreshing."),
    ).toBeInTheDocument()
  })

  it('refuses an address that is not a patient id', () => {
    renderPatientPage('/practitioner/patients/abc')
    expect(screen.getByText('Invalid patient.')).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('PatientPage — programs', () => {
  it("lists the current programs, mine marked Yours, a colleague's with who assigned it", async () => {
    programs = [
      program(10, 'Shoulder — Sam', SAM),
      program(11, 'Knee Rehab — Pat', ME),
    ]
    renderPatientPage()
    await screen.findByText('Knee Rehab — Pat')

    const rows = within(section('Programs')).getAllByRole('listitem')
    const mine = rows.find((row) => row.textContent?.includes('Knee Rehab — Pat'))!
    const sams = rows.find((row) => row.textContent?.includes('Shoulder — Sam'))!
    expect(within(mine).getByText('Yours')).toBeInTheDocument()
    expect(within(mine).queryByText(/Assigned by/)).not.toBeInTheDocument()
    expect(within(sams).getByText('Assigned by Sam Okafor')).toBeInTheDocument()
    expect(within(sams).queryByText('Yours')).not.toBeInTheDocument()
    expect(within(sams).getByText(`Started ${formatCalendarDate('2026-09-01')} · Active`)).toBeInTheDocument()
  })

  it('lists current programs, the most recently started first', async () => {
    programs = [
      program(10, 'Older', ME, { startDate: '2026-08-01' }),
      program(11, 'Newer', ME, { startDate: '2026-09-15', endDate: '2026-12-15' }),
    ]
    renderPatientPage()
    await screen.findByText('Newer')

    // Each row is ONE link to its program's page — so the links, in
    // order, say both where each row leads and the order of the rows.
    const rows = within(screen.getByRole('list', { name: 'Current programs' })).getAllByRole('listitem')
    expect(rows.map((row) => within(row).getByRole('link').getAttribute('href'))).toEqual([
      '/practitioner/programs/assigned/11',
      '/practitioner/programs/assigned/10',
    ])
    expect(screen.queryByText('No current program.')).not.toBeInTheDocument()
    expect(
      within(rows[0]).getByText(
        `${formatCalendarDate('2026-09-15')} – ${formatCalendarDate('2026-12-15')} · Active`,
      ),
    ).toBeInTheDocument()
  })

  it('hides past programs behind a checkbox that counts them, then shows them most recently ended first', async () => {
    programs = [
      program(10, 'Current program', ME),
      program(11, 'Completed long ago', ME, {
        status: 'completed',
        startDate: '2026-01-05',
        endDate: '2026-03-29',
      }),
      program(12, 'Cancelled lately', SAM, {
        status: 'cancelled',
        startDate: '2026-06-01',
        endDate: '2026-08-14',
      }),
    ]
    const user = userEvent.setup()
    renderPatientPage()
    await screen.findByText('Current program')

    // Hidden by default: neither the past rows nor their list.
    expect(screen.queryByText('Completed long ago')).not.toBeInTheDocument()
    expect(screen.queryByText('Cancelled lately')).not.toBeInTheDocument()
    expect(screen.queryByRole('list', { name: 'Past programs' })).not.toBeInTheDocument()
    const toggle = within(section('Programs')).getByRole('checkbox', { name: 'Show 2 past programs' })
    expect(toggle).not.toBeChecked()

    await user.click(toggle)

    const past = within(screen.getByRole('list', { name: 'Past programs' })).getAllByRole('listitem')
    expect(past.map((row) => within(row).getByRole('link').getAttribute('href'))).toEqual([
      '/practitioner/programs/assigned/12',
      '/practitioner/programs/assigned/11',
    ])
    // How it ended first, then when; a colleague's still says who assigned it.
    expect(
      within(past[0]).getByText(
        `Cancelled · ended ${formatCalendarDate('2026-08-14')} · ran from ${formatCalendarDate('2026-06-01')}`,
      ),
    ).toBeInTheDocument()
    expect(within(past[0]).getByText('Assigned by Sam Okafor')).toBeInTheDocument()
    expect(within(past[1]).getByText('Yours')).toBeInTheDocument()
    // The current list is unchanged: past rows never join it.
    expect(
      within(screen.getByRole('list', { name: 'Current programs' })).getAllByRole('listitem'),
    ).toHaveLength(1)

    await user.click(toggle)
    expect(screen.queryByRole('list', { name: 'Past programs' })).not.toBeInTheDocument()
  })

  it('says "1 past program" in the singular', async () => {
    programs = [
      program(10, 'Current program', ME),
      program(11, 'Done', ME, { status: 'completed', endDate: '2026-10-01' }),
    ]
    renderPatientPage()
    await screen.findByText('Current program')
    expect(
      within(section('Programs')).getByRole('checkbox', { name: 'Show 1 past program' }),
    ).toBeInTheDocument()
  })

  it('shows no checkbox when no program is past', async () => {
    programs = [program(10, 'Current program', ME)]
    renderPatientPage()
    await screen.findByText('Current program')
    expect(within(section('Programs')).queryByRole('checkbox')).not.toBeInTheDocument()
  })

  it('says "No current program" — not "none assigned" — when every program is past', async () => {
    programs = [program(11, 'Done', ME, { status: 'completed', endDate: '2026-10-01' })]
    renderPatientPage()

    expect(await screen.findByText('No current program.')).toBeInTheDocument()
    expect(screen.queryByText('No programs assigned yet.')).not.toBeInTheDocument()
    expect(screen.queryByRole('list', { name: 'Current programs' })).not.toBeInTheDocument()
    expect(
      within(section('Programs')).getByRole('checkbox', { name: 'Show 1 past program' }),
    ).toBeInTheDocument()
  })

  it("starts with past programs hidden on the next patient's page", async () => {
    const done = { status: 'completed', endDate: '2026-10-01' }
    programs = [program(11, 'Pat’s old program', ME, done)]
    josPrograms = [program(21, 'Jo’s old program', ME, { ...done, patientId: 7 })]
    const user = userEvent.setup()
    renderPatientPage()
    await user.click(await screen.findByRole('checkbox', { name: 'Show 1 past program' }))
    expect(screen.getByText('Pat’s old program')).toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: 'test: patient 7' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Jo Novak' })).toBeInTheDocument()
    expect(
      await screen.findByRole('checkbox', { name: 'Show 1 past program' }),
    ).not.toBeChecked()
    expect(screen.queryByText('Jo’s old program')).not.toBeInTheDocument()
  })

  it('offers "Assign a program", opening the form with this patient chosen', async () => {
    renderPatientPage()
    await screen.findByText('No programs assigned yet.')
    const link = within(section('Programs')).getByRole('link', { name: 'Assign a program' })
    expect(link).toHaveAttribute('href', '/practitioner/programs/assigned/new?patientId=6')
  })

  it('asks for THIS patient’s programs, and says when there are none', async () => {
    renderPatientPage()
    expect(await screen.findByText('No programs assigned yet.')).toBeInTheDocument()
    // Only the one sentence: "No current program" is for when past ones exist.
    expect(screen.queryByText('No current program.')).not.toBeInTheDocument()
    expect(calls((url) => url.includes('/assigned-programs'))).toHaveLength(1)
    expect(urlOf(calls((url) => url.includes('/assigned-programs'))[0][0])).toMatch(
      /\/assigned-programs\?patientId=6$/,
    )
  })
})

describe('PatientPage — care team', () => {
  it('shows each member since when, why, and who added them; only my row can leave', async () => {
    currentTeam = [
      link(SAM, {
        startedAt: '2026-09-15T10:00:00.000Z',
        reason: 'Covering Mondays',
        createdBy: ME,
      }),
      link(ME, { reason: 'Created the patient', createdBy: ME }),
    ]
    renderPatientPage()
    await screen.findByText('Sam Okafor')

    const rows = within(section('Care team')).getAllByRole('listitem')
    // Longest-serving first: me (Sept 1), then Sam (Sept 15).
    expect(rows[0]).toHaveTextContent('Alex Moreau (you)')
    expect(within(rows[0]).getByText(`Since ${formatMomentDate('2026-09-01T10:00:00.000Z')}`)).toBeInTheDocument()
    expect(within(rows[0]).getByText('“Created the patient”')).toBeInTheDocument()
    // I added myself: no "Added by" note.
    expect(within(rows[0]).queryByText(/Added by/)).not.toBeInTheDocument()
    expect(within(rows[0]).getByRole('button', { name: 'Leave care team' })).toBeInTheDocument()

    // A practitioner may add a colleague (not "someone" — that's an admin).
    expect(
      within(section('Care team')).getByRole('button', { name: 'Add a colleague' }),
    ).toBeInTheDocument()

    expect(within(rows[1]).getByText('“Covering Mondays”')).toBeInTheDocument()
    expect(within(rows[1]).getByText('Added by Alex Moreau')).toBeInTheDocument()
    expect(within(rows[1]).queryByRole('button')).not.toBeInTheDocument()
  })

  it('shows a planned end for cover', async () => {
    currentTeam = [link(ME), link(SAM, { endsAt: '2026-12-01T10:00:00.000Z' })]
    renderPatientPage()
    expect(
      await screen.findByText(
        `Since ${formatMomentDate('2026-09-01T10:00:00.000Z')}, until ${formatMomentDate('2026-12-01T10:00:00.000Z')}`,
      ),
    ).toBeInTheDocument()
  })

  it('shows past members only when asked, with their period', async () => {
    fullTeam = [
      link(ME),
      // My own EARLIER link (I left, then rejoined): no "Leave" on it.
      link(ME, {
        id: 999,
        isActive: false,
        startedAt: '2026-01-01T10:00:00.000Z',
        endsAt: '2026-01-15T10:00:00.000Z',
      }),
      link(BLAKE, {
        isActive: false,
        startedAt: '2026-02-01T10:00:00.000Z',
        endsAt: '2026-05-01T10:00:00.000Z',
      }),
    ]
    const user = userEvent.setup()
    renderPatientPage()
    await screen.findByText('Alex Moreau')
    expect(screen.queryByText('Blake Martin')).not.toBeInTheDocument()

    await user.click(screen.getByRole('checkbox', { name: 'Show past members' }))

    expect(await screen.findByText('Blake Martin')).toBeInTheDocument()
    expect(
      screen.getByText(
        `From ${formatMomentDate('2026-02-01T10:00:00.000Z')} to ${formatMomentDate('2026-05-01T10:00:00.000Z')}`,
      ),
    ).toBeInTheDocument()
    expect(calls((url) => url.includes('/care-team?includeEnded=true'))).toHaveLength(1)
    // A past link can't be "left" — not Blake's, not my own earlier one.
    const blakeRow = screen.getByText('Blake Martin').closest('li')!
    expect(within(blakeRow).queryByRole('button')).not.toBeInTheDocument()
    expect(
      within(section('Care team')).getAllByRole('button', { name: 'Leave care team' }),
    ).toHaveLength(1)
  })

  it("starts fresh on another patient's page: the past-members toggle doesn't carry over", async () => {
    const user = userEvent.setup()
    const { queryClient } = renderPatientPage()
    // Jo's page was visited earlier, so Jo is cached: no "Loading patient…"
    // in between (which would unmount the section and hide the problem) —
    // only the `key` on the view makes the next patient start fresh.
    queryClient.setQueryData(['users', 7], { ...pat, id: 7, firstName: 'Jo', lastName: 'Novak' })
    await screen.findByText('Alex Moreau')
    await user.click(screen.getByRole('checkbox', { name: 'Show past members' }))
    expect(screen.getByRole('checkbox', { name: 'Show past members' })).toBeChecked()

    await user.click(screen.getByRole('link', { name: 'test: patient 7' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Jo Novak' })).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Show past members' })).not.toBeChecked()
  })
})

describe('PatientPage — leaving the care team', () => {
  async function openLeaveDialog(user: ReturnType<typeof userEvent.setup>) {
    const rendered = renderPatientPage()
    await screen.findByText('Alex Moreau')
    await user.click(screen.getByRole('button', { name: 'Leave care team' }))
    return { ...rendered, dialog: await screen.findByRole('dialog') }
  }

  it('says what leaving means, and warns when I am the only member', async () => {
    const user = userEvent.setup()
    const { dialog } = await openLeaveDialog(user)

    expect(
      within(dialog).getByRole('heading', { name: "Leave Pat Lee's care team?" }),
    ).toBeInTheDocument()
    expect(
      within(dialog).getByText(
        "You'll lose access to Pat's clinical record: programs, sessions, medical files and messages. The care team's history keeps a record that you were on it, and you can add Pat to your patients again later.",
      ),
    ).toBeInTheDocument()
    expect(
      within(dialog).getByText(
        "You're the only practitioner on Pat's care team. After you leave, no practitioner will have access to their record until someone joins.",
      ),
    ).toBeInTheDocument()
  })

  it('does not warn when someone else is on the team', async () => {
    currentTeam = [link(ME), link(SAM)]
    const user = userEvent.setup()
    const { dialog } = await openLeaveDialog(user)
    expect(within(dialog).queryByText(/only practitioner/)).not.toBeInTheDocument()
  })

  it('ends MY link, then goes back to my patients with a confirmation — without fetching the patient again', async () => {
    const user = userEvent.setup()
    const { dialog, queryClient } = await openLeaveDialog(user)
    queryClient.setQueryData(['directory-patients', ''], [])
    // My roster as last seen — still with Pat. After leaving it must be
    // refetched (the server, mocked, now answers []), not shown from cache.
    queryClient.setQueryData(['users-list', false], [pat])
    const patientFetchesBefore = calls((url) => /\/users\/6$/.test(url)).length

    await user.click(within(dialog).getByRole('button', { name: 'Leave care team' }))

    expect(await screen.findByRole('status')).toHaveTextContent("You left Pat Lee's care team.")
    expect(screen.getByRole('heading', { name: 'My patients' })).toBeInTheDocument()

    const endCalls = calls((url) => url.endsWith('/end'))
    expect(endCalls).toHaveLength(1)
    expect(urlOf(endCalls[0][0])).toMatch(/\/users\/6\/care-team\/2\/end$/)
    expect(endCalls[0][1]?.method).toBe('POST')

    // The profile was not asked for again on the way out (it would be a 403).
    expect(calls((url) => /\/users\/6$/.test(url))).toHaveLength(patientFetchesBefore)
    // Forgotten, not kept: no profile data survives in the cache, so coming
    // back later starts clean. (The page's switched-off query may leave an
    // EMPTY entry behind — a disabled observer still registers its key — so
    // the test checks the data, which is what matters.)
    expect(queryClient.getQueryData(['users', 6])).toBeUndefined()
    expect(queryClient.getQueryData(['assigned-programs-list', 'patient', 6])).toBeUndefined()
    expect(queryClient.getQueryState(['directory-patients', ''])?.isInvalidated).toBe(true)
    // The care team changed. Depending on timing it was either refetched at
    // once (still on screen when invalidated — a refetch clears the
    // "invalidated" flag; harmless, the care team stays readable at
    // directory level) or marked stale (already off screen). Either proves
    // the old answer isn't kept as if fresh.
    const team = queryClient.getQueryState(['care-team', 6, false])!
    expect(team.isInvalidated || team.dataUpdateCount > 1).toBe(true)
    // The roster no longer lists Pat (only the notice names them).
    expect(await screen.findByText('No patients yet')).toBeInTheDocument()
  })

  it("replaces the patient page in the history: Back doesn't return to a page I can no longer open", async () => {
    const user = userEvent.setup()
    const { dialog } = await openLeaveDialog(user)
    await user.click(within(dialog).getByRole('button', { name: 'Leave care team' }))
    await screen.findByRole('status')

    await user.click(screen.getByRole('button', { name: 'test: back' }))

    // Back lands on the roster entry from BEFORE the patient page.
    expect(await screen.findByRole('heading', { name: 'My patients' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 1, name: 'Pat Lee' })).not.toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: "You're not on this patient's care team" }),
    ).not.toBeInTheDocument()
  })

  it('shows the backend’s refusal in the dialog and stays on the page', async () => {
    endResponse = {
      status: 403,
      body: { statusCode: 403, message: ['You can only end your own care-team membership'] },
    }
    const user = userEvent.setup()
    const { dialog } = await openLeaveDialog(user)

    await user.click(within(dialog).getByRole('button', { name: 'Leave care team' }))

    expect(
      await within(dialog).findByText('You can only end your own care-team membership'),
    ).toBeInTheDocument()
    // `hidden: true`: while a modal dialog is open, Radix marks everything
    // behind it aria-hidden, so the page heading is only "hidden" from
    // role queries — it's still the page we're on.
    expect(
      screen.getByRole('heading', { level: 1, name: 'Pat Lee', hidden: true }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'My patients', hidden: true })).not.toBeInTheDocument()
  })

  it('forgets the old error when the dialog is closed and opened again', async () => {
    endResponse = { status: 403, body: { statusCode: 403, message: ['Refused'] } }
    const user = userEvent.setup()
    const { dialog } = await openLeaveDialog(user)
    await user.click(within(dialog).getByRole('button', { name: 'Leave care team' }))
    await within(dialog).findByText('Refused')

    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    await user.click(screen.getByRole('button', { name: 'Leave care team' }))

    const reopened = await screen.findByRole('dialog')
    await waitFor(() => expect(within(reopened).queryByText('Refused')).not.toBeInTheDocument())
  })
})