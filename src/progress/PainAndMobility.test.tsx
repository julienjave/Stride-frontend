import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { formatShortDate } from '@/common/calendarDate'
import { A, B, KNEE, TODAY, apiError, json, session, urlOf } from '@/sessions/testData'
import type { ProgramSession } from './api'
import { PainAndMobility } from './PainAndMobility'
import type { ScoreViewer } from './scoreText'

const fetchMock = vi.fn<typeof fetch>()
vi.stubGlobal('fetch', fetchMock)

// A session as the LIST gives it: no checklist. Completed, with all three
// scores, unless told otherwise.
function listed(id: number, localDate: string, fields: Partial<ProgramSession> = {}): ProgramSession {
  const { exercises: _exercises, ...row } = session({
    id,
    localDate,
    status: 'completed',
    painBefore: 5,
    painAfter: 3,
    mobilityAfter: 6,
    ...fields,
  })
  return row
}

let answer: () => Response | Promise<Response>

beforeEach(() => {
  fetchMock.mockReset()
  answer = () => json([])
  fetchMock.mockImplementation((input) => {
    const url = urlOf(input)
    if (url.endsWith('/assigned-programs/12/sessions')) return Promise.resolve(answer())
    return Promise.reject(new Error(`unexpected request: ${url}`))
  })
})

function renderSection({
  viewer = 'patient',
  headingLevel = 3,
  program = KNEE,
}: { viewer?: ScoreViewer; headingLevel?: 2 | 3; program?: typeof KNEE } = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 30_000 } },
  })
  render(
    <QueryClientProvider client={queryClient}>
      <PainAndMobility program={program} today={TODAY} viewer={viewer} headingLevel={headingLevel} />
    </QueryClientProvider>,
  )
}

const section = () => screen.getByRole('region', { name: 'Pain and mobility' })
const requests = () => fetchMock.mock.calls.map(([input]) => new URL(urlOf(input), 'http://x').pathname)

