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
import {
  askedSessions,
  chartRange,
  dateTicks,
  dayCount,
  dayPositions,
  hasAnswer,
  inRange,
  latestAnswered,
  lineRuns,
  nearestIndex,
  oldestFirst,
  wasAsked,
  type ScoredSession,
} from './scoreRules'

// Dates pinned far from today (2031): a rule that silently used the real
// clock can't pass by coincidence.

// A completed session with all three scores unless told otherwise.
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

describe('wasAsked', () => {
  it('asks pain before at every start', () => {
    for (const status of ['completed', 'in_progress', 'incomplete'] as const) {
      expect(wasAsked({ status, endReason: null }, 'painBefore')).toBe(true)
    }
    expect(wasAsked({ status: 'incomplete', endReason: 'not_finished_in_time' }, 'painBefore')).toBe(
      true,
    )
  })

  // The skip page asks for a pain level only when pain is the reason.
  it('asks pain before on a skip only when pain is its reason', () => {
    expect(wasAsked({ status: 'skipped', endReason: 'pain' }, 'painBefore')).toBe(true)
    expect(wasAsked({ status: 'skipped', endReason: 'illness' }, 'painBefore')).toBe(false)
  })

  it('asks the check-out at Finish and at the patient’s Stop', () => {
    for (const key of ['painAfter', 'mobilityAfter'] as const) {
      expect(wasAsked({ status: 'completed', endReason: null }, key)).toBe(true)
      expect(wasAsked({ status: 'incomplete', endReason: 'pain' }, key)).toBe(true)
      expect(wasAsked({ status: 'incomplete', endReason: 'no_time' }, key)).toBe(true)
    }
  })

  // Closed by the app (left open, or the program closed), skipped, or not
  // finished yet: no check-out happened.
  it('never asks the check-out of a session nobody ended', () => {
    for (const key of ['painAfter', 'mobilityAfter'] as const) {
      expect(wasAsked({ status: 'incomplete', endReason: 'not_finished_in_time' }, key)).toBe(false)
      expect(wasAsked({ status: 'incomplete', endReason: 'program_closed' }, key)).toBe(false)
      expect(wasAsked({ status: 'incomplete', endReason: null }, key)).toBe(false)
      expect(wasAsked({ status: 'skipped', endReason: 'pain' }, key)).toBe(false)
      expect(wasAsked({ status: 'in_progress', endReason: null }, key)).toBe(false)
    }
  })
})

describe('oldestFirst', () => {
  it('orders by day, then by id within a day, without touching the list', () => {
    const list = [s(9, '2031-06-05'), s(4, '2031-06-03'), s(7, '2031-06-03'), s(5, '2031-06-04')]
    expect(oldestFirst(list).map((x) => x.id)).toEqual([4, 7, 5, 9])
    expect(list.map((x) => x.id)).toEqual([9, 4, 7, 5])
  })

  // Ids out of step with days (a session done early is created on its day,
  // but an id says nothing about the day): the day decides first.
  it('puts the earlier day first whatever the ids', () => {
    expect(oldestFirst([s(1, '2031-06-09'), s(2, '2031-06-02')]).map((x) => x.id)).toEqual([2, 1])
  })
})

describe('chartRange', () => {
  const open = { startDate: '2031-06-02', endDate: null }

  it('runs from the start to today for an open program', () => {
    expect(chartRange(open, '2031-06-12', [], false)).toStrictEqual({
      range: { from: '2031-06-02', to: '2031-06-12' },
      canCut: false,
    })
  })

  it('stops at an end date that has passed — and not at one still to come', () => {
    expect(
      chartRange({ startDate: '2031-06-02', endDate: '2031-06-08' }, '2031-06-12', [], false)?.range,
    ).toStrictEqual({ from: '2031-06-02', to: '2031-06-08' })
    expect(
      chartRange({ startDate: '2031-06-02', endDate: '2031-06-30' }, '2031-06-12', [], false)?.range,
    ).toStrictEqual({ from: '2031-06-02', to: '2031-06-12' })
  })

  // Closing ends a program YESTERDAY and closes the session opened today:
  // that session's day is past the end date and must still be on the axis.
  it('reaches a session dated after the end date', () => {
    expect(
      chartRange(
        { startDate: '2031-06-02', endDate: '2031-06-11' },
        '2031-06-12',
        [{ localDate: '2031-06-12' }, { localDate: '2031-06-05' }],
        false,
      )?.range,
    ).toStrictEqual({ from: '2031-06-02', to: '2031-06-12' })
  })

  it('has nothing to draw before the program starts', () => {
    expect(chartRange({ startDate: '2031-06-13', endDate: null }, '2031-06-12', [], false)).toBe(null)
  })

  // On its first day, the range is that one day.
  it('draws the first day on its own', () => {
    expect(chartRange({ startDate: '2031-06-12', endDate: null }, '2031-06-12', [], false)).toStrictEqual({
      range: { from: '2031-06-12', to: '2031-06-12' },
      canCut: false,
    })
  })

  // 84 days fit whole; 85 are cut to the last 84 — unless "show all".
  it('keeps the last 12 weeks of a longer program, and all of it on request', () => {
    expect(chartRange({ startDate: '2031-03-21', endDate: null }, '2031-06-12', [], false)).toStrictEqual({
      range: { from: '2031-03-21', to: '2031-06-12' },
      canCut: false,
    })
    expect(chartRange({ startDate: '2031-03-20', endDate: null }, '2031-06-12', [], false)).toStrictEqual({
      range: { from: '2031-03-21', to: '2031-06-12' },
      canCut: true,
    })
    expect(chartRange({ startDate: '2031-03-20', endDate: null }, '2031-06-12', [], true)).toStrictEqual({
      range: { from: '2031-03-20', to: '2031-06-12' },
      canCut: true,
    })
  })
})

