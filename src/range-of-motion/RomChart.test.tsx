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

import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import { RomChart } from './RomChart'
import { indexCatalogue, type MovementCard, type RomSeries } from './romRules'
import { catalogue } from './testData'

// The chart drawn on its own, at the fallback width (jsdom lays nothing
// out: 320 px — useElementWidth). What is checked is WHAT is drawn and
// where it sits relative to the rest; the picture itself was looked at in
// Chromium.

const index = indexCatalogue(catalogue())

function line(side: RomSeries['side'], ...points: [string, number][]): RomSeries {
  return { side, points: points.map(([measuredOn, degrees], i) => ({ assessmentId: i + 1, measuredOn, degrees })) }
}

function draw(movement: string, ...series: RomSeries[]) {
  const card: MovementCard = { movement: index.get(movement)!, mode: 'active', series }
  const { container } = render(<RomChart card={card} />)
  return container
}

const y = (element: Element | null) => Number(element?.getAttribute('y') ?? element?.getAttribute('cy'))

describe('RomChart', () => {
  it('joins a side’s values with a line, and draws a lone value as a marker alone', () => {
    const chart = draw('knee_flexion', line('left', ['2031-03-01', 120]), line('right', ['2031-03-01', 100], ['2031-03-08', 110]))
    expect(chart.querySelectorAll('[data-side="left"] polyline')).toHaveLength(0)
    expect(chart.querySelectorAll('[data-side="right"] polyline')).toHaveLength(1)
    // Higher degrees sit higher (SVG's y grows downwards).
    const [first, second] = chart.querySelectorAll('[data-side="right"] rect')
    expect(y(second)).toBeLessThan(y(first))
  })

  it('draws an unsided movement as one line in the text colour', () => {
    const chart = draw('cervical_flexion', line(null, ['2031-03-01', 30], ['2031-03-08', 40]))
    expect(chart.querySelectorAll('[data-side="none"] circle')).toHaveLength(2)
    expect(chart.querySelector('[data-side="none"] polyline')).toHaveClass('stroke-foreground')
    expect(chart.querySelector('[data-end-label="none"]')?.textContent).toBe('40°')
  })

  it('labels each line’s latest value — unless two labels would print on each other', () => {
    const apart = draw('knee_flexion', line('left', ['2031-03-01', 140]), line('right', ['2031-03-01', 100]))
    expect([...apart.querySelectorAll('[data-end-label]')].map((l) => l.textContent)).toStrictEqual(['L 140°', 'R 100°'])
    const close = draw('knee_flexion', line('left', ['2031-03-01', 139]), line('right', ['2031-03-01', 137]))
    expect(close.querySelectorAll('[data-end-label]')).toHaveLength(0)
  })

  it('draws the typical value as a dashed line, within the scale', () => {
    const chart = draw('knee_flexion', line('right', ['2031-03-01', 100]))
    const typical = chart.querySelector('[data-typical]')
    expect(typical).toHaveAttribute('stroke-dasharray', '4 3')
    // 135° sits above 100°.
    expect(Number(typical?.getAttribute('y1'))).toBeLessThan(y(chart.querySelector('[data-point="100"]')))
  })

  it('numbers the scale at its ends, and at 0 when there is room between them', () => {
    const labels = (chart: Element) =>
      [...chart.querySelectorAll('text[text-anchor="end"]')].map((t) => t.textContent).filter((t) => t?.endsWith('°'))
    // −30° to 10°: 0 is a quarter of the way down — room for it.
    expect(labels(draw('knee_extension', line('right', ['2031-03-01', -25])))).toStrictEqual(['−30°', '0°', '10°'])
    // −10° to 70°: 0 would sit 12 px from −10° — left out.
    expect(labels(draw('cervical_flexion', line(null, ['2031-03-01', -5]), line('left', ['2031-03-01', 60])))).toStrictEqual([
      '−10°',
      '70°',
    ])
    // No negative value: the two ends only.
    expect(labels(draw('knee_flexion', line('right', ['2031-03-01', 100])))).toStrictEqual(['90°', '140°'])
  })

  it('dates the axis from the first day measured to the last', () => {
    const chart = draw('knee_flexion', line('right', ['2031-03-01', 100], ['2031-03-29', 110]))
    const ticks = [...chart.querySelectorAll('[data-tick]')].map((t) => t.getAttribute('data-tick'))
    expect(ticks.at(0)).toBe('2031-03-01')
    expect(ticks.at(-1)).toBe('2031-03-29')
    expect(ticks).toHaveLength(3)
  })
})