describe('PainAndMobility', () => {
  it('reads the program’s sessions once, and draws both charts from them', async () => {
    answer = () =>
      json([
        listed(3, '2031-06-11', { painBefore: 4, painAfter: 2, mobilityAfter: 7, workoutId: B }),
        listed(2, '2031-06-09', { painBefore: 6, painAfter: 4, mobilityAfter: 5 }),
      ])
    renderSection()
    expect(screen.getByText('Loading pain and mobility…')).toBeInTheDocument()
    expect(await screen.findByRole('group', { name: 'Pain chart' })).toHaveAccessibleDescription(
      `2 sessions with a pain score. Latest (${formatShortDate('2031-06-11')}): 4 before, 2 after. Tap or point at the chart to read a session — or focus it and use the arrow keys.`,
    )
    expect(screen.getByRole('group', { name: 'Mobility chart' })).toHaveAccessibleDescription(
      new RegExp(`^2 sessions with a mobility score\\. Latest \\(${formatShortDate('2031-06-11')}\\): 7\\.`),
    )
    expect(screen.getByText('0 = no pain, 10 = worst pain')).toBeInTheDocument()
    expect(screen.getByText('0 = could hardly move, 10 = moved freely')).toBeInTheDocument()
    expect(requests()).toStrictEqual(['/assigned-programs/12/sessions'])
  })

  // The two charts are in time order (oldest first), whatever the list's
  // order (newest first): the pain chart's line goes 2 → 3.
  it('draws the sessions oldest first', async () => {
    answer = () => json([listed(3, '2031-06-11'), listed(2, '2031-06-09')])
    renderSection()
    const chart = await screen.findByRole('group', { name: 'Pain chart' })
    expect(chart.querySelector('[data-series="painAfter"] polyline')).toHaveAttribute('data-run', '2 3')
  })

  it('names its sections at the level it is given', async () => {
    answer = () => json([listed(2, '2031-06-09')])
    renderSection({ headingLevel: 2 })
    await screen.findByRole('group', { name: 'Pain chart' })
    expect(screen.getByRole('heading', { level: 2, name: 'Pain and mobility' })).toBeVisible()
    expect(screen.getByRole('heading', { level: 3, name: 'Pain' })).toBeVisible()
    expect(screen.getByRole('heading', { level: 3, name: 'Mobility' })).toBeVisible()
  })

  it('names its sections one level down inside another section', async () => {
    answer = () => json([listed(2, '2031-06-09')])
    renderSection({ headingLevel: 3 })
    await screen.findByRole('group', { name: 'Pain chart' })
    expect(screen.getByRole('heading', { level: 3, name: 'Pain and mobility' })).toBeVisible()
    expect(screen.getByRole('heading', { level: 4, name: 'Pain' })).toBeVisible()
    expect(screen.getByRole('heading', { level: 4, name: 'Mobility' })).toBeVisible()
  })

  it('says so when the scores can’t be loaded', async () => {
    answer = () => apiError(500, 'Boom')
    renderSection()
    expect(
      await screen.findByText("Couldn't load the pain and mobility scores. Try refreshing."),
    ).toBeInTheDocument()
  })

  describe('with nothing to draw', () => {
    it('tells the patient the scores come with the first session', async () => {
      renderSection()
      expect(
        await screen.findByText('Your pain and mobility scores will show here after your first session.'),
      ).toBeInTheDocument()
      expect(screen.queryByRole('heading', { name: 'Pain' })).toBe(null)
      expect(screen.queryByRole('group')).toBe(null)
    })

    it('tells the care team there is no session yet', async () => {
      renderSection({ viewer: 'practitioner' })
      expect(await screen.findByText('No sessions yet.')).toBeInTheDocument()
    })

    it('draws nothing for a program that hasn’t started', async () => {
      renderSection({ program: { ...KNEE, startDate: '2031-06-13' } })
      expect(
        await screen.findByText('Your pain and mobility scores will show here after your first session.'),
      ).toBeInTheDocument()
    })

    // Sessions without a single pain answer: the pain chart's sentence,
    // never a nudge; the mobility chart still drawn. Each empty sentence
    // only where it belongs.
    it('says a chart has no scores while the other is drawn — for the patient', async () => {
      answer = () => json([listed(2, '2031-06-09', { painBefore: null, painAfter: null })])
      renderSection()
      expect(
        await screen.findByText(
          'No pain scores yet. Each session asks how much it hurts before and after — answering is always optional.',
        ),
      ).toBeInTheDocument()
      expect(screen.queryByRole('group', { name: 'Pain chart' })).toBe(null)
      expect(screen.getByRole('group', { name: 'Mobility chart' })).toBeInTheDocument()
      expect(screen.queryByText(/^No mobility scores/)).toBe(null)
      expect(screen.queryByText(/after your first session/)).toBe(null)
    })

    it('says a chart has no scores while the other is drawn — for the care team', async () => {
      answer = () => json([listed(2, '2031-06-09', { mobilityAfter: null })])
      renderSection({ viewer: 'practitioner' })
      expect(
        await screen.findByText("No mobility scores yet: the patient hasn't recorded any in this program."),
      ).toBeInTheDocument()
      expect(screen.queryByRole('group', { name: 'Mobility chart' })).toBe(null)
      expect(screen.getByRole('group', { name: 'Pain chart' })).toBeInTheDocument()
      expect(screen.queryByText(/^No pain scores/)).toBe(null)
      expect(screen.queryByText('No sessions yet.')).toBe(null)
    })

    // A skip for illness asks nothing: no chart, no table — but the program
    // HAS a session, so it's "no scores", not "no sessions".
    it('counts a session that answered nothing as no scores', async () => {
      answer = () =>
        json([
          listed(2, '2031-06-09', {
            status: 'skipped',
            endReason: 'illness',
            painBefore: null,
            painAfter: null,
            mobilityAfter: null,
          }),
        ])
      renderSection()
      expect(await screen.findByText(/^No pain scores yet\./)).toBeInTheDocument()
      expect(screen.getByText(/^No mobility scores yet\./)).toBeInTheDocument()
      expect(screen.queryByText('Show the scores as a table')).toBe(null)
    })
  })

  describe('the legend', () => {
    it('names both pain lines', async () => {
      answer = () => json([listed(2, '2031-06-09')])
      renderSection()
      await screen.findByRole('group', { name: 'Pain chart' })
      expect(within(section()).getByText('Before the session')).toBeInTheDocument()
      expect(within(section()).getByText('After the session')).toBeInTheDocument()
      expect(within(section()).queryByText('Session not completed')).toBe(null)
    })

    // A stopped session that answered pain draws hollow pain dots — and
    // answered no mobility, so the mobility chart has nothing to explain.
    it('explains the hollow dot only in a chart that draws one', async () => {
      answer = () =>
        json([
          listed(3, '2031-06-10', { status: 'incomplete', endReason: 'pain', painAfter: 7, mobilityAfter: null }),
          listed(2, '2031-06-09'),
        ])
      renderSection()
      await screen.findByRole('group', { name: 'Pain chart' })
      expect(within(section()).getAllByText('Session not completed')).toHaveLength(1)
      const pain = screen.getByRole('heading', { name: 'Pain' }).parentElement!
      expect(within(pain).getByText('Session not completed')).toBeInTheDocument()
    })

    it('explains the hollow dot in the mobility chart when it draws one', async () => {
      answer = () =>
        json([
          listed(3, '2031-06-10', {
            status: 'incomplete',
            endReason: 'no_time',
            painBefore: null,
            painAfter: null,
            mobilityAfter: 4,
          }),
          listed(2, '2031-06-09'),
        ])
      renderSection()
      await screen.findByRole('group', { name: 'Mobility chart' })
      const mobility = screen.getByRole('heading', { name: 'Mobility' }).parentElement!
      expect(within(mobility).getByText('Session not completed')).toBeInTheDocument()
      // A single series: no series legend — the heading names it (and the
      // pain chart's two names don't belong here).
      expect(within(mobility).queryByText('Before the session')).toBe(null)
      expect(within(mobility).queryByText('After the session')).toBe(null)
      const pain = screen.getByRole('heading', { name: 'Pain' }).parentElement!
      expect(within(pain).queryByText('Session not completed')).toBe(null)
    })
  })

  describe('the table', () => {
    // Newest first; every value as text; "Not answered" (asked, blank) told
    // from "—" (never asked); how a session ended; never a session that
    // was asked nothing.
    it('lists every scored session, newest first', async () => {
      const user = userEvent.setup()
      answer = () =>
        json([
          listed(5, '2031-06-11', { status: 'skipped', endReason: 'pain', painBefore: 8, painAfter: null, mobilityAfter: null }),
          listed(4, '2031-06-10', {
            status: 'skipped',
            endReason: 'illness',
            painBefore: null,
            painAfter: null,
            mobilityAfter: null,
          }),
          listed(3, '2031-06-09', { painAfter: null, workoutId: B }),
          listed(2, '2031-06-06', { painBefore: 6, painAfter: 4, mobilityAfter: 0 }),
        ])
      renderSection()
      await user.click(await screen.findByText('Show the scores as a table'))
      const rows = within(screen.getByRole('table'))
        .getAllByRole('row')
        .map((row) =>
          within(row)
            .getAllByRole(row.querySelector('th[scope="col"]') ? 'columnheader' : 'cell')
            .map((cell) => cell.textContent),
        )
      expect(rows[0]).toEqual(['Session', 'Pain before', 'Pain after', 'Mobility'])
      expect(rows.slice(1)).toEqual([['8', '—', '—'], ['5', 'Not answered', '6'], ['6', '4', '0']])
      expect(
        within(screen.getByRole('table'))
          .getAllByRole('rowheader')
          .map((cell) => cell.textContent),
      ).toEqual([
        `${formatShortDate('2031-06-11')}A · Mobility · Skipped (pain)`,
        `${formatShortDate('2031-06-09')}B · Strength`,
        `${formatShortDate('2031-06-06')}A · Mobility`,
      ])
    })

    it('leaves the workout out when the program has one', async () => {
      const user = userEvent.setup()
      answer = () => json([listed(2, '2031-06-06', { workoutId: A })])
      renderSection({ program: { ...KNEE, workouts: [KNEE.workouts[0]] } })
      await user.click(await screen.findByText('Show the scores as a table'))
      expect(
        within(screen.getByRole('table'))
          .getAllByRole('rowheader')
          .map((cell) => cell.textContent),
      ).toEqual([formatShortDate('2031-06-06')])
    })
  })

  // Twelve weeks by default; the whole program on request — one choice for
  // both charts and the table.
  describe('a program longer than 12 weeks', () => {
    // Started 1 January 2031: 163 days to Thursday 12 June. The last 12
    // weeks start on 21 March.
    const LONG = { ...KNEE, startDate: '2031-01-01' }

    it('shows the last 12 weeks, and the whole program on request', async () => {
      const user = userEvent.setup()
      answer = () =>
        json([
          listed(3, '2031-06-09', { painBefore: null, painAfter: null, mobilityAfter: 6 }),
          listed(2, '2031-02-03', { painBefore: 7, painAfter: 6, mobilityAfter: null }),
        ])
      renderSection({ program: LONG })
      expect(
        await screen.findByText(
          'No pain scores in the last 12 weeks. Show the whole program to see earlier ones.',
        ),
      ).toBeInTheDocument()
      const mobility = screen.getByRole('group', { name: 'Mobility chart' })
      expect(mobility.querySelector('[data-tick]')).toHaveAttribute('data-tick', '2031-03-21')

      const toggle = screen.getByRole('button', { name: 'Show the whole program' })
      expect(toggle).toHaveAttribute('aria-pressed', 'false')
      await user.click(toggle)
      expect(screen.getByRole('group', { name: 'Pain chart' })).toBeInTheDocument()
      expect(
        screen.getByRole('group', { name: 'Mobility chart' }).querySelector('[data-tick]'),
      ).toHaveAttribute('data-tick', '2031-01-01')
      expect(screen.getByRole('button', { name: 'Show the last 12 weeks' })).toHaveAttribute(
        'aria-pressed',
        'true',
      )
      // The table follows the same choice.
      await user.click(screen.getByText('Show the scores as a table'))
      expect(within(screen.getByRole('table')).getAllByRole('rowheader')).toHaveLength(2)
      await user.click(screen.getByRole('button', { name: 'Show the last 12 weeks' }))
      expect(within(screen.getByRole('table')).getAllByRole('rowheader')).toHaveLength(1)
      // Switching asked nothing more: one answer, two views.
      expect(requests()).toHaveLength(1)
    })

    // No answer anywhere in the program: the plain "none yet", not "show
    // the whole program".
    it('says "none yet" when the whole program has none either', async () => {
      answer = () => json([listed(3, '2031-06-09', { painBefore: null, painAfter: null })])
      renderSection({ program: LONG, viewer: 'practitioner' })
      expect(
        await screen.findByText("No pain scores yet: the patient hasn't recorded any in this program."),
      ).toBeInTheDocument()
    })

    it('offers no choice for a program of 12 weeks or less', async () => {
      answer = () => json([listed(2, '2031-06-09')])
      renderSection({ program: { ...KNEE, startDate: '2031-03-21' } })
      await screen.findByRole('group', { name: 'Pain chart' })
      expect(screen.queryByRole('button', { name: /^Show the/ })).toBe(null)
    })
  })
})