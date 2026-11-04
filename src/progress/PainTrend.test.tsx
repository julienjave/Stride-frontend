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
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { formatShortDate } from '@/common/calendarDate'
import { apiError, json, session, urlOf } from '@/sessions/testData'
import type { ProgramSession } from './api'
import { PainTrend } from './PainTrend'

const fetchMock = vi.fn<typeof fetch>()
vi.stubGlobal('fetch', fetchMock)

// The list's rows, NEWEST first (the backend's order): completed, one a
// day back from 12 June 2031, with these pain-after answers given oldest
// first.
function rows(painAfter: (number | null)[]): ProgramSession[] {
  return painAfter
    .map((value, i) => {
      const { exercises: _exercises, ...row } = session({
        id: i + 1,
        localDate: `2031-06-${String(i + 1).padStart(2, '0')}`,
        status: 'completed',
        painBefore: 5,
        painAfter: value,
        mobilityAfter: 6,
      })
      return row
    })
    .reverse()
}

let answer: () => Response

beforeEach(() => {
  fetchMock.mockReset()
  answer = () => json([])
  fetchMock.mockImplementation((input) => {
    const url = urlOf(input)
    if (url.endsWith('/assigned-programs/12/sessions')) return Promise.resolve(answer())
    return Promise.reject(new Error(`unexpected request: ${url}`))
  })
})

function renderTrend() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 30_000 } },
  })
  const view = render(
    <QueryClientProvider client={queryClient}>
      <PainTrend programId={12} />
    </QueryClientProvider>,
  )
  return { ...view, queryClient }
}

const sparkline = (container: HTMLElement) => container.querySelector('[data-sparkline]')

describe('PainTrend', () => {
  it('gives the latest pain after, the direction in words, and the sparkline', async () => {
    answer = () => json(rows([5, 4, 4, 2, 2, 3]))
    const { container } = renderTrend()
    expect(await screen.findByText(`Pain after sessions: 3 (${formatShortDate('2031-06-06')})`)).toBeVisible()
    // The arrow is for the eye; the words say it to everyone.
    const trend = screen.getByText('lower over your last 3 sessions')
    expect(trend.parentElement).toHaveTextContent('↓ lower over your last 3 sessions')
    expect(trend.parentElement?.querySelector('[aria-hidden="true"]')).toHaveTextContent('↓')
    expect(sparkline(container)).toHaveAttribute('aria-hidden', 'true')
    expect(sparkline(container)?.querySelector('polyline')).toHaveAttribute('data-run', '1 2 3 4 5 6')
    expect(sparkline(container)?.querySelector('[data-last]')).toHaveAttribute('data-session', '6')
  })

  it('says higher and steady too', async () => {
    answer = () => json(rows([2, 2, 2, 5, 5, 5]))
    const first = renderTrend()
    expect(await screen.findByText('higher over your last 3 sessions')).toBeVisible()
    expect(screen.getByText('higher over your last 3 sessions').parentElement).toHaveTextContent('↑')
    first.unmount()
    answer = () => json(rows([3, 3, 3, 3]))
    renderTrend()
    expect(await screen.findByText('steady over your last 3 sessions')).toBeVisible()
    expect(screen.getByText('steady over your last 3 sessions').parentElement).toHaveTextContent('→')
  })

  // Fewer than four answers: the latest alone — no "before" to compare.
  it('gives no direction with fewer than four answers', async () => {
    answer = () => json(rows([5, 4, 3]))
    renderTrend()
    expect(await screen.findByText(`Pain after sessions: 3 (${formatShortDate('2031-06-03')})`)).toBeVisible()
    expect(screen.queryByText(/over your last 3 sessions/)).toBe(null)
  })

  // The last 8 sessions, evenly spaced and right-aligned: the newest at the
  // right edge whatever the count; 0–10 never stretched.
  it('draws the last 8, newest at the right edge, on the whole 0–10 scale', async () => {
    answer = () => json(rows([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]))
    const { container } = renderTrend()
    await screen.findByText(/^Pain after sessions/)
    const line = sparkline(container)!.querySelector('polyline')!
    expect(line).toHaveAttribute('data-run', '3 4 5 6 7 8 9 10')
    const points = line.getAttribute('points')!.split(' ')
    // x from 3 to 93 (96 wide, 3 padding); y: 3 → 15.6, 10 → 3 (24 tall).
    expect(points[0]).toBe('3,15.6')
    expect(points.at(-1)).toBe('93,3')
  })

  it('puts a short sparkline’s newest point at the right edge too', async () => {
    answer = () => json(rows([4, 0]))
    const { container } = renderTrend()
    await screen.findByText(/^Pain after sessions/)
    // Two of 8 slots: the last two — x = 3 + 6 × 90/7 and 93; y(4) = 13.8.
    const points = sparkline(container)!
      .querySelector('polyline')!
      .getAttribute('points')!
      .split(' ')
      .map((point) => point.split(',').map(Number))
    expect(points[0][0]).toBeCloseTo(3 + (6 * 90) / 7)
    expect(points[0][1]).toBeCloseTo(13.8)
    expect(points[1]).toEqual([93, 21])
  })

  // A blank check-out breaks the little line as on the full chart; an
  // answer alone between blanks is a small dot.
  it('breaks at an unanswered session, and dots a lone answer', async () => {
    answer = () => json(rows([4, null, 3, null, 2, 2]))
    const { container } = renderTrend()
    await screen.findByText(/^Pain after sessions/)
    const svg = sparkline(container)!
    expect([...svg.querySelectorAll('polyline')].map((l) => l.getAttribute('data-run'))).toEqual(['5 6'])
    expect(
      [...svg.querySelectorAll('circle:not([data-last])')].map((dot) => dot.getAttribute('data-session')),
    ).toEqual(['1', '3'])
    expect(svg.querySelector('[data-last]')).toHaveAttribute('data-session', '6')
  })

  // Quiet: nothing to show, nothing said — never a nudge to answer.
  it('shows nothing when no pain after has been recorded', async () => {
    answer = () => json(rows([null, null]))
    const { container } = renderTrend()
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(container).toBeEmptyDOMElement()
  })

  it('shows nothing while loading or when the request fails', async () => {
    answer = () => apiError(500, 'Boom')
    const { container, queryClient } = renderTrend()
    expect(container).toBeEmptyDOMElement()
    await waitFor(() => expect(queryClient.getQueryState(['assigned-programs', 12, 'sessions'])?.status).toBe('error'))
    expect(container).toBeEmptyDOMElement()
  })
})