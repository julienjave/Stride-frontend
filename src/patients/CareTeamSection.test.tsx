import { describe, it, expect, vi, beforeEach } from 'vitest'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
import { CareTeamSection } from './CareTeamSection'
import { localDateString } from '@/common/calendarDate'
import { endOfLocalDay } from './patientPageRules'
import type { CareTeamCandidate, CareTeamEntry } from './types'

const fetchMock = vi.fn<typeof fetch>()
vi.stubGlobal('fetch', fetchMock)

// A fetch call's URL as a string — see CreateUserPage.test.tsx on why
// String(input) would be wrong for a Request object.
function urlOf(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input
  if (input instanceof URL) return input.toString()
  return input.url
}

const ME = { id: 3, firstName: 'Sam', lastName: 'Okafor' }
const ALEX = { id: 2, firstName: 'Alex', lastName: 'Chen' }
const BLAKE = { id: 4, firstName: 'Blake', lastName: 'Martin' }

function link(practitioner: typeof ME, extra: Partial<CareTeamEntry> = {}): CareTeamEntry {
  return {
    id: practitioner.id * 100,
    patientId: 8,
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

function candidate(
  person: typeof ME,
  specialties: string[],
  onCareTeam: boolean,
): CareTeamCandidate {
  return {
    ...person,
    avatarUrl: null,
    specialties,
    sharedClinics: [{ id: 1, name: 'Riverside Physio' }],
    onCareTeam,
  }
}

let team: CareTeamEntry[]
let candidates: CareTeamCandidate[]
let addResponse: { status: number; body: object }

function json(status: number, body: unknown) {
  return Promise.resolve(new Response(JSON.stringify(body), { status }))
}

beforeEach(() => {
  fetchMock.mockReset()
  team = [link(ME), link(BLAKE)]
  candidates = [
    candidate(ALEX, ['Knee rehabilitation'], false),
    candidate(BLAKE, ['Shoulder'], true),
    candidate(ME, ['Lower back'], true),
  ]
  addResponse = { status: 201, body: link(ALEX) }
  fetchMock.mockImplementation((input, init) => {
    const url = urlOf(input)
    if (url.endsWith('/care-team/candidates')) return json(200, candidates)
    if (url.endsWith('/end') && init?.method === 'POST') return json(201, {})
    if (url.match(/\/users\/8\/care-team$/) && init?.method === 'POST') {
      return json(addResponse.status, addResponse.body)
    }
    // Current members only, or (with the history toggle) every link.
    if (url.endsWith('/care-team?includeEnded=true')) return json(200, team)
    if (url.match(/\/users\/8\/care-team$/)) return json(200, team.filter((e) => e.isActive))
    throw new Error(`Unexpected fetch to ${url}`)
  })
})

type Mode = 'practitioner' | 'admin'

// `patientActive`: the patient's ACCOUNT (decisions §21) — active unless a
// test says otherwise.
function renderSection(mode: Mode = 'practitioner', canAdd = true, patientActive = true) {
  // staleTime as in the app (queryClient.ts): with 0, reopening the dialog
  // would refetch the candidates anyway and hide a missing invalidation.
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 30_000 } },
  })
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <CareTeamSection
          patientId={8}
          patientFirstName="Robin"
          patientLastName="Silva"
          myId={ME.id}
          canAdd={canAdd}
          canEndAny={mode === 'admin'}
          patientActive={patientActive}
          onLeft={mode === 'practitioner' ? () => {} : undefined}
        />
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return { queryClient }
}

// The admin home's "needs attention" (decisions §17): a link added or ended
// can move the patient into or out of "Patients without a care team", so
// the home's numbers and the users lists must be marked stale. Seeded as
// cache entries nobody shows, which then STAY invalidated (an observed one
// would refetch at once and read fresh again).
function seedAttentionCache(queryClient: QueryClient) {
  queryClient.setQueryData(['admin-metrics'], {})
  queryClient.setQueryData(['users-list', 'attention', 'patients-without-care-team'], [])
}

function expectAttentionRefreshed(queryClient: QueryClient) {
  expect(queryClient.getQueryState(['admin-metrics'])?.isInvalidated).toBe(true)
  expect(
    queryClient.getQueryState(['users-list', 'attention', 'patients-without-care-team'])
      ?.isInvalidated,
  ).toBe(true)
}

function calls(match: (url: string, method: string) => boolean) {
  return fetchMock.mock.calls.filter(([input, init]) => match(urlOf(input), init?.method ?? 'GET'))
}

