import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
import { AdminHomePage } from './AdminHomePage'
import { currentUserQueryKey } from '@/auth/useCurrentUser'
import { formatEntryMoment } from '@/audit-log/auditWording'
import type { AdminMetrics } from './home/admin/api'
import type { AuditLogEntry, AuditLogPage } from '@/audit-log/types'
import { expectSkeleton } from '@/common/loadingAssertions'

const PHOTO_URL = 'https://storage.example.com/signed/avatars/1/me.jpg'

// The page asks for two things (decisions §17): GET /admin/metrics and the
// newest changes of the audit log. fetchMock answers each by its address;
// `answers` lets a test replace one answer (an error, an empty list).
const fetchMock = vi.fn<typeof fetch>()
vi.stubGlobal('fetch', fetchMock)

const METRICS: AdminMetrics = {
  accounts: { admins: 2, practitioners: 4, patients: 7, deactivated: 3 },
  clinics: { active: 2, deactivated: 1 },
  pendingInvitations: 5,
  needsAttention: {
    patientsWithoutCareTeam: {
      total: 8,
      first: [
        { id: 11, firstName: 'Gus', lastName: 'Adams' },
        { id: 12, firstName: 'Fay', lastName: 'Baker' },
        { id: 13, firstName: 'Joe', lastName: 'Kent' },
        { id: 14, firstName: 'Kim', lastName: 'Lee' },
        { id: 15, firstName: 'Hal', lastName: 'Moreau' },
      ],
    },
    practitionersWithoutClinic: {
      total: 1,
      first: [{ id: 21, firstName: 'Rory', lastName: 'Diaz' }],
    },
    invitationsToSendAgain: {
      total: 2,
      first: [
        { id: 31, firstName: 'Lena', lastName: 'Late' },
        { id: 32, firstName: 'Stu', lastName: 'Waiting' },
      ],
    },
  },
}

const NOBODY = { total: 0, first: [] }

function entry(id: number, overrides: Partial<AuditLogEntry> = {}): AuditLogEntry {
  return {
    id,
    action: 'USER_CREATED',
    kind: 'change',
    entityType: 'users',
    area: 'Accounts',
    entityId: 40 + id,
    details: null,
    detailsWithheld: false,
    createdAt: '2031-03-10T13:00:00.000Z',
    performer: { id: 1, firstName: 'Ada', lastName: 'Min' },
    target: { id: 40 + id, firstName: 'Pat', lastName: 'Ient' },
    ...overrides,
  }
}

