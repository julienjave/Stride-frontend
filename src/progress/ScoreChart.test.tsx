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

import { describe, it, expect } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { formatShortDate } from '@/common/calendarDate'
import { ScoreChart } from './ScoreChart'
import type { ChartRange, ScoreKey, ScoredSession } from './scoreRules'

// The chart is drawn at the FALLBACK width in jsdom (no layout, no
// ResizeObserver): 320 px, so the plot is 320 − 26 − 64 = 230 px wide and
// 140 px tall from y = 10. The geometry below is computed from those.
const LEFT = 26
const PLOT_WIDTH = 230
const TOP = 10
const PLOT_HEIGHT = 140

// 22 days: Monday 2 to Monday 23 June 2031.
const RANGE: ChartRange = { from: '2031-06-02', to: '2031-06-23' }
const PAIN: ScoreKey[] = ['painBefore', 'painAfter']

function s(id: number, localDate: string, more: Partial<ScoredSession> = {}): ScoredSession {
  return {
    id,
    localDate,
    status: 'completed',
    endReason: null,
    workoutId: 57,
    painBefore: 5,
    painAfter: 3,
    mobilityAfter: 6,
    ...more,
  }
}

function draw(sessions: ScoredSession[], keys: ScoreKey[] = PAIN) {
  return render(
    <>
      <p id="summary">The summary.</p>
      <ScoreChart
        label="Pain chart"
        describedBy="summary"
        sessions={sessions}
        keys={keys}
        range={RANGE}
        workoutOf={(id) => (id === 57 ? 'A · Mobility' : 'B · Strength')}
        hint="The hint."
      />
    </>,
  )
}

const chart = () => screen.getByRole('group', { name: 'Pain chart' })
const dots = (container: HTMLElement, key: ScoreKey) =>
  [...container.querySelectorAll(`[data-series="${key}"] circle`)].map((dot) => ({
    id: Number(dot.getAttribute('data-session')),
    cx: Number(dot.getAttribute('cx')),
    cy: Number(dot.getAttribute('cy')),
    hollow: dot.hasAttribute('data-hollow'),
  }))
const lines = (container: HTMLElement, key: ScoreKey) =>
  [...container.querySelectorAll(`[data-series="${key}"] polyline`)].map((line) =>
    line.getAttribute('data-run'),
  )
const plot = (container: HTMLElement) => container.querySelector('[data-plot]')!