describe('inRange and dayCount', () => {
  it('keeps the sessions of the range, both ends included', () => {
    const list = [s(1, '2031-06-01'), s(2, '2031-06-02'), s(3, '2031-06-12'), s(4, '2031-06-13')]
    expect(inRange(list, { from: '2031-06-02', to: '2031-06-12' }).map((x) => x.id)).toEqual([2, 3])
  })

  it('counts every day of the range', () => {
    expect(dayCount({ from: '2031-06-02', to: '2031-06-02' })).toBe(1)
    expect(dayCount({ from: '2031-06-02', to: '2031-06-12' })).toBe(11)
  })
})

describe('dayPositions', () => {
  // A session alone sits in the middle of its day; the axis is DATED, so a
  // later day is further right by its distance in days.
  it('puts each session in the middle of its day', () => {
    const positions = dayPositions([s(1, '2031-06-02'), s(2, '2031-06-09')], '2031-06-02')
    expect(positions).toStrictEqual(
      new Map([
        [1, 0.5],
        [2, 7.5],
      ]),
    )
  })

  // Two on one day share the band at its thirds, in the order given.
  it('spreads sessions of one day side by side', () => {
    const positions = dayPositions(
      [s(1, '2031-06-02'), s(2, '2031-06-04'), s(3, '2031-06-04')],
      '2031-06-02',
    )
    expect(positions.get(1)).toBe(0.5)
    expect(positions.get(2)).toBeCloseTo(2 + 1 / 3)
    expect(positions.get(3)).toBeCloseTo(2 + 2 / 3)
  })
})

describe('lineRuns', () => {
  const runs = (list: ScoredSession[], key: 'painBefore' | 'painAfter' | 'mobilityAfter') =>
    lineRuns(list, key, dayPositions(list, '2031-06-02')).map((run) =>
      run.map((point) => [point.session.id, point.x, point.value]),
    )

  it('joins the answers in order, at their positions', () => {
    expect(
      runs([s(1, '2031-06-02', { painAfter: 4 }), s(2, '2031-06-04', { painAfter: 2 })], 'painAfter'),
    ).toEqual([
      [
        [1, 0.5, 4],
        [2, 2.5, 2],
      ],
    ])
  })

  // Asked, not answered: the line breaks there — no slope nobody reported.
  it('breaks at a session that was asked and did not answer', () => {
    expect(
      runs(
        [
          s(1, '2031-06-02'),
          s(2, '2031-06-03', { painAfter: null }),
          s(3, '2031-06-04'),
          s(4, '2031-06-05'),
        ],
        'painAfter',
      ).map((run) => run.map(([id]) => id)),
    ).toEqual([[1], [3, 4]])
  })

  // Never asked (a skip for illness has no check-out; one in progress hasn't
  // reached it): skipped over, the line goes on.
  it('goes on past a session that was never asked', () => {
    expect(
      runs(
        [
          s(1, '2031-06-02'),
          s(2, '2031-06-03', { status: 'skipped', endReason: 'illness', painBefore: null, painAfter: null }),
          s(3, '2031-06-04', { status: 'in_progress', painAfter: null }),
          s(4, '2031-06-05'),
        ],
        'painAfter',
      ).map((run) => run.map(([id]) => id)),
    ).toEqual([[1, 4]])
  })

  it('starts after, and ends before, unanswered sessions at either end', () => {
    expect(
      runs(
        [
          s(1, '2031-06-02', { mobilityAfter: null }),
          s(2, '2031-06-03'),
          s(3, '2031-06-04', { mobilityAfter: null }),
        ],
        'mobilityAfter',
      ).map((run) => run.map(([id]) => id)),
    ).toEqual([[2]])
  })

  it('draws nothing for a series nobody answered', () => {
    expect(runs([s(1, '2031-06-02', { painBefore: null })], 'painBefore')).toEqual([])
  })

  // 0 is a score (no pain), not "no answer".
  it('draws a 0', () => {
    expect(runs([s(1, '2031-06-02', { painAfter: 0 })], 'painAfter')).toEqual([[[1, 0.5, 0]]])
  })
})