async function openAddDialog(user: ReturnType<typeof userEvent.setup>, label: string) {
  await screen.findByText('Blake Martin')
  await user.click(screen.getByRole('button', { name: label }))
  const dialog = await screen.findByRole('dialog')
  await within(dialog).findByText('Alex Chen')
  return dialog
}

describe('CareTeamSection — adding a practitioner', () => {
  it('asks for the candidates only once the dialog is open', async () => {
    const user = userEvent.setup()
    renderSection()
    await screen.findByText('Blake Martin')
    expect(calls((url) => url.endsWith('/candidates'))).toHaveLength(0)

    await openAddDialog(user, 'Add a colleague')
    expect(calls((url) => url.endsWith('/candidates'))).toHaveLength(1)
  })

  it("lists the patient's clinic practitioners: specialties, clinics; those on the team can't be picked", async () => {
    const user = userEvent.setup()
    renderSection()
    const dialog = await openAddDialog(user, 'Add a colleague')

    expect(
      within(dialog).getByRole('heading', { name: "Add a colleague to Robin's care team" }),
    ).toBeInTheDocument()
    expect(within(dialog).getByRole('group', { name: 'Practitioner' })).toBeInTheDocument()
    expect(within(dialog).getByRole('radio', { name: /Alex Chen/ })).toBeEnabled()
    expect(within(dialog).getByRole('radio', { name: /Blake Martin/ })).toBeDisabled()
    expect(within(dialog).getByRole('radio', { name: /Sam Okafor/ })).toBeDisabled()
    expect(within(dialog).getByText('Knee rehabilitation · Riverside Physio')).toBeInTheDocument()
    expect(
      within(dialog).getByText('Shoulder · Riverside Physio · Already on the team'),
    ).toBeInTheDocument()
  })

  it('filters by name or specialty, and says when nothing matches', async () => {
    const user = userEvent.setup()
    renderSection()
    const dialog = await openAddDialog(user, 'Add a colleague')

    await user.type(within(dialog).getByRole('searchbox', { name: 'Filter by name or specialty' }), 'knee')
    expect(within(dialog).getAllByRole('radio')).toHaveLength(1)
    expect(within(dialog).getByRole('radio', { name: /Alex Chen/ })).toBeInTheDocument()

    await user.clear(within(dialog).getByRole('searchbox'))
    await user.type(within(dialog).getByRole('searchbox'), 'zzz')
    expect(within(dialog).getByText('No practitioner matches "zzz".')).toBeInTheDocument()
  })

  it('can only add once someone is chosen', async () => {
    const user = userEvent.setup()
    renderSection()
    const dialog = await openAddDialog(user, 'Add a colleague')

    expect(within(dialog).getByRole('button', { name: 'Add to care team' })).toBeDisabled()
    await user.click(within(dialog).getByRole('radio', { name: /Alex Chen/ }))
    expect(within(dialog).getByRole('button', { name: 'Add to care team' })).toBeEnabled()
  })

  it('adds the chosen practitioner with the reason and the END of the chosen day, then closes and refreshes the team', async () => {
    const user = userEvent.setup()
    const { queryClient } = renderSection()
    seedAttentionCache(queryClient)
    const dialog = await openAddDialog(user, 'Add a colleague')
    const teamFetchesBefore = calls((url, method) => /\/care-team$/.test(url) && method === 'GET').length

    await user.click(within(dialog).getByRole('radio', { name: /Alex Chen/ }))
    await user.type(within(dialog).getByLabelText('Reason (optional)'), ' Covering Mondays ')
    await user.type(within(dialog).getByLabelText('Until (optional)'), '2030-10-16')
    team = [link(ME), link(BLAKE), link(ALEX, { reason: 'Covering Mondays' })]
    await user.click(within(dialog).getByRole('button', { name: 'Add to care team' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    const [post] = calls((url, method) => /\/users\/8\/care-team$/.test(url) && method === 'POST')
    // A literal string: an undefined key can't hide (see
    // deferred-improvements, the clearing bug).
    expect(post[1]?.body).toBe(
      `{"practitionerId":2,"reason":"Covering Mondays","endsAt":"${endOfLocalDay('2030-10-16')}"}`,
    )
    // The team was fetched again, and shows the new member.
    expect(await screen.findByText('Alex Chen')).toBeInTheDocument()
    expect(
      calls((url, method) => /\/care-team$/.test(url) && method === 'GET').length,
    ).toBeGreaterThan(teamFetchesBefore)
    expectAttentionRefreshed(queryClient)
  })

  it('refreshes the candidates too: the one just added is "on the team" next time', async () => {
    const user = userEvent.setup()
    renderSection()
    const dialog = await openAddDialog(user, 'Add a colleague')
    await user.click(within(dialog).getByRole('radio', { name: /Alex Chen/ }))
    candidates = candidates.map((c) => (c.id === ALEX.id ? { ...c, onCareTeam: true } : c))
    team = [link(ME), link(BLAKE), link(ALEX)]
    await user.click(within(dialog).getByRole('button', { name: 'Add to care team' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: 'Add a colleague' }))
    const reopened = await screen.findByRole('dialog')
    await waitFor(() =>
      expect(within(reopened).getByRole('radio', { name: /Alex Chen/ })).toBeDisabled(),
    )
  })

  it('sends neither a reason nor an end date when they are left empty', async () => {
    const user = userEvent.setup()
    renderSection()
    const dialog = await openAddDialog(user, 'Add a colleague')

    await user.click(within(dialog).getByRole('radio', { name: /Alex Chen/ }))
    await user.click(within(dialog).getByRole('button', { name: 'Add to care team' }))

    await waitFor(() =>
      expect(calls((url, method) => /\/care-team$/.test(url) && method === 'POST')).toHaveLength(1),
    )
    expect(
      calls((url, method) => /\/care-team$/.test(url) && method === 'POST')[0][1]?.body,
    ).toBe('{"practitionerId":2}')
  })

  it("doesn't offer a day before today", async () => {
    const user = userEvent.setup()
    renderSection()
    const dialog = await openAddDialog(user, 'Add a colleague')
    expect(within(dialog).getByLabelText('Until (optional)')).toHaveAttribute(
      'min',
      localDateString(),
    )
  })

  it("shows the backend's refusal and keeps the dialog open; reopening starts clean", async () => {
    addResponse = {
      status: 409,
      body: { statusCode: 409, message: ['This practitioner is already on the care team'] },
    }
    const user = userEvent.setup()
    renderSection()
    const dialog = await openAddDialog(user, 'Add a colleague')
    await user.click(within(dialog).getByRole('radio', { name: /Alex Chen/ }))
    await user.type(within(dialog).getByLabelText('Reason (optional)'), 'Second opinion')
    await user.click(within(dialog).getByRole('button', { name: 'Add to care team' }))

    expect(
      await within(dialog).findByText('This practitioner is already on the care team'),
    ).toBeInTheDocument()

    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    const reopened = await openAddDialog(user, 'Add a colleague')
    expect(within(reopened).queryByText(/already on the care team/)).not.toBeInTheDocument()
    expect(within(reopened).getByRole('radio', { name: /Alex Chen/ })).not.toBeChecked()
    expect(within(reopened).getByLabelText('Reason (optional)')).toHaveValue('')
  })
})

describe('CareTeamSection — what each viewer may do', () => {
  it('a practitioner: "Add a colleague", and "Leave" on their own row only', async () => {
    renderSection('practitioner')
    await screen.findByText('Blake Martin')

    expect(screen.getByRole('button', { name: 'Add a colleague' })).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Leave care team' })).toHaveLength(1)
    expect(screen.queryByRole('button', { name: /^End / })).not.toBeInTheDocument()
  })

  it('an admin: "Add someone", and "End" on every current row — none on past ones', async () => {
    team = [
      link(ME),
      link(BLAKE),
      link(ALEX, { id: 999, isActive: false, endsAt: '2026-09-15T10:00:00.000Z' }),
    ]
    const user = userEvent.setup()
    renderSection('admin')
    await screen.findByText('Blake Martin')
    // Show the history, so the ended link is on screen too.
    await user.click(screen.getByRole('checkbox', { name: 'Show past members' }))
    await screen.findByText('Alex Chen')

    expect(screen.getByRole('button', { name: 'Add someone' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: "End Sam Okafor's membership" })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: "End Blake Martin's membership" })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: "End Alex Chen's membership" })).not.toBeInTheDocument()
    // An admin ends links; they don't "leave".
    expect(screen.queryByRole('button', { name: 'Leave care team' })).not.toBeInTheDocument()
  })

  it("an admin ends someone's link after a confirmation, for THAT practitioner", async () => {
    const user = userEvent.setup()
    const { queryClient } = renderSection('admin')
    seedAttentionCache(queryClient)
    await user.click(await screen.findByRole('button', { name: "End Blake Martin's membership" }))
    const dialog = await screen.findByRole('dialog')

    expect(
      within(dialog).getByRole('heading', { name: "Remove Blake Martin from Robin Silva's care team?" }),
    ).toBeInTheDocument()
    expect(
      within(dialog).getByText(
        "This ends Blake's access to Robin's clinical record: programs, sessions, medical files and messages. The care team's history keeps a record that they were on it.",
      ),
    ).toBeInTheDocument()
    // Two members: no "only practitioner" warning.
    expect(within(dialog).queryByText(/only practitioner/)).not.toBeInTheDocument()

    team = [link(ME)]
    await user.click(within(dialog).getByRole('button', { name: 'End membership' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    const ends = calls((url, method) => url.endsWith('/end') && method === 'POST')
    expect(ends).toHaveLength(1)
    expect(urlOf(ends[0][0])).toMatch(/\/users\/8\/care-team\/4\/end$/)
    await waitFor(() => expect(screen.queryByText('Blake Martin')).not.toBeInTheDocument())
    expectAttentionRefreshed(queryClient)
  })

  it('offers no "Add" to a viewer who may not add (canAdd false)', async () => {
    renderSection('practitioner', false)
    await screen.findByText('Blake Martin')
    expect(screen.queryByRole('button', { name: /^Add / })).not.toBeInTheDocument()
  })

  // Decisions §21: a deactivated patient keeps their team — shown, and its
  // links can still end — but nobody new joins until the account is
  // reactivated. Instead of the button, a sentence saying why.
  const NOBODY_NEW = "Nobody new can join Robin's care team while their account is deactivated."

  it('a deactivated patient, for a practitioner: the team and "Leave", no "Add" — and why', async () => {
    renderSection('practitioner', true, false)
    await screen.findByText('Blake Martin')

    expect(screen.queryByRole('button', { name: /^Add / })).not.toBeInTheDocument()
    expect(screen.getByText(`${NOBODY_NEW} An admin can reactivate it.`)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Leave care team' })).toBeInTheDocument()
    // Nothing asked for the candidates (the backend would answer 409).
    expect(calls((url) => url.endsWith('/candidates'))).toHaveLength(0)
  })

  it('a deactivated patient, for an admin: "End" on every row, no "Add" — and what to do', async () => {
    renderSection('admin', true, false)
    await screen.findByText('Blake Martin')

    expect(screen.queryByRole('button', { name: /^Add / })).not.toBeInTheDocument()
    expect(
      screen.getByText(`${NOBODY_NEW} Reactivate the account to add someone.`),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: "End Blake Martin's membership" })).toBeInTheDocument()
  })

  // The sentence replaces a button: a viewer who wouldn't have had it isn't
  // told about it, and an active patient's team has no such line.
  it('says nothing of the kind to a viewer who may not add, or for an active patient', async () => {
    renderSection('practitioner', false, false)
    await screen.findByText('Blake Martin')
    expect(screen.queryByText(/Nobody new can join/)).not.toBeInTheDocument()
    cleanup()

    renderSection('admin', true, true)
    await screen.findByText('Blake Martin')
    expect(screen.queryByText(/Nobody new can join/)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add someone' })).toBeInTheDocument()
  })

  it("forgets an admin's failed End when the dialog is closed and opened again", async () => {
    fetchMock.mockImplementation((input, init) => {
      const url = urlOf(input)
      if (url.endsWith('/end') && init?.method === 'POST') {
        return json(403, { statusCode: 403, message: ['Refused'] })
      }
      return json(200, team)
    })
    const user = userEvent.setup()
    renderSection('admin')
    await user.click(await screen.findByRole('button', { name: "End Blake Martin's membership" }))
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: 'End membership' }))
    await within(dialog).findByText('Refused')

    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    await user.click(screen.getByRole('button', { name: "End Blake Martin's membership" }))
    const reopened = await screen.findByRole('dialog')
    expect(within(reopened).queryByText('Refused')).not.toBeInTheDocument()
  })

  it('warns an admin before removing the only practitioner', async () => {
    team = [link(BLAKE)]
    const user = userEvent.setup()
    renderSection('admin')
    await user.click(await screen.findByRole('button', { name: "End Blake Martin's membership" }))
    expect(
      await screen.findByText(
        "Blake is the only practitioner on Robin's care team. Afterwards, no practitioner will have access to their record until someone is added.",
      ),
    ).toBeInTheDocument()
  })

  it('says when nobody is on the team', async () => {
    team = []
    renderSection('admin')
    expect(
      await screen.findByText("No practitioner is on Robin's care team."),
    ).toBeInTheDocument()
  })
})