describe('ScoreChart — the drawing', () => {
  // 0 at the BOTTOM of the plot (y = 150), 10 at the top (y = 10): the
  // scale's own direction, for pain as for mobility.
  it('draws 0 at the bottom and 10 at the top', () => {
    const { container } = draw([
      s(1, '2031-06-02', { painBefore: 10, painAfter: 0 }),
      s(2, '2031-06-04', { painBefore: 5, painAfter: 5 }),
    ])
    expect(dots(container, 'painBefore').map((d) => d.cy)).toEqual([TOP, TOP + PLOT_HEIGHT / 2])
    expect(dots(container, 'painAfter').map((d) => d.cy)).toEqual([TOP + PLOT_HEIGHT, TOP + PLOT_HEIGHT / 2])
  })

  // A DATED axis: the session a week later is 7 days further right — in the
  // middle of its day's band (0.5 and 7.5 of 22 days).
  it('places sessions by their date', () => {
    const { container } = draw([s(1, '2031-06-02'), s(2, '2031-06-09')])
    const xs = dots(container, 'painAfter').map((d) => d.cx)
    expect(xs[0]).toBeCloseTo(LEFT + (0.5 / 22) * PLOT_WIDTH)
    expect(xs[1]).toBeCloseTo(LEFT + (7.5 / 22) * PLOT_WIDTH)
  })

  it('joins each series’ answers with a line, broken where a session didn’t answer', () => {
    const { container } = draw([
      s(1, '2031-06-02'),
      s(2, '2031-06-04', { painAfter: null }),
      s(3, '2031-06-06'),
      s(4, '2031-06-09'),
    ])
    expect(lines(container, 'painBefore')).toEqual(['1 2 3 4'])
    expect(lines(container, 'painAfter')).toEqual(['3 4'])
    // The lone answer before the gap is still a dot; the gap has none.
    expect(dots(container, 'painAfter').map((d) => d.id)).toEqual([1, 3, 4])
  })

  // Filled for a completed session; hollow for one that wasn't.
  it('draws a session that wasn’t completed as a hollow dot', () => {
    const { container } = draw([
      s(1, '2031-06-02'),
      s(2, '2031-06-04', { status: 'incomplete', endReason: 'pain', painAfter: 7 }),
      s(3, '2031-06-05', { status: 'skipped', endReason: 'pain', painBefore: 8, painAfter: null }),
      s(4, '2031-06-06', { status: 'in_progress', painAfter: null }),
    ])
    expect(dots(container, 'painBefore').map((d) => [d.id, d.hollow])).toEqual([
      [1, false],
      [2, true],
      [3, true],
      [4, true],
    ])
    expect(dots(container, 'painAfter').map((d) => [d.id, d.hollow])).toEqual([
      [1, false],
      [2, true],
    ])
  })

  it('labels the end of each line with its series and value', () => {
    const { container } = draw([s(1, '2031-06-02', { painBefore: 6, painAfter: 2 })])
    expect(
      [...container.querySelectorAll('[data-end-label]')].map((label) => label.textContent),
    ).toEqual(['Before 6', 'After 2'])
  })

  // Equal latest values would print one label on the other: none then (the
  // legend and the summary say it). One point apart (14 px) is enough room.
  it('leaves the end labels out when they would collide', () => {
    const { container, unmount } = draw([s(1, '2031-06-02', { painBefore: 4, painAfter: 4 })])
    expect(container.querySelectorAll('[data-end-label]')).toHaveLength(0)
    unmount()
    const next = draw([s(1, '2031-06-02', { painBefore: 4, painAfter: 3 })])
    expect(next.container.querySelectorAll('[data-end-label]')).toHaveLength(2)
  })

  // The label of each line's LAST point — not the series' highest.
  it('labels the last point of each line', () => {
    const { container } = draw([
      s(1, '2031-06-02', { painBefore: 9, painAfter: 8 }),
      s(2, '2031-06-04', { painBefore: 6, painAfter: null }),
      s(3, '2031-06-06', { painBefore: 4, painAfter: null }),
    ])
    expect(
      [...container.querySelectorAll('[data-end-label]')].map((label) => label.textContent),
    ).toEqual(['Before 4', 'After 8'])
  })

  it('writes four dates under a narrow chart, first and last included', () => {
    const { container } = draw([s(1, '2031-06-02')])
    expect(
      [...container.querySelectorAll('[data-tick]')].map((tick) => tick.getAttribute('data-tick')),
    ).toEqual(['2031-06-02', '2031-06-09', '2031-06-16', '2031-06-23'])
  })

  it('hides the picture from assistive technology, behind a described group', () => {
    const { container } = draw([s(1, '2031-06-02')])
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
    expect(chart()).toHaveAccessibleDescription('The summary. The hint.')
  })
})