describe('askedSessions and hasAnswer', () => {
  const skippedForIllness = s(2, '2031-06-03', {
    status: 'skipped',
    endReason: 'illness',
    painBefore: null,
    painAfter: null,
    mobilityAfter: null,
  })
  const skippedForPain = s(3, '2031-06-04', {
    status: 'skipped',
    endReason: 'pain',
    painBefore: 7,
    painAfter: null,
    mobilityAfter: null,
  })

  it('keeps the sessions asked any of the chart’s questions', () => {
    const list = [s(1, '2031-06-02'), skippedForIllness, skippedForPain]
    expect(askedSessions(list, ['painBefore', 'painAfter']).map((x) => x.id)).toEqual([1, 3])
    expect(askedSessions(list, ['mobilityAfter']).map((x) => x.id)).toEqual([1])
  })

  it('says whether any session answered any of the keys', () => {
    const blank = s(1, '2031-06-02', { painBefore: null, painAfter: null, mobilityAfter: null })
    expect(hasAnswer([blank], ['painBefore', 'painAfter', 'mobilityAfter'])).toBe(false)
    expect(hasAnswer([blank, { ...blank, id: 2, mobilityAfter: 0 }], ['painBefore', 'painAfter'])).toBe(
      false,
    )
    expect(hasAnswer([blank, { ...blank, id: 2, mobilityAfter: 0 }], ['mobilityAfter'])).toBe(true)
    expect(hasAnswer([], ['painBefore'])).toBe(false)
  })
})

describe('latestAnswered', () => {
  it('finds the most recent session that answered', () => {
    const list = [s(1, '2031-06-02'), s(2, '2031-06-04'), s(3, '2031-06-05', { painAfter: null })]
    expect(latestAnswered(list, 'painAfter')?.id).toBe(2)
    expect(latestAnswered(list, 'painBefore')?.id).toBe(3)
  })

  it('finds none when nobody answered', () => {
    expect(latestAnswered([s(1, '2031-06-02', { painAfter: null })], 'painAfter')).toBe(null)
    expect(latestAnswered([], 'painAfter')).toBe(null)
  })
})

describe('dateTicks', () => {
  it('names every day of a short range', () => {
    expect(dateTicks({ from: '2031-06-02', to: '2031-06-04' }, 4)).toEqual([
      '2031-06-02',
      '2031-06-03',
      '2031-06-04',
    ])
    expect(dateTicks({ from: '2031-06-02', to: '2031-06-05' }, 4)).toEqual([
      '2031-06-02',
      '2031-06-03',
      '2031-06-04',
      '2031-06-05',
    ])
  })

  // 22 days, 4 labels: the first, the last, and two evenly between
  // (days 7 and 14 of 0–21).
  it('spreads a longer range evenly, first and last included', () => {
    expect(dateTicks({ from: '2031-06-02', to: '2031-06-23' }, 4)).toEqual([
      '2031-06-02',
      '2031-06-09',
      '2031-06-16',
      '2031-06-23',
    ])
    expect(dateTicks({ from: '2031-06-02', to: '2031-06-06' }, 4)).toEqual([
      '2031-06-02',
      '2031-06-03',
      '2031-06-05',
      '2031-06-06',
    ])
  })
})

describe('nearestIndex', () => {
  it('picks the closest point', () => {
    expect(nearestIndex([0.5, 2.5, 7.5], 2)).toBe(1)
    expect(nearestIndex([0.5, 2.5, 7.5], 6)).toBe(2)
    expect(nearestIndex([0.5, 2.5, 7.5], -3)).toBe(0)
    expect(nearestIndex([0.5, 2.5, 7.5], 40)).toBe(2)
  })

  it('gives a tie to the earlier point', () => {
    expect(nearestIndex([1, 3], 2)).toBe(0)
  })

  it('finds nothing among no points', () => {
    expect(nearestIndex([], 2)).toBe(-1)
  })
})