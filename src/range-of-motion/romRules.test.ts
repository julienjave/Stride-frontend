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
import {
  cardRange,
  changeSinceFirst,
  degreeScale,
  groupIntoAssessments,
  latestVisitLines,
  indexCatalogue,
  movementCards,
  pointPositions,
  type MovementCard,
} from './romRules'
import { assessment, catalogue, patRecord, value } from './testData'

const index = indexCatalogue(catalogue())

describe('indexCatalogue', () => {
  it('finds a movement by its code, and orders codes the way the catalogue lists them', () => {
    expect(index.get('knee_flexion')?.name).toBe('Knee flexion')
    expect(index.get('nope')).toBeUndefined()
    expect(index.order('cervical_flexion')).toBe(0)
    expect(index.order('knee_extension')).toBe(3)
    // An unknown code sorts after every known one.
    expect(index.order('nope')).toBe(4)
  })
})

describe('groupIntoAssessments', () => {
  it('shows each chain once, by its latest version, with the earlier ones newest first', () => {
    const groups = groupIntoAssessments(patRecord())
    expect(groups.map((g) => [g.latest.id, g.earlier.map((e) => e.id)])).toStrictEqual([
      [4, []],
      [3, [2]],
      [1, []],
    ])
  })

  it("orders by the LATEST version's day measured, then by when recorded, then by id", () => {
    // 1 was measured last but amended (by 5, recorded later than every
    // other) to an earlier day: it moves down — the DAY decides, not when
    // it was recorded. On one day, the later recorded first (3 before 2,
    // whatever their ids); at the same moment, the larger id (6, 4).
    const groups = groupIntoAssessments([
      assessment(1, { measuredOn: '2031-03-20', amendedById: 5 }),
      assessment(3, { measuredOn: '2031-03-10', createdAt: '2031-03-10T09:00:00.000Z' }),
      assessment(2, { measuredOn: '2031-03-10', createdAt: '2031-03-10T10:00:00.000Z' }),
      assessment(4, { measuredOn: '2031-03-12', createdAt: '2031-03-12T10:00:00.000Z' }),
      assessment(6, { measuredOn: '2031-03-12', createdAt: '2031-03-12T10:00:00.000Z' }),
      assessment(5, {
        measuredOn: '2031-03-01',
        createdAt: '2031-03-25T10:00:00.000Z',
        amendsId: 1,
        amendmentReason: 'Wrong day',
      }),
    ])
    expect(groups.map((g) => g.latest.id)).toStrictEqual([6, 4, 2, 3, 5])
  })

  it('stops at a link it cannot follow instead of looping or throwing', () => {
    const [group] = groupIntoAssessments([assessment(3, { amendsId: 99, amendmentReason: 'x' })])
    expect(group.earlier).toStrictEqual([])
    // A cycle the database can't hold: the walk still ends.
    const cycle = groupIntoAssessments([
      assessment(1, { amendsId: 2, amendmentReason: 'x' }),
      assessment(2, { amendsId: 1, amendmentReason: 'x', amendedById: 1 }),
    ])
    expect(cycle[0].earlier.map((e) => e.id)).toStrictEqual([2, 1])
  })
})

describe('movementCards', () => {
  it('makes a card per movement and mode, from latest versions only, values oldest first', () => {
    const cards = movementCards(patRecord(), index)
    expect(cards.map((c) => `${c.movement.movement} ${c.mode}`)).toStrictEqual([
      'knee_flexion active',
      'knee_flexion passive',
    ])
    const [active, passive] = cards
    expect(active.series.map((s) => [s.side, s.points.map((p) => [p.measuredOn, p.degrees])])).toStrictEqual([
      [
        'left',
        [
          ['2031-03-01', 138],
          ['2031-03-11', 138],
          ['2031-03-20', 139],
        ],
      ],
      [
        'right',
        [
          // The amended 102° is not a measurement: only 120° counts.
          ['2031-03-01', 110],
          ['2031-03-11', 120],
          ['2031-03-20', 126],
        ],
      ],
    ])
    expect(passive.series.map((s) => s.side)).toStrictEqual(['right'])
    expect(passive.series[0].points.map((p) => p.assessmentId)).toStrictEqual([1])
  })

  it('orders cards by the catalogue, active before passive, and left before right', () => {
    const cards = movementCards(
      [
        assessment(1, {
          measurements: [
            // A movement this page doesn't know, FIRST: skipped, the rest kept.
            value('unknown_movement', null, 1),
            value('knee_flexion', 'right', 100, { mode: 'passive' }),
            value('knee_flexion', 'right', 95),
            value('knee_flexion', 'left', 120),
            value('cervical_flexion', null, 40),
          ],
        }),
      ],
      index,
    )
    expect(cards.map((c) => `${c.movement.movement} ${c.mode}`)).toStrictEqual([
      'cervical_flexion active',
      'knee_flexion active',
      'knee_flexion passive',
    ])
    expect(cards[0].series.map((s) => s.side)).toStrictEqual([null])
    expect(cards[1].series.map((s) => s.side)).toStrictEqual(['left', 'right'])
  })

  it('orders two values of one day by when they were recorded', () => {
    const [card] = movementCards(
      [
        assessment(2, { createdAt: '2031-03-04T15:00:00.000Z', measurements: [value('knee_flexion', 'right', 2)] }),
        assessment(1, { createdAt: '2031-03-04T09:00:00.000Z', measurements: [value('knee_flexion', 'right', 1)] }),
      ],
      index,
    )
    expect(card.series[0].points.map((p) => p.degrees)).toStrictEqual([1, 2])
  })
})

