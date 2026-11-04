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

import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
import { currentUserQueryKey } from '@/auth/useCurrentUser'
import { formatDayMonth } from '@/common/calendarDate'
import { formatCalendarDate } from '@/common/formatCalendarDate'
import { json, urlOf } from '@/medical-files/testData'
import { RangeOfMotionTrend } from './RangeOfMotionTrend'
import { assessment, catalogue, patRecord, value } from './testData'

// The patient home's glance at their range of motion, rendered alone with
// the patient signed in. `record` is GET /range-of-motion's answer (a
// function: a status other than 200 for a failure).

const fetchMock = vi.fn<typeof fetch>()
vi.stubGlobal('fetch', fetchMock)

afterEach(() => fetchMock.mockReset())

function renderTrend(record: () => Response | Promise<Response>) {
  fetchMock.mockImplementation((input) => {
    const url = urlOf(input)
    if (url.endsWith('/range-of-motion')) return Promise.resolve(record())
    if (url.endsWith('/range-of-motion/movements')) return Promise.resolve(json(catalogue()))
    return Promise.reject(new Error(`unexpected request: ${url}`))
  })
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 30_000 } } })
  queryClient.setQueryData(currentUserQueryKey, { id: 6, firstName: 'Pat', lastName: 'Lee', activeRole: 'patient', roles: ['patient'] })
  const { container } = render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <RangeOfMotionTrend />
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return container
}

// A visit with more values than the home shows (4 > 3), the newest: neck
// flexion (no side), the knee both sides, the right knee passive.
function bigVisit() {
  return [
    assessment(5, {
      measuredOn: '2031-03-25',
      measurements: [
        value('cervical_flexion', null, 40),
        value('knee_flexion', 'left', 140),
        value('knee_flexion', 'right', 128),
        value('knee_flexion', 'right', 131, { mode: 'passive' }),
      ],
    }),
    ...patRecord(),
  ]
}

describe('RangeOfMotionTrend', () => {
  it("lists each value of the latest visit: its name, the value, the change since it was first measured", async () => {
    renderTrend(() => json(patRecord()))
    const section = await screen.findByRole('region', { name: 'Range of motion' })
    expect(within(section).getByText(`Your last measurements, ${formatCalendarDate('2031-03-20')}`)).toBeInTheDocument()
    const rows = within(section).getAllByRole('listitem')
    const first = formatDayMonth('2031-03-01')
    expect(rows.map((row) => row.textContent)).toStrictEqual([
      `Left knee flexion139° · ↑ 1° since ${first}1° more than on ${first}`,
      `Right knee flexion126° · ↑ 16° since ${first}16° more than on ${first}`,
    ])
    // The amended 102° is no measurement: the right knee's line is 110, 120, 126.
    const spark = rows[1].querySelector('[data-sparkline] polyline')
    expect(spark?.getAttribute('points')?.split(' ')).toHaveLength(3)
    expect(spark).toHaveClass('stroke-rom-right')
    expect(rows[0].querySelector('[data-sparkline] polyline')).toHaveClass('stroke-rom-left')
    expect(within(section).getByRole('link', { name: 'See all your measurements' })).toHaveAttribute(
      'href',
      '/profile/records',
    )
  })

  it('shows at most three lines, then says how many more; names an unsided movement and a passive value', async () => {
    renderTrend(() => json(bigVisit()))
    const section = await screen.findByRole('region', { name: 'Range of motion' })
    const rows = within(section).getAllByRole('listitem')
    expect(rows.map((row) => row.querySelector('p')?.textContent)).toStrictEqual([
      'Neck flexion',
      'Left knee flexion',
      'Right knee flexion',
    ])
    expect(within(section).getByText('and 1 more')).toBeInTheDocument()
    // A value measured once: no change, no sparkline.
    expect(rows[0].textContent).toBe('Neck flexion40°')
    expect(rows[0].querySelector('[data-sparkline]')).toBeNull()
    expect(rows[0]).not.toHaveTextContent('since')
  })

  it('says the mode only for a passive value', async () => {
    renderTrend(() =>
      json([assessment(1, { measurements: [value('knee_flexion', 'right', 120, { mode: 'passive' })] })]),
    )
    const section = await screen.findByRole('region', { name: 'Range of motion' })
    expect(within(section).getByText('Right knee flexion · passive')).toBeInTheDocument()
    expect(within(section).queryByText('and 0 more')).not.toBeInTheDocument()
  })

  it('shows nothing at all for a patient never measured', async () => {
    const empty = renderTrend(() => json([]))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(empty).toBeEmptyDOMElement()
  })

  it("shows nothing when the latest visit holds only movements this page doesn't know", async () => {
    const unknown = renderTrend(() => json([assessment(1, { measurements: [value('new_movement', null, 10)] })]))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(unknown).toBeEmptyDOMElement()
  })

  it('shows nothing while loading', () => {
    const loading = renderTrend(() => new Promise<Response>(() => {}))
    expect(loading).toBeEmptyDOMElement()
  })

  it('shows nothing when the record could not be read', async () => {
    const failed = renderTrend(() => json({ statusCode: 500, message: ['x'], error: 'x' }, 500))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(failed).toBeEmptyDOMElement()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})