function auditPage(data: AuditLogEntry[]): AuditLogPage {
  return { data, meta: { total: data.length, page: 1, limit: 5, totalPages: 1 } }
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

let answers: { metrics: () => Response; activity: () => Response }

// Every request as "METHOD path?search", for literal assertions. `input as
// string`: apiRequest always calls fetch with a string address (the shared
// convention of these tests).
function requests() {
  return fetchMock.mock.calls.map(([input, init]) => {
    const url = new URL(input as string)
    return `${init?.method ?? 'GET'} ${url.pathname}${url.search}`
  })
}

// Seeds the logged-in user into the cache, the way the app's /auth/me
// bootstrap would, so useCurrentUser() finds it without a request.
function renderWithUser(avatarUrl: string | null = null) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 30_000 } },
  })
  queryClient.setQueryData(currentUserQueryKey, {
    id: 1,
    firstName: 'Ada',
    lastName: 'Min',
    avatarUrl,
    activeRole: 'admin',
  })
  return render(
    <QueryClientProvider client={queryClient}>
      {/* The shortcuts and the sections' links are react-router <Link>s,
          which need a router. */}
      <MemoryRouter>
        <AdminHomePage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const metricsSection = () => screen.getByRole('region', { name: 'Metrics' })
const activitySection = () => screen.getByRole('region', { name: 'Recent activity' })

// Each tile as [label, number], in order — compared whole, so a missing,
// extra, renamed or reordered tile fails.
function tiles() {
  const labels = within(metricsSection()).getAllByRole('term')
  const values = within(metricsSection()).getAllByRole('definition')
  return labels.map((label, i) => [label.textContent, values[i].textContent])
}

describe('AdminHomePage', () => {
  beforeEach(() => {
    answers = {
      metrics: () => json(METRICS),
      activity: () => json(auditPage([])),
    }
    fetchMock.mockReset()
    fetchMock.mockImplementation((input) => {
      const url = new URL(input as string)
      if (url.pathname === '/admin/metrics') return Promise.resolve(answers.metrics())
      if (url.pathname === '/audit-logs') return Promise.resolve(answers.activity())
      return Promise.reject(new Error(`unexpected request ${url.pathname}`))
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('greets the admin by first name, as the page heading, with their initials', () => {
    renderWithUser()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Hello Ada,')
    expect(screen.getByText('AM')).toBeInTheDocument()
  })

  it('shows their photo when they have one', () => {
    renderWithUser(PHOTO_URL)
    // UserAvatar is aria-hidden (the greeting already names the person),
    // so its <img> is looked up in the DOM rather than by role.
    expect(document.querySelector('img')).toHaveAttribute('src', PHOTO_URL)
  })

  it("shows today's date and time", () => {
    // A fixed "now", so the Today slot shows a known date and time.
    // shouldAdvanceTime: the sections' requests still settle (their
    // promises need the clock to move).
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.setSystemTime(new Date('2026-03-10T14:05:00'))
    renderWithUser()
    // The parts we control, not the exact string — Intl output depends on
    // the test runner's locale (e.g. "2:05 PM" vs "14:05").
    expect(screen.getByText(/Tuesday/)).toBeInTheDocument()
    expect(screen.getByText(/March/)).toBeInTheDocument()
    expect(screen.getByText(/(2|14):05/)).toBeInTheDocument()
  })

  it('has nothing "Coming soon" any more', async () => {
    renderWithUser()
    await within(metricsSection()).findByText('Needs attention')
    expect(screen.queryByText('Coming soon')).not.toBeInTheDocument()
  })

  it('links to Clinics and Users, in that order', () => {
    renderWithUser()
    // Scoped to the page's own landmark and compared in full (name + href,
    // in order), so a missing, extra or reordered link fails.
    const shortcuts = screen.getByRole('navigation', { name: 'Shortcuts' })
    expect(
      within(shortcuts)
        .getAllByRole('link')
        .map((link) => [link.textContent, link.getAttribute('href')]),
    ).toEqual([
      ['Clinics', '/admin/clinics'],
      ['Users', '/admin/users'],
    ])
  })

  it('puts the sections under the shortcuts: Metrics, then Recent activity', () => {
    renderWithUser()
    // The page's landmarks in document order, by their accessible names.
    const parts = [
      screen.getByRole('navigation', { name: 'Shortcuts' }),
      metricsSection(),
      activitySection(),
    ]
    for (let i = 1; i < parts.length; i++) {
      // compareDocumentPosition: FOLLOWING = the argument comes after.
      expect(parts[i - 1].compareDocumentPosition(parts[i]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    }
  })

  it('asks for the metrics and the five newest changes — once each', async () => {
    renderWithUser()
    await within(metricsSection()).findByText('Needs attention')
    await within(activitySection()).findByText('No changes recorded yet.')
    expect(requests().sort()).toEqual([
      'GET /admin/metrics',
      'GET /audit-logs?page=1&limit=5&kind=change',
    ])
  })

  describe('Metrics', () => {
    it('says it is loading until the numbers arrive', async () => {
      renderWithUser()
      expectSkeleton('Loading the metrics…', metricsSection())
      await within(metricsSection()).findByText('Needs attention')
      expect(within(metricsSection()).queryByText('Loading the metrics…')).not.toBeInTheDocument()
    })

    it('shows each number with its label, in order', async () => {
      renderWithUser()
      await within(metricsSection()).findByText('Needs attention')
      expect(tiles()).toEqual([
        ['Practitioners', '4'],
        ['Patients', '7'],
        ['Admins', '2'],
        ['Clinics', '2'],
        ['Invitations waiting', '5'],
      ])
      expect(
        within(metricsSection()).getByText(
          'Not counted above: 3 deactivated accounts and 1 deactivated clinic.',
        ),
      ).toBeInTheDocument()
    })

    it('says nothing about deactivated ones when there are none', async () => {
      answers.metrics = () =>
        json({
          ...METRICS,
          accounts: { ...METRICS.accounts, deactivated: 0 },
          clinics: { active: 2, deactivated: 0 },
        })
      renderWithUser()
      await within(metricsSection()).findByText('Needs attention')
      expect(within(metricsSection()).queryByText(/Not counted above/)).not.toBeInTheDocument()
    })

    it('lists who needs attention, each linking to their user page, and how many more', async () => {
      renderWithUser()
      const patients = await within(metricsSection()).findByRole('list', {
        name: 'Patients without a care team',
      })
      expect(
        within(patients)
          .getAllByRole('link')
          .map((link) => [link.textContent, link.getAttribute('href')]),
      ).toEqual([
        ['Gus Adams', '/admin/users/11'],
        ['Fay Baker', '/admin/users/12'],
        ['Joe Kent', '/admin/users/13'],
        ['Kim Lee', '/admin/users/14'],
        ['Hal Moreau', '/admin/users/15'],
      ])
      // The group's title and "and 3 more" lead to the users list filtered
      // to the group (every account, continuing where these names stop).
      expect(
        within(metricsSection()).getByRole('link', { name: 'Patients without a care team · 8' }),
      ).toHaveAttribute('href', '/admin/users?attention=patients-without-care-team')
      expect(within(metricsSection()).getByRole('link', { name: 'and 3 more' })).toHaveAttribute(
        'href',
        '/admin/users?attention=patients-without-care-team',
      )

      const practitioners = within(metricsSection()).getByRole('list', {
        name: 'Practitioners without a clinic',
      })
      expect(
        within(practitioners)
          .getAllByRole('link')
          .map((link) => [link.textContent, link.getAttribute('href')]),
      ).toEqual([['Rory Diaz', '/admin/users/21']])
      expect(
        within(metricsSection()).getByRole('link', { name: 'Practitioners without a clinic · 1' }),
      ).toHaveAttribute('href', '/admin/users?attention=practitioners-without-clinic')

      // The third group (2026-10-25), last — the fix is on each user page.
      const invitations = within(metricsSection()).getByRole('list', {
        name: 'Invitations to send again',
      })
      expect(
        within(invitations)
          .getAllByRole('link')
          .map((link) => [link.textContent, link.getAttribute('href')]),
      ).toEqual([
        ['Lena Late', '/admin/users/31'],
        ['Stu Waiting', '/admin/users/32'],
      ])
      expect(
        within(metricsSection()).getByRole('link', { name: 'Invitations to send again · 2' }),
      ).toHaveAttribute('href', '/admin/users?attention=invitations-to-send-again')
      expect(
        within(metricsSection())
          .getAllByRole('list')
          .map((list) => list.getAttribute('aria-label'))
          .filter((label) => label !== null),
      ).toEqual([
        'Patients without a care team',
        'Practitioners without a clinic',
        'Invitations to send again',
      ])
      // Everyone in that group is listed: no "more" line for it (the one
      // "more" line is the patients').
      expect(within(metricsSection()).getAllByText(/^and \d+ more$/)).toHaveLength(1)
      expect(within(metricsSection()).queryByText(/^Nothing needs attention/)).not.toBeInTheDocument()
    })

    it('leaves out a group with nobody in it', async () => {
      answers.metrics = () =>
        json({
          ...METRICS,
          needsAttention: { ...METRICS.needsAttention, practitionersWithoutClinic: NOBODY },
        })
      renderWithUser()
      await within(metricsSection()).findByRole('list', { name: 'Patients without a care team' })
      expect(
        within(metricsSection()).queryByRole('list', { name: 'Practitioners without a clinic' }),
      ).not.toBeInTheDocument()
      expect(within(metricsSection()).queryByText(/Practitioners without a clinic/)).not.toBeInTheDocument()
      expect(within(metricsSection()).queryByText(/^Nothing needs attention/)).not.toBeInTheDocument()
    })

    it('says so in one sentence when nothing needs attention', async () => {
      answers.metrics = () =>
        json({
          ...METRICS,
          needsAttention: {
            patientsWithoutCareTeam: NOBODY,
            practitionersWithoutClinic: NOBODY,
            invitationsToSendAgain: NOBODY,
          },
        })
      renderWithUser()
      expect(
        await within(metricsSection()).findByText(
          'Nothing needs attention: every patient has a care team, every practitioner belongs to a clinic, and no invitation needs sending again.',
        ),
      ).toBeInTheDocument()
      expect(within(metricsSection()).queryAllByRole('list')).toHaveLength(0)
    })

    it('offers "Try again" when the numbers fail to load, and shows them once they do', async () => {
      const user = userEvent.setup()
      answers.metrics = () => json({ statusCode: 500, message: ['Boom'] }, 500)
      renderWithUser()
      expect(await within(metricsSection()).findByRole('alert')).toHaveTextContent(
        /^Couldn't load the metrics\. Something went wrong on our side\. Try again in a moment\.$/,
      )
      expect(within(metricsSection()).queryAllByRole('term')).toHaveLength(0)

      answers.metrics = () => json(METRICS)
      await user.click(within(metricsSection()).getByRole('button', { name: 'Try again' }))
      await within(metricsSection()).findByText('Needs attention')
      expect(tiles()).toHaveLength(5)
      // Focus on the section's heading, where the numbers came back.
      await waitFor(() =>
        expect(within(metricsSection()).getByRole('heading', { name: 'Metrics' })).toHaveFocus(),
      )
      // Only the failed request was asked again: the activity once, the
      // metrics twice.
      expect(requests().filter((r) => r === 'GET /admin/metrics')).toHaveLength(2)
      expect(requests().filter((r) => r.startsWith('GET /audit-logs'))).toHaveLength(1)
    })
  })

  describe('Recent activity', () => {
    it('lists the newest changes in the audit log\'s words: what, who → about whom, when', async () => {
      answers.activity = () =>
        json(
          auditPage([
            entry(1),
            entry(2, {
              action: 'CLINIC_CREATED',
              entityType: 'clinics',
              area: 'Clinics',
              target: null,
              createdAt: '2031-03-09T08:30:00.000Z',
            }),
          ]),
        )
      renderWithUser()
      const list = await within(activitySection()).findByRole('list', { name: 'Recent activity' })
      const rows = within(list).getAllByRole('listitem')
      expect(rows.map((row) => row.textContent)).toEqual([
        `Created an accountAda Min →about Pat Ient${formatEntryMoment('2031-03-10T13:00:00.000Z')}`,
        `Created a clinicAda Min${formatEntryMoment('2031-03-09T08:30:00.000Z')}`,
      ])
      expect(within(rows[0]).getByText(formatEntryMoment('2031-03-10T13:00:00.000Z'))).toHaveAttribute(
        'dateTime',
        '2031-03-10T13:00:00.000Z',
      )
    })

    it('names one person when the change is about the person who made it', async () => {
      answers.activity = () =>
        json(
          auditPage([
            entry(3, {
              action: 'PASSWORD_CHANGED',
              target: { id: 1, firstName: 'Ada', lastName: 'Min' },
            }),
          ]),
        )
      renderWithUser()
      const list = await within(activitySection()).findByRole('list', { name: 'Recent activity' })
      expect(within(list).getByRole('listitem').textContent).toBe(
        `Changed a passwordAda Min${formatEntryMoment('2031-03-10T13:00:00.000Z')}`,
      )
    })

    it('says so when there are no changes yet', async () => {
      renderWithUser()
      expect(await within(activitySection()).findByText('No changes recorded yet.')).toBeInTheDocument()
      expect(within(activitySection()).queryByRole('list')).not.toBeInTheDocument()
      expect(within(activitySection()).queryByText('Loading recent activity…')).not.toBeInTheDocument()
    })

    it('does not say "no changes" while there are some', async () => {
      answers.activity = () => json(auditPage([entry(1)]))
      renderWithUser()
      await within(activitySection()).findByRole('list', { name: 'Recent activity' })
      expect(within(activitySection()).queryByText('No changes recorded yet.')).not.toBeInTheDocument()
    })

    it('says it is loading until the changes arrive', async () => {
      renderWithUser()
      expectSkeleton('Loading recent activity…', activitySection())
      await within(activitySection()).findByText('No changes recorded yet.')
    })

    it('links to the audit log filtered to changes — even when the summary failed', async () => {
      answers.activity = () => json({ statusCode: 500, message: ['Boom'] }, 500)
      renderWithUser()
      expect(await within(activitySection()).findByRole('alert')).toHaveTextContent(
        /^Couldn't load recent activity\. Something went wrong on our side\. Try again in a moment\.$/,
      )
      expect(within(activitySection()).getByRole('button', { name: 'Try again' })).toBeInTheDocument()
      expect(within(activitySection()).getByRole('link', { name: 'See all changes' })).toHaveAttribute(
        'href',
        '/admin/audit-log?kind=change',
      )
    })

    it('a "Try again" of the activity that works: focus on its heading', async () => {
      const user = userEvent.setup()
      const good = answers.activity
      answers.activity = () => json({ statusCode: 500, message: ['Boom'] }, 500)
      renderWithUser()
      await within(activitySection()).findByRole('alert')
      answers.activity = good
      await user.click(within(activitySection()).getByRole('button', { name: 'Try again' }))
      await waitFor(() =>
        expect(within(activitySection()).getByRole('heading', { name: 'Recent activity' })).toHaveFocus(),
      )
    })
  })
})