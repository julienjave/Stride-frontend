import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import { expectSkeleton } from '@/common/loadingAssertions'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router'
import { AuditLogPage } from './AuditLogPage'
import { formatEntryMoment } from './auditWording'
import type { AuditActionOption, AuditLogEntry, AuditLogPage as Page } from './types'

const fetchMock = vi.fn<typeof fetch>()
vi.stubGlobal('fetch', fetchMock)

// --- FIXTURES ---

const ALEX = { id: 3, firstName: 'Alex', lastName: 'Chen' }
const PAT = { id: 6, firstName: 'Pat', lastName: 'Lee' }
const AVERY = { id: 1, firstName: 'Avery', lastName: 'Admin' }

// The default entry shows its details. (The backend withholds a real
// program entry's since 2026-10-23 — the screen goes by `detailsWithheld`,
// not by the area, so the fixture stays a program.)
function entry(id: number, overrides: Partial<AuditLogEntry> = {}): AuditLogEntry {
  return {
    id,
    action: 'ASSIGNED_PROGRAM_UPDATED',
    kind: 'change',
    entityType: 'assigned-programs',
    area: 'Programs',
    entityId: 7,
    details: { changes: { title: { from: 'Knee', to: 'Knee, phase 2' } } },
    detailsWithheld: false,
    createdAt: '2031-03-10T13:02:00.000Z',
    performer: ALEX,
    target: PAT,
    ...overrides,
  }
}

function page(data: AuditLogEntry[], meta: Partial<Page['meta']> = {}): Page {
  return {
    data,
    meta: { total: data.length, page: 1, limit: 20, totalPages: 1, ...meta },
  }
}

const ACTIONS: AuditActionOption[] = [
  { action: 'ASSIGNED_PROGRAM_UPDATED', kind: 'change' },
  { action: 'LOGOUT', kind: 'sign_in' },
  { action: 'LOGIN_SUCCESS', kind: 'sign_in' },
  { action: 'PROGRAM_VIEWED', kind: 'view' },
  { action: 'CLINIC_CREATED', kind: 'change' },
]

const USERS = [
  { ...PAT, isActive: true },
  { ...ALEX, isActive: true },
  { id: 9, firstName: 'Frank', lastName: 'Former', isActive: false },
  { ...AVERY, isActive: true },
]

// --- HARNESS ---

interface Sent {
  method: string
  path: string
}
let sent: Sent[] = []
const logRequests = () =>
  sent.filter((request) => request.path.startsWith('/audit-logs?')).map((request) => request.path)

function urlOf(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input
  if (input instanceof URL) return input.toString()
  return input.url
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status })

// The address as the router holds it — the page's filters live there.
function LocationProbe() {
  const location = useLocation()
  return <p data-testid="location">{location.pathname + location.search}</p>
}
const shownAddress = () => screen.getByTestId('location').textContent

// The browser's Back, inside the test's router.
function BackControl() {
  const navigate = useNavigate()
  return (
    <button type="button" onClick={() => void navigate(-1)}>
      test: back
    </button>
  )
}