describe('ScoreChart — reading a session', () => {
  const list = () => [
    s(1, '2031-06-02', { painBefore: 6, painAfter: 4 }),
    s(2, '2031-06-09', { painBefore: 5, painAfter: null, workoutId: 58 }),
    s(3, '2031-06-16', { status: 'skipped', endReason: 'pain', painBefore: 8, painAfter: null }),
  ]
  // The x (in px from the SVG's left edge) of a day's middle.
  const xOfDay = (day: number) => LEFT + ((day + 0.5) / 22) * PLOT_WIDTH
  const readout = () => chart().nextElementSibling as HTMLElement

  it('shows the hint until a session is picked', () => {
    draw(list())
    expect(readout()).toHaveTextContent('The hint.')
    expect(readout()).toHaveAttribute('aria-live', 'polite')
  })

  // The pointer picks the NEAREST session: day 8 is nearest day 7's
  // session (Mon 9 Jun). Every series' value is listed, a missing one said
  // as "Not answered" (asked) — never left out.
  it('reads the session nearest the pointer, every series included', () => {
    const { container } = draw(list())
    fireEvent.pointerMove(plot(container), { clientX: xOfDay(8) })
    expect(within(readout()).getByText(`${formatShortDate('2031-06-09')} · B · Strength`)).toBeVisible()
    expect(within(readout()).getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      '5Before',
      'Not answeredAfter',
    ])
    expect(container.querySelector('[data-crosshair]')).toHaveAttribute('x1', String(xOfDay(7)))
  })

  it('says "—" for a question never asked, and how the session ended', () => {
    const { container } = draw(list())
    fireEvent.pointerDown(plot(container), { clientX: xOfDay(20) })
    const items = within(readout()).getAllByRole('listitem').map((item) => item.textContent)
    expect(readout()).toHaveTextContent(`${formatShortDate('2031-06-16')} · A · Mobility · Skipped (pain)`)
    expect(items).toEqual(['8Before', '—After'])
  })

  // A mouse leaving lets go; a finger lifting doesn't (the readout stays to
  // be read on a phone).
  it('lets go when the mouse leaves, not when a finger lifts', () => {
    const { container } = draw(list())
    fireEvent.pointerMove(plot(container), { clientX: xOfDay(0) })
    fireEvent.pointerLeave(plot(container), { pointerType: 'touch' })
    expect(readout()).toHaveTextContent(formatShortDate('2031-06-02'))
    fireEvent.pointerLeave(plot(container), { pointerType: 'mouse' })
    expect(readout()).toHaveTextContent('The hint.')
    expect(container.querySelector('[data-crosshair]')).toBe(null)
  })

  it('enlarges the picked session’s dots', () => {
    const { container } = draw(list())
    fireEvent.pointerMove(plot(container), { clientX: xOfDay(0) })
    const radii = [...container.querySelectorAll('[data-series="painBefore"] circle')].map((dot) =>
      dot.getAttribute('r'),
    )
    expect(radii).toEqual(['5', '4', '4'])
  })

  // The keyboard's crosshair: the first arrow picks the LATEST session,
  // then Left / Right step (stopping at the ends), Home / End jump, Escape
  // lets go.
  it('steps through the sessions with the keyboard', async () => {
    const user = userEvent.setup()
    draw(list())
    chart().focus()
    await user.keyboard('{ArrowRight}')
    expect(readout()).toHaveTextContent(formatShortDate('2031-06-16'))
    await user.keyboard('{ArrowRight}')
    expect(readout()).toHaveTextContent(formatShortDate('2031-06-16'))
    await user.keyboard('{ArrowLeft}')
    expect(readout()).toHaveTextContent(formatShortDate('2031-06-09'))
    await user.keyboard('{Home}')
    expect(readout()).toHaveTextContent(formatShortDate('2031-06-02'))
    await user.keyboard('{ArrowLeft}')
    expect(readout()).toHaveTextContent(formatShortDate('2031-06-02'))
    await user.keyboard('{ArrowRight}')
    expect(readout()).toHaveTextContent(formatShortDate('2031-06-09'))
    await user.keyboard('{End}')
    expect(readout()).toHaveTextContent(formatShortDate('2031-06-16'))
    await user.keyboard('{Escape}')
    expect(readout()).toHaveTextContent('The hint.')
    await user.keyboard('{ArrowLeft}')
    expect(readout()).toHaveTextContent(formatShortDate('2031-06-16'))
  })

  // The handled keys don't scroll the page; the others (Tab…) keep their job.
  it('keeps the page still on the keys it handles, and only those', () => {
    draw(list())
    expect(fireEvent.keyDown(chart(), { key: 'ArrowLeft' })).toBe(false)
    expect(fireEvent.keyDown(chart(), { key: 'Home' })).toBe(false)
    expect(fireEvent.keyDown(chart(), { key: 'Escape' })).toBe(false)
    expect(fireEvent.keyDown(chart(), { key: 'ArrowDown' })).toBe(true)
    expect(fireEvent.keyDown(chart(), { key: 'Tab' })).toBe(true)
  })

  // Kept by id: a refetch without the picked session lets go, rather than
  // pointing the readout at whichever session took its place.
  it('lets go of a session that leaves the list', () => {
    const { container, rerender } = draw(list())
    fireEvent.pointerMove(plot(container), { clientX: xOfDay(7) })
    rerender(
      <>
        <p id="summary">The summary.</p>
        <ScoreChart
          label="Pain chart"
          describedBy="summary"
          sessions={[list()[0], list()[2]]}
          keys={PAIN}
          range={RANGE}
          workoutOf={() => null}
          hint="The hint."
        />
      </>,
    )
    expect(readout()).toHaveTextContent('The hint.')
  })

  // A chart of one series lists its value without repeating its name.
  it('lists a single series’ value without its name', () => {
    const { container } = draw(list(), ['mobilityAfter'])
    fireEvent.pointerMove(plot(container), { clientX: xOfDay(0) })
    expect(within(readout()).getAllByRole('listitem').map((item) => item.textContent)).toEqual(['6'])
  })
})