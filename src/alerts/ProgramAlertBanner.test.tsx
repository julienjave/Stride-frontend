import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { apiError, json, urlOf } from '@/sessions/testData'
import { ProgramAlertBanner } from './ProgramAlertBanner'
import { useAlerts } from './useAlerts'
import { attendanceAlert, sessionAlert } from './testData'

// The program page's "For review" banner (2026-10-19), against a simulated
// server: GET /alerts (the practitioner's list) and the review.
const fetchMock = vi.fn<typeof fetch>()
vi.stubGlobal('fetch', fetchMock)

const TODAY = '2031-06-12'
let alerts: () => Response
let reviewAnswer: () => Promise<Response>

beforeEach(() => {
  fetchMock.mockReset()
  alerts = () => json([])
  reviewAnswer = () =>
    Promise.resolve(json({ missedSince: '2031-05-26', inactiveSince: null, reviewedAt: '2031-06-12T09:00:00.000Z' }))
  fetchMock.mockImplementation((input, init) => {
    const url = new URL(urlOf(input))
    if ((init?.method ?? 'GET') === 'GET' && url.pathname.endsWith('/alerts')) return Promise.resolve(alerts())
    if (init?.method === 'POST' && url.pathname.endsWith('/alerts/programs/20/review')) return reviewAnswer()
    return Promise.reject(new Error(`unexpected request: ${url.href}`))
  })
})

// Reads the SAME cached list as the banner and says when it has arrived
// (or failed): a test asserting that the banner shows NOTHING waits for
// this first — otherwise it would pass before the answer even rendered.
function ListSettled() {
  const alerts = useAlerts(TODAY)
  return alerts.isSuccess || alerts.isError ? <p>list settled</p> : null
}

function renderBanner(programId = 20) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 30_000 } },
  })
  render(
    <QueryClientProvider client={queryClient}>
      <ProgramAlertBanner programId={programId} today={TODAY} />
      <ListSettled />
    </QueryClientProvider>,
  )
}

function requests() {
  return fetchMock.mock.calls.map(([input, init]) => {
    const url = new URL(urlOf(input))
    return { method: init?.method ?? 'GET', path: url.pathname + url.search, body: init?.body }
  })
}

const region = () => screen.findByRole('region', { name: 'For review' })

describe('ProgramAlertBanner', () => {
  it("shows this program's attendance alert, its facts, and Mark as reviewed", async () => {
    alerts = () =>
      json([
        attendanceAlert({
          missedInARow: { days: 0, weeks: 2, since: '2031-05-26' },
          inactive: { days: 9, lastSessionDate: '2031-06-02' },
        }),
      ])
    renderBanner()
    const banner = await region()
    expect(banner).toHaveTextContent(/^For review2 weeks in a row below target, since /)
    expect(banner).toHaveTextContent(/No session for 9 days — the last on /)
    expect(screen.getByRole('button', { name: 'Mark as reviewed' })).toBeEnabled()
    expect(screen.getByText('Hidden from your list until something changes, or for 14 days.')).toBeInTheDocument()
  })

  it("shows nothing for another program's alert, or for a SESSION alert of this one", async () => {
    alerts = () =>
      json([
        attendanceAlert({ program: { id: 21, title: 'Other' } }),
        sessionAlert({ program: { id: 20, title: 'Lower Back — Jo' } }),
      ])
    renderBanner()
    await screen.findByText('list settled')
    expect(screen.queryByRole('region', { name: 'For review' })).not.toBeInTheDocument()
  })

  it('stays quiet while loading', () => {
    fetchMock.mockImplementation(() => new Promise(() => {}))
    renderBanner()
    expect(screen.queryByRole('region')).not.toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('stays quiet when the list cannot be read', async () => {
    alerts = () => apiError(500, 'boom')
    renderBanner()
    await screen.findByText('list settled')
    expect(screen.queryByRole('region')).not.toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('marks it reviewed: one POST with only today, Saving… meanwhile, then says what happens next', async () => {
    alerts = () => json([attendanceAlert()])
    let release!: () => void
    const answered = reviewAnswer
    reviewAnswer = () => new Promise((resolve) => (release = () => void answered().then(resolve)))
    renderBanner()
    await region()
    // Once reviewed, the server's list no longer has it.
    alerts = () => json([])

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Mark as reviewed' }))
    expect(await screen.findByRole('button', { name: 'Saving…' })).toBeDisabled()
    release()

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Marked as reviewed. It will be back on your list if something changes, or in 14 days.',
    )
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(requests().filter((r) => r.method === 'POST')).toEqual([
      { method: 'POST', path: '/alerts/programs/20/review', body: '{"today":"2031-06-12"}' },
    ])
    // The list was asked again (invalidated, and on screen): 2 GETs.
    await vi.waitFor(() =>
      expect(requests().filter((r) => r.method === 'GET')).toEqual([
        { method: 'GET', path: `/alerts?today=${TODAY}`, body: undefined },
        { method: 'GET', path: `/alerts?today=${TODAY}`, body: undefined },
      ]),
    )
  })

  it("shows the server's refusal and lets me try again", async () => {
    alerts = () => json([attendanceAlert()])
    reviewAnswer = () => Promise.resolve(apiError(409, 'Nothing on this program needs reviewing right now'))
    renderBanner()
    await region()
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Mark as reviewed' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Nothing on this program needs reviewing right now')
    expect(screen.getByRole('button', { name: 'Mark as reviewed' })).toBeEnabled()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })
})