function renderAuditLog(
  path = '/admin/audit-log',
  answerLog: (path: string) => Response | Promise<Response> = () => json(page([entry(1)])),
  users: unknown[] = USERS,
) {
  sent = []
  fetchMock.mockReset()
  fetchMock.mockImplementation((input, init) => {
    const url = new URL(urlOf(input))
    const request = { method: init?.method ?? 'GET', path: url.pathname + url.search }
    sent.push(request)
    if (request.path === '/audit-logs/actions') return Promise.resolve(json(ACTIONS))
    if (request.path === '/users?includeInactive=true') return Promise.resolve(json(users))
    if (request.path.startsWith('/audit-logs?')) return Promise.resolve(answerLog(request.path))
    return Promise.reject(new Error(`unexpected request: ${request.method} ${request.path}`))
  })
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 30_000 } },
  })
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <LocationProbe />
        <BackControl />
        <Routes>
          <Route path="/admin/audit-log" element={<AuditLogPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

// The entries on screen, by their heading (the action's words).
const entryCards = () => screen.queryAllByRole('article')
// Waits for the filters' choices to arrive (they come in their own requests):
// the people in "About", the actions in "Action".
async function optionsArrived() {
  await waitFor(() => {
    expect(within(screen.getByLabelText('About')).getAllByRole('option').length).toBeGreaterThan(1)
    expect(screen.getByLabelText('Action').querySelector('optgroup')).not.toBeNull()
  })
}

// --- TESTS ---

describe('AuditLogPage', () => {
  it('asks for the first page with no filters, and the choices for the filters', async () => {
    renderAuditLog()
    await screen.findByRole('heading', { name: 'Edited a program' })
    expect(logRequests()).toEqual(['/audit-logs?page=1&limit=20'])
    expect(sent.map((request) => request.path).sort()).toEqual([
      '/audit-logs/actions',
      '/audit-logs?page=1&limit=20',
      '/users?includeInactive=true',
    ])
  })

  it('shows each entry: when, kind, area, the action in words, and who → whom', async () => {
    renderAuditLog()
    const card = await screen.findByRole('article', { name: 'Edited a program' })
    const time = within(card).getByText(formatEntryMoment('2031-03-10T13:02:00.000Z'))
    expect(time.tagName).toBe('TIME')
    expect(time).toHaveAttribute('dateTime', '2031-03-10T13:02:00.000Z')
    expect(card).toHaveTextContent(
      `${formatEntryMoment('2031-03-10T13:02:00.000Z')} · Change · Programs`,
    )
    // Seen as an arrow, heard as "about".
    expect(within(card).getByText('Alex Chen', { exact: false })).toHaveTextContent(
      'Alex Chen →about Pat Lee',
    )
    expect(within(card).getByText('→')).toHaveAttribute('aria-hidden', 'true')
  })

  it('shows one name when the entry is about the person who acted, or about no one', async () => {
    renderAuditLog('/admin/audit-log', () =>
      json(
        page([
          entry(1, { action: 'SESSION_STARTED', area: 'Sessions', performer: PAT, target: PAT }),
          entry(2, { action: 'LOGOUT', kind: 'sign_in', area: 'Accounts', performer: AVERY, target: null }),
        ]),
      ),
    )
    const own = await screen.findByRole('article', { name: 'Started a session' })
    expect(within(own).getByText('Pat Lee')).toBeInTheDocument()
    expect(within(own).queryByText('→')).not.toBeInTheDocument()
    expect(within(own).queryByText('about')).not.toBeInTheDocument()

    const signOut = screen.getByRole('article', { name: 'Signed out' })
    expect(signOut).toHaveTextContent('Sign-in · Accounts')
    expect(within(signOut).getByText('Avery Admin')).toBeInTheDocument()
    expect(within(signOut).queryByText('→')).not.toBeInTheDocument()
  })

  it('names an action the wording table does not know from its stored value', async () => {
    renderAuditLog('/admin/audit-log', () =>
      json(page([entry(1, { action: 'POST /users/6', area: 'Accounts', target: null })])),
    )
    expect(await screen.findByRole('article', { name: 'POST /users/6' })).toBeInTheDocument()
  })

  it('counts the entries in a live region', async () => {
    renderAuditLog('/admin/audit-log', () => json(page([entry(1), entry(2)], { total: 41, totalPages: 3 })))
    // The count's own live region (the list's loading state is one too).
    expect(await screen.findByText('41 entries', { selector: '[role="status"]' })).toBeInTheDocument()
  })

  it('says "1 entry" for one', async () => {
    renderAuditLog()
    expect(await screen.findByText(/^1 entry$/, { selector: '[role="status"]' })).toBeInTheDocument()
  })

  // --- details ---

  it('opens and closes an entry’s details: the record and a before → after table', async () => {
    const user = userEvent.setup()
    renderAuditLog()
    const card = await screen.findByRole('article', { name: 'Edited a program' })
    const toggle = within(card).getByRole('button', { name: 'Details' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(within(card).queryByRole('table')).not.toBeInTheDocument()

    await user.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(toggle).toHaveAccessibleName('Hide details')
    const panel = document.getElementById(toggle.getAttribute('aria-controls') ?? '')
    expect(panel).not.toBeNull()
    expect(within(panel!).getByText('Record').nextElementSibling).toHaveTextContent('Programs #7')
    const rows = within(within(panel!).getByRole('table')).getAllByRole('row')
    expect(rows.map((row) => row.textContent)).toEqual([
      'FieldBeforeAfter',
      'TitleKneeKnee, phase 2',
    ])

    await user.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(within(card).queryByRole('table')).not.toBeInTheDocument()
  })

  // Decisions §16: an entry about clinical data answers without its details
  // — the row says so, and offers no "Details" that would open onto nothing.
  it('says when an entry’s clinical details are withheld, with no Details button', async () => {
    renderAuditLog('/admin/audit-log', () =>
      json(
        page([
          entry(1, { action: 'SESSION_COMPLETED', entityType: 'sessions', area: 'Sessions', details: null, detailsWithheld: true }),
          entry(2),
        ]),
      ),
    )
    const withheld = await screen.findByRole('article', { name: 'Finished a session' })
    expect(within(withheld).getByText("Clinical details aren't shown to admins.")).toBeInTheDocument()
    expect(within(withheld).queryByRole('button')).not.toBeInTheDocument()
    // The entry beside it keeps its toggle — and no such line.
    const shown = screen.getByRole('article', { name: 'Edited a program' })
    expect(within(shown).getByRole('button', { name: 'Details' })).toBeInTheDocument()
    expect(within(shown).queryByText("Clinical details aren't shown to admins.")).not.toBeInTheDocument()
  })

  it('shows other details as labelled values', async () => {
    const user = userEvent.setup()
    renderAuditLog('/admin/audit-log', () =>
      json(
        page([
          entry(1, {
            action: 'PROGRAMS_VIEWED',
            kind: 'view',
            entityId: null,
            details: { programIds: [7, 8] },
          }),
        ]),
      ),
    )
    const card = await screen.findByRole('article', { name: 'Viewed the program list' })
    await user.click(within(card).getByRole('button', { name: 'Details' }))
    expect(within(card).getByText('Program IDs').nextElementSibling).toHaveTextContent('#7, #8')
    expect(within(card).queryByText('Record')).not.toBeInTheDocument()
    expect(within(card).queryByText('No further details.')).not.toBeInTheDocument()
  })

  // The page hands the entry's ACTION to the details (2026-10-25): stored
  // code words get plain ones.
  it('shows a failed step-up’s details in plain words', async () => {
    const user = userEvent.setup()
    renderAuditLog('/admin/audit-log', () =>
      json(
        page([
          entry(1, {
            action: 'STEP_UP_FAILED',
            kind: 'sign_in',
            entityType: 'users',
            area: 'Accounts',
            entityId: 6,
            performer: PAT,
            details: { purpose: 'email_change', reason: 'wrong_code', consecutiveFailures: 2 },
          }),
        ]),
      ),
    )
    const card = await screen.findByRole('article', {
      name: 'Entered a wrong password or code to confirm a change',
    })
    await user.click(within(card).getByRole('button', { name: 'Details' }))
    expect(within(card).getByText('For').nextElementSibling).toHaveTextContent(
      'Changing the email address',
    )
    expect(within(card).getByText('Reason').nextElementSibling).toHaveTextContent('Wrong code')
    expect(within(card).getByText('Failures in a row').nextElementSibling).toHaveTextContent('2')
  })

  it('shows a moment in the details like the entry’s own time', async () => {
    const user = userEvent.setup()
    renderAuditLog('/admin/audit-log', () =>
      json(
        page([
          entry(1, {
            action: 'CONVERSATION_ARCHIVED',
            area: 'Messages',
            details: { archivedAt: '2031-03-10T17:23:34.580Z' },
          }),
        ]),
      ),
    )
    const card = await screen.findByRole('article', { name: 'Archived a conversation' })
    await user.click(within(card).getByRole('button', { name: 'Details' }))
    expect(within(card).getByText('Archived at').nextElementSibling).toHaveTextContent(
      formatEntryMoment('2031-03-10T17:23:34.580Z'),
    )
  })

  it('says when an entry has nothing more to show', async () => {
    const user = userEvent.setup()
    renderAuditLog('/admin/audit-log', () =>
      json(page([entry(1, { action: 'LOGOUT', kind: 'sign_in', entityId: null, details: null })])),
    )
    const card = await screen.findByRole('article', { name: 'Signed out' })
    await user.click(within(card).getByRole('button', { name: 'Details' }))
    expect(within(card).getByText('No further details.')).toBeInTheDocument()
    expect(within(card).queryByText('Record')).not.toBeInTheDocument()
  })

  it('shows the record alone when the details are empty', async () => {
    const user = userEvent.setup()
    renderAuditLog('/admin/audit-log', () => json(page([entry(1, { details: null })])))
    const card = await screen.findByRole('article', { name: 'Edited a program' })
    await user.click(within(card).getByRole('button', { name: 'Details' }))
    expect(within(card).getByText('Record').nextElementSibling).toHaveTextContent('Programs #7')
    expect(within(card).queryByText('No further details.')).not.toBeInTheDocument()
  })

  it('shows the raw entry exactly as answered, on request', async () => {
    const user = userEvent.setup()
    renderAuditLog()
    const card = await screen.findByRole('article', { name: 'Edited a program' })
    await user.click(within(card).getByRole('button', { name: 'Details' }))
    const raw = within(card).getByRole('button', { name: 'Show the raw entry' })
    expect(raw).toHaveAttribute('aria-expanded', 'false')
    expect(card.querySelector('pre')).toBeNull()

    await user.click(raw)
    expect(raw).toHaveAttribute('aria-expanded', 'true')
    expect(raw).toHaveAccessibleName('Hide the raw entry')
    const pre = document.getElementById(raw.getAttribute('aria-controls') ?? '')
    expect(pre?.tagName).toBe('PRE')
    expect(JSON.parse(pre?.textContent ?? '')).toStrictEqual(entry(1))

    await user.click(raw)
    expect(card.querySelector('pre')).toBeNull()
  })

  // --- the empty, error and loading states ---

  it('says nothing has been recorded when there are no entries and no filters', async () => {
    renderAuditLog('/admin/audit-log', () => json(page([])))
    expect(await screen.findByText('Nothing has been recorded yet.')).toBeInTheDocument()
    expect(screen.queryByText('No entries match these filters.')).not.toBeInTheDocument()
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('0 entries')
  })

  it('says no entries match when filters find nothing', async () => {
    renderAuditLog('/admin/audit-log?kind=view', () => json(page([])))
    expect(await screen.findByText('No entries match these filters.')).toBeInTheDocument()
    expect(screen.queryByText('Nothing has been recorded yet.')).not.toBeInTheDocument()
  })

  it('shows neither empty message when there are entries', async () => {
    renderAuditLog('/admin/audit-log?kind=change')
    await screen.findByRole('article')
    expect(screen.queryByText('No entries match these filters.')).not.toBeInTheDocument()
    expect(screen.queryByText('Nothing has been recorded yet.')).not.toBeInTheDocument()
    expect(screen.queryByText(/There are no entries on page/)).not.toBeInTheDocument()
  })

  // While a retry runs, the PREVIOUS page stays on screen (placeholder data)
  // — which TanStack reports as success. The heading must not take the retry
  // for a success then: a failure again says "Still couldn't".
  it('a retry over the previous page that fails again: "Still couldn\'t", focus on Try again', async () => {
    const user = userEvent.setup()
    let release: (response: Response) => void = () => {}
    let secondPage = 0
    renderAuditLog('/admin/audit-log', (path) => {
      if (!path.includes('page=2')) return json(page([entry(1)], { total: 40, totalPages: 2 }))
      secondPage += 1
      if (secondPage === 1) return json({ statusCode: 500, message: ['boom'] }, 500)
      return new Promise<Response>((resolve) => (release = resolve))
    })
    await screen.findByRole('article')
    await user.click(screen.getByRole('button', { name: 'Next' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/^Couldn't load the audit log\./)
    await user.click(screen.getByRole('button', { name: 'Try again' }))
    await waitFor(() => expect(secondPage).toBe(2))
    release(json({ statusCode: 500, message: ['boom'] }, 500))
    expect(await screen.findByRole('alert')).toHaveTextContent(/^Still couldn't load the audit log\./)
    expect(screen.getByRole('button', { name: 'Try again' })).toHaveFocus()
  })

  it('says so when it can’t load, and why; a retry that works focuses the heading', async () => {
    const user = userEvent.setup()
    let fail = true
    renderAuditLog('/admin/audit-log', () =>
      fail ? json({ statusCode: 500, message: ['boom'] }, 500) : json(page([entry(1)])),
    )
    expect(await screen.findByRole('alert')).toHaveTextContent(
      /^Couldn't load the audit log\. Something went wrong on our side\. Try again in a moment\.$/,
    )
    expect(screen.queryByText('Loading the audit log…')).not.toBeInTheDocument()
    fail = false
    await user.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByRole('article')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole('heading', { level: 1, name: 'Audit log' })).toHaveFocus())
  })

  it('says it is loading until the first answer', async () => {
    let answer: (response: Response) => void = () => {}
    renderAuditLog('/admin/audit-log', () => new Promise((resolve) => (answer = resolve)))
    await waitFor(() => expectSkeleton('Loading the audit log…'))
    answer(json(page([entry(1)])))
    await screen.findByRole('article')
    expect(screen.queryByText('Loading the audit log…')).not.toBeInTheDocument()
  })

  // --- paging ---

  it('pages forward and back through the address', async () => {
    const user = userEvent.setup()
    renderAuditLog('/admin/audit-log', (path) => {
      const pageNumber = Number(new URLSearchParams(path.split('?')[1]).get('page'))
      return json(page([entry(pageNumber)], { total: 41, page: pageNumber, totalPages: 3 }))
    })
    const pages = await screen.findByRole('navigation', { name: 'Pages' })
    expect(pages).toHaveTextContent('Page 1 of 3')
    expect(within(pages).getByRole('button', { name: 'Previous' })).toBeDisabled()

    await user.click(within(pages).getByRole('button', { name: 'Next' }))
    await waitFor(() => expect(pages).toHaveTextContent('Page 2 of 3'))
    expect(shownAddress()).toBe('/admin/audit-log?page=2')
    expect(logRequests()).toEqual(['/audit-logs?page=1&limit=20', '/audit-logs?page=2&limit=20'])

    await user.click(within(pages).getByRole('button', { name: 'Next' }))
    await waitFor(() => expect(pages).toHaveTextContent('Page 3 of 3'))
    expect(within(pages).getByRole('button', { name: 'Next' })).toBeDisabled()

    await user.click(within(pages).getByRole('button', { name: 'Previous' }))
    await waitFor(() => expect(shownAddress()).toBe('/admin/audit-log?page=2'))
  })

  it('shows no page controls for a single page', async () => {
    renderAuditLog()
    await screen.findByRole('article')
    expect(screen.queryByRole('navigation', { name: 'Pages' })).not.toBeInTheDocument()
  })

  it('offers a way back from a page past the end', async () => {
    const user = userEvent.setup()
    renderAuditLog('/admin/audit-log?kind=view&page=5', (path) =>
      path.includes('page=5')
        ? json(page([], { total: 2, page: 5, totalPages: 1 }))
        : json(page([entry(1), entry(2)])),
    )
    expect(await screen.findByText('There are no entries on page 5.')).toBeInTheDocument()
    expect(screen.queryByText('No entries match these filters.')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Go to page 1' }))
    await screen.findAllByRole('article')
    expect(shownAddress()).toBe('/admin/audit-log?kind=view')
  })

  // --- filters ---

  it('reads its filters from the address', async () => {
    renderAuditLog('/admin/audit-log?kind=view&action=PROGRAM_VIEWED&by=3&about=6&page=2')
    await screen.findByRole('article')
    expect(logRequests()).toEqual([
      '/audit-logs?page=2&limit=20&kind=view&action=PROGRAM_VIEWED&performedBy=3&targetUserId=6',
    ])
    expect(screen.getByRole('radio', { name: 'Views' })).toBeChecked()
    await optionsArrived()
    expect(screen.getByLabelText('Action')).toHaveValue('PROGRAM_VIEWED')
    expect(screen.getByLabelText('Who acted')).toHaveValue('3')
    expect(screen.getByLabelText('About')).toHaveValue('6')
  })

  it('filters by kind, back to page 1, and back to all', async () => {
    const user = userEvent.setup()
    renderAuditLog('/admin/audit-log?page=3', () => json(page([entry(1)], { total: 60, page: 3, totalPages: 3 })))
    await screen.findByRole('article')
    expect(screen.getByRole('radio', { name: 'All' })).toBeChecked()

    await user.click(screen.getByRole('radio', { name: 'Sign-ins' }))
    await waitFor(() => expect(shownAddress()).toBe('/admin/audit-log?kind=sign_in'))
    expect(logRequests().at(-1)).toBe('/audit-logs?page=1&limit=20&kind=sign_in')
    expect(screen.getByRole('radio', { name: 'Sign-ins' })).toBeChecked()

    await user.click(screen.getByRole('radio', { name: 'All' }))
    await waitFor(() => expect(shownAddress()).toBe('/admin/audit-log'))
  })

  // One group of radios: they share ONE name (jsdom wouldn't show a
  // mismatch — compare the names).
  it('makes the kinds one radio group', async () => {
    renderAuditLog()
    await screen.findByRole('article')
    const names = new Set(screen.getAllByRole('radio').map((radio) => radio.getAttribute('name')))
    expect(names.size).toBe(1)
    expect(screen.getAllByRole('radio').map((radio) => radio.closest('label')?.textContent)).toEqual([
      'All',
      'Changes',
      'Views',
      'Sign-ins',
    ])
  })

  it('offers the actions by kind, each group in the order of its words', async () => {
    renderAuditLog()
    await optionsArrived()
    const select = screen.getByLabelText('Action')
    const groups = Array.from(select.querySelectorAll('optgroup')).map((group) => [
      group.label,
      Array.from(group.querySelectorAll('option')).map((option) => option.textContent),
    ])
    expect(groups).toEqual([
      ['Changes', ['Created a clinic', 'Edited a program']],
      ['Views', ['Viewed a program']],
      ['Sign-ins', ['Signed in', 'Signed out']],
    ])
    expect(within(select).getAllByRole('option')[0]).toHaveTextContent('Any action')
  })

  it('offers only the chosen kind’s actions', async () => {
    renderAuditLog('/admin/audit-log?kind=sign_in')
    await optionsArrived()
    const select = screen.getByLabelText('Action')
    expect(Array.from(select.querySelectorAll('optgroup')).map((group) => group.label)).toEqual([
      'Sign-ins',
    ])
  })

  it('filters by action, and clears it with "Any action"', async () => {
    const user = userEvent.setup()
    renderAuditLog('/admin/audit-log?page=2', () => json(page([entry(1)], { total: 30, page: 2, totalPages: 2 })))
    await optionsArrived()
    await user.selectOptions(screen.getByLabelText('Action'), 'Signed out')
    await waitFor(() => expect(shownAddress()).toBe('/admin/audit-log?action=LOGOUT'))
    expect(logRequests().at(-1)).toBe('/audit-logs?page=1&limit=20&action=LOGOUT')

    await user.selectOptions(screen.getByLabelText('Action'), 'Any action')
    await waitFor(() => expect(shownAddress()).toBe('/admin/audit-log'))
  })

  it('keeps the chosen action when choosing its own kind, and drops it for another', async () => {
    const user = userEvent.setup()
    renderAuditLog('/admin/audit-log?action=LOGOUT')
    await optionsArrived()
    await user.click(screen.getByRole('radio', { name: 'Sign-ins' }))
    await waitFor(() => expect(shownAddress()).toBe('/admin/audit-log?kind=sign_in&action=LOGOUT'))

    await user.click(screen.getByRole('radio', { name: 'Views' }))
    await waitFor(() => expect(shownAddress()).toBe('/admin/audit-log?kind=view'))

    // Back to "All": any action is possible again, but none was chosen.
    await user.click(screen.getByRole('radio', { name: 'All' }))
    await waitFor(() => expect(shownAddress()).toBe('/admin/audit-log'))
  })

  it('keeps the chosen action when choosing All', async () => {
    const user = userEvent.setup()
    renderAuditLog('/admin/audit-log?kind=sign_in&action=LOGOUT')
    await optionsArrived()
    await user.click(screen.getByRole('radio', { name: 'All' }))
    await waitFor(() => expect(shownAddress()).toBe('/admin/audit-log?action=LOGOUT'))
  })

  it('still shows an action from the address that the list doesn’t hold', async () => {
    renderAuditLog('/admin/audit-log?action=POST%20%2Fusers%2F6')
    await optionsArrived()
    const select = screen.getByLabelText('Action')
    expect(select).toHaveValue('POST /users/6')
    expect(within(select).getByRole('option', { name: 'POST /users/6' })).toBeInTheDocument()
  })

  it('does not add the chosen action twice when the list holds it', async () => {
    renderAuditLog('/admin/audit-log?action=LOGOUT')
    await optionsArrived()
    expect(within(screen.getByLabelText('Action')).getAllByRole('option', { name: 'Signed out' })).toHaveLength(1)
  })

  it('offers everyone by last name, deactivated accounts marked, for both people filters', async () => {
    renderAuditLog()
    await optionsArrived()
    for (const label of ['Who acted', 'About']) {
      expect(
        within(screen.getByLabelText(label))
          .getAllByRole('option')
          .map((option) => [option.textContent, option.getAttribute('value')]),
      ).toEqual([
        ['Anyone', ''],
        ['Avery Admin', '1'],
        ['Alex Chen', '3'],
        ['Frank Former (deactivated)', '9'],
        ['Pat Lee', '6'],
      ])
    }
  })

  it('sorts people with the same last name by first name', async () => {
    const twoLees = [
      { ...PAT, isActive: true },
      { id: 12, firstName: 'Kim', lastName: 'Lee', isActive: true },
    ]
    renderAuditLog('/admin/audit-log', () => json(page([entry(1)])), twoLees)
    await optionsArrived()
    expect(
      within(screen.getByLabelText('About'))
        .getAllByRole('option')
        .map((option) => option.textContent),
    ).toEqual(['Anyone', 'Kim Lee', 'Pat Lee'])
  })

  it('filters by who acted and by whom it is about', async () => {
    const user = userEvent.setup()
    renderAuditLog()
    await optionsArrived()
    await user.selectOptions(screen.getByLabelText('Who acted'), 'Alex Chen')
    await waitFor(() => expect(shownAddress()).toBe('/admin/audit-log?by=3'))
    await user.selectOptions(screen.getByLabelText('About'), 'Pat Lee')
    await waitFor(() => expect(shownAddress()).toBe('/admin/audit-log?by=3&about=6'))
    expect(logRequests().at(-1)).toBe('/audit-logs?page=1&limit=20&performedBy=3&targetUserId=6')

    await user.selectOptions(screen.getByLabelText('Who acted'), 'Anyone')
    await waitFor(() => expect(shownAddress()).toBe('/admin/audit-log?about=6'))
  })

  it('still shows a person from the address that the list doesn’t hold', async () => {
    renderAuditLog('/admin/audit-log?about=99')
    await optionsArrived()
    const select = screen.getByLabelText('About')
    expect(select).toHaveValue('99')
    expect(within(select).getAllByRole('option')[1]).toHaveTextContent('User #99')
    expect(within(screen.getByLabelText('Who acted')).queryByRole('option', { name: 'User #99' })).not.toBeInTheDocument()
  })

  it('filters by a date range, each end alone too', async () => {
    const user = userEvent.setup()
    renderAuditLog()
    await screen.findByRole('article')
    await user.type(screen.getByLabelText('From'), '2031-03-10')
    await waitFor(() => expect(shownAddress()).toBe('/admin/audit-log?from=2031-03-10'))
    const from = new Date(2031, 2, 10).toISOString()
    expect(logRequests().at(-1)).toBe(`/audit-logs?page=1&limit=20&from=${encodeURIComponent(from)}`)
    expect(screen.getByLabelText('To')).toHaveAttribute('min', '2031-03-10')

    await user.type(screen.getByLabelText('To'), '2031-03-12')
    await waitFor(() => expect(shownAddress()).toBe('/admin/audit-log?from=2031-03-10&to=2031-03-12'))
    const before = new Date(2031, 2, 13).toISOString()
    expect(logRequests().at(-1)).toBe(
      `/audit-logs?page=1&limit=20&from=${encodeURIComponent(from)}&before=${encodeURIComponent(before)}`,
    )
    expect(screen.getByLabelText('From')).toHaveAttribute('max', '2031-03-12')

    await user.clear(screen.getByLabelText('From'))
    await waitFor(() => expect(shownAddress()).toBe('/admin/audit-log?to=2031-03-12'))
  })

  it('refuses a backwards range without asking the server', async () => {
    renderAuditLog('/admin/audit-log?from=2031-03-12&to=2031-03-10')
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The start date must be on or before the end date.',
    )
    await optionsArrived()
    expect(logRequests()).toEqual([])
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(screen.queryByText('Loading the audit log…')).not.toBeInTheDocument()
  })

  // The choice is shown at once (before the address catches up — see
  // useFiltersInAddress.ts), but only while the address is still the one it
  // was made on: Back must bring the previous filters back.
  it('returns to the previous filters with Back', async () => {
    const user = userEvent.setup()
    renderAuditLog('/admin/audit-log?kind=view')
    await screen.findByRole('article')
    await user.click(screen.getByRole('radio', { name: 'Sign-ins' }))
    await waitFor(() => expect(shownAddress()).toBe('/admin/audit-log?kind=sign_in'))
    expect(screen.getByRole('radio', { name: 'Sign-ins' })).toBeChecked()

    await user.click(screen.getByRole('button', { name: 'test: back' }))
    await waitFor(() => expect(shownAddress()).toBe('/admin/audit-log?kind=view'))
    expect(screen.getByRole('radio', { name: 'Views' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'Sign-ins' })).not.toBeChecked()
    expect(logRequests()).toEqual([
      '/audit-logs?page=1&limit=20&kind=view',
      '/audit-logs?page=1&limit=20&kind=sign_in',
    ])
  })

  it('returns to the previous page and filters with Back, twice', async () => {
    const user = userEvent.setup()
    renderAuditLog('/admin/audit-log', (path) => {
      const pageNumber = Number(new URLSearchParams(path.split('?')[1]).get('page'))
      return json(page([entry(pageNumber)], { total: 41, page: pageNumber, totalPages: 3 }))
    })
    await screen.findByRole('navigation', { name: 'Pages' })
    await user.click(screen.getByRole('button', { name: 'Next' }))
    await waitFor(() => expect(shownAddress()).toBe('/admin/audit-log?page=2'))
    await user.click(screen.getByRole('radio', { name: 'Changes' }))
    await waitFor(() => expect(shownAddress()).toBe('/admin/audit-log?kind=change'))

    await user.click(screen.getByRole('button', { name: 'test: back' }))
    await waitFor(() => expect(shownAddress()).toBe('/admin/audit-log?page=2'))
    expect(screen.getByRole('radio', { name: 'All' })).toBeChecked()
    expect(screen.getByRole('navigation', { name: 'Pages' })).toHaveTextContent('Page 2 of 3')

    await user.click(screen.getByRole('button', { name: 'test: back' }))
    await waitFor(() => expect(shownAddress()).toBe('/admin/audit-log'))
    expect(screen.getByRole('navigation', { name: 'Pages' })).toHaveTextContent('Page 1 of 3')
  })

  it('clears every filter at once, and offers it only when there is one', async () => {
    const user = userEvent.setup()
    renderAuditLog('/admin/audit-log?kind=view&by=3&from=2031-03-10&page=2')
    await screen.findByRole('article')
    await user.click(screen.getByRole('button', { name: 'Clear filters' }))
    await waitFor(() => expect(shownAddress()).toBe('/admin/audit-log'))
    expect(screen.queryByRole('button', { name: 'Clear filters' })).not.toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'All' })).toBeChecked()
  })

  it('does not offer to clear filters on a page alone', async () => {
    renderAuditLog('/admin/audit-log?page=2', () => json(page([entry(1)], { total: 30, page: 2, totalPages: 2 })))
    await screen.findByRole('article')
    expect(screen.queryByRole('button', { name: 'Clear filters' })).not.toBeInTheDocument()
  })

  it('keeps the previous results, dimmed and busy, while the next ones load', async () => {
    const user = userEvent.setup()
    let answerNext: (response: Response) => void = () => {}
    renderAuditLog('/admin/audit-log', (path) =>
      path.includes('kind=view')
        ? new Promise((resolve) => (answerNext = resolve))
        : json(page([entry(1)])),
    )
    await screen.findByRole('article', { name: 'Edited a program' })
    expect(screen.getByRole('list')).toHaveAttribute('aria-busy', 'false')

    await user.click(screen.getByRole('radio', { name: 'Views' }))
    await waitFor(() => expect(screen.getByRole('list')).toHaveAttribute('aria-busy', 'true'))
    expect(screen.getByRole('list')).toHaveClass('opacity-60')
    expect(screen.getByRole('article', { name: 'Edited a program' })).toBeInTheDocument()

    answerNext(json(page([entry(2, { action: 'PROGRAM_VIEWED', kind: 'view' })])))
    await screen.findByRole('article', { name: 'Viewed a program' })
    expect(screen.getByRole('list')).toHaveAttribute('aria-busy', 'false')
    expect(screen.getByRole('list')).not.toHaveClass('opacity-60')
    expect(entryCards()).toHaveLength(1)
  })
})