function series(...points: [string, number][]) {
  return {
    side: 'right' as const,
    points: points.map(([measuredOn, degrees], i) => ({ assessmentId: i + 1, measuredOn, degrees })),
  }
}

describe('changeSinceFirst', () => {
  it('is the latest value minus the first, since the first day', () => {
    expect(changeSinceFirst(series(['2031-03-01', 110], ['2031-03-11', 120], ['2031-03-20', 126]))).toStrictEqual({
      degrees: 16,
      since: '2031-03-01',
    })
    expect(changeSinceFirst(series(['2031-03-01', 10], ['2031-03-11', -5]))).toStrictEqual({
      degrees: -15,
      since: '2031-03-01',
    })
  })

  it('has nothing to say with one value, or with every value of one day', () => {
    expect(changeSinceFirst(series(['2031-03-01', 110]))).toBeNull()
    expect(changeSinceFirst(series(['2031-03-01', 110], ['2031-03-01', 115]))).toBeNull()
  })
})

function card(typical: number, ...values: [string, number][]): MovementCard {
  return {
    movement: { ...index.get('knee_flexion')!, typicalDegrees: typical },
    mode: 'active',
    series: [series(...values)],
  }
}

describe('cardRange', () => {
  it('spans the first day measured to the last, across both sides', () => {
    const both: MovementCard = {
      ...card(135, ['2031-03-11', 1]),
      series: [
        { side: 'left', points: [{ assessmentId: 1, measuredOn: '2031-03-20', degrees: 1 }] },
        series(['2031-03-11', 1], ['2031-03-02', 1]),
      ],
    }
    expect(cardRange(both)).toStrictEqual({ from: '2031-03-02', to: '2031-03-20' })
  })
})

describe('pointPositions', () => {
  it('puts a value in the middle of its day, and two of one day at its thirds', () => {
    const positions = pointPositions(
      [
        { assessmentId: 1, measuredOn: '2031-03-01', degrees: 1 },
        { assessmentId: 2, measuredOn: '2031-03-04', degrees: 1 },
        { assessmentId: 3, measuredOn: '2031-03-04', degrees: 1 },
      ],
      '2031-03-01',
    )
    expect([...positions]).toStrictEqual([
      [1, 0.5],
      [2, 3 + 1 / 3],
      [3, 3 + 2 / 3],
    ])
  })
})

describe('degreeScale', () => {
  it('fits the values and the typical value with room, rounded out to tens — not from 0', () => {
    expect(degreeScale(card(135, ['2031-03-01', 110], ['2031-03-02', 126]))).toStrictEqual({ low: 100, high: 140 })
    // The typical value below every value still fits.
    expect(degreeScale(card(45, ['2031-03-01', 60]))).toStrictEqual({ low: 40, high: 70 })
  })

  it('takes negative values in, and never spans nothing', () => {
    expect(degreeScale(card(0, ['2031-03-01', -12]))).toStrictEqual({ low: -20, high: 10 })
    expect(degreeScale(card(0, ['2031-03-01', 0]))).toStrictEqual({ low: -10, high: 10 })
  })
})

describe('latestVisitLines', () => {
  it("gives the newest measured visit's values, each with its side's whole series", () => {
    const visit = latestVisitLines(patRecord(), index)
    expect(visit?.measuredOn).toBe('2031-03-20')
    expect(
      visit?.lines.map((l) => [l.key, l.series.points.map((p) => p.degrees)]),
    ).toStrictEqual([
      ['knee_flexion|left|active', [138, 138, 139]],
      ['knee_flexion|right|active', [110, 120, 126]],
    ])
  })

  it("reads an amended visit's LATEST version, and skips a movement it doesn't know", () => {
    const visit = latestVisitLines(
      [
        assessment(2, {
          measuredOn: '2031-03-10',
          amendsId: 1,
          amendmentReason: 'x',
          measurements: [value('unknown_movement', null, 1), value('cervical_flexion', null, 30)],
        }),
        assessment(1, { measuredOn: '2031-03-10', amendedById: 2, measurements: [value('cervical_flexion', null, 99)] }),
      ],
      index,
    )
    expect(visit?.lines.map((l) => [l.key, l.series.points.map((p) => p.degrees)])).toStrictEqual([
      ['cervical_flexion|none|active', [30]],
    ])
  })

  it('is null when nothing has been measured', () => {
    expect(latestVisitLines([], index)).toBeNull()
  })

  it("gives each mode its own series (a passive value is not the active one's)", () => {
    const visit = latestVisitLines(
      [
        assessment(1, {
          measurements: [value('knee_flexion', 'right', 120), value('knee_flexion', 'right', 131, { mode: 'passive' })],
        }),
      ],
      index,
    )
    expect(visit?.lines.map((l) => [l.key, l.series.points.map((p) => p.degrees)])).toStrictEqual([
      ['knee_flexion|right|active', [120]],
      ['knee_flexion|right|passive', [131]],
    ])
  })
})