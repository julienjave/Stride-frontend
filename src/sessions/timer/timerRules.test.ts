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
  HOLD_START,
  STOPWATCH_START,
  advance,
  clockText,
  durationWords,
  heldMs,
  holdEvent,
  holdKeepsScreenOn,
  holdPlan,
  pressMain,
  pressStopwatch,
  remainingMs,
  resetHold,
  stopwatchMs,
  type HoldState,
} from './timerRules'

// Monotonic-clock moments: arbitrary numbers, far from 0, so a rule that
// confused "a moment" with "a duration" gives a visibly wrong answer.
const T = 1_000_000
const PLANK = { holdMs: 20_000, sets: 3 }

describe('holdPlan', () => {
  it('a duration with sets: that many holds of that length', () => {
    expect(holdPlan({ durationInSeconds: 20, sets: 3 })).toStrictEqual({ holdMs: 20_000, sets: 3 })
  })

  it('a duration without sets (or 0 sets) is one hold', () => {
    expect(holdPlan({ durationInSeconds: 30, sets: null })).toStrictEqual({ holdMs: 30_000, sets: 1 })
    expect(holdPlan({ durationInSeconds: 30, sets: 0 })).toStrictEqual({ holdMs: 30_000, sets: 1 })
  })

  it('nothing to time without a duration, or with 0 — the stopwatch instead', () => {
    expect(holdPlan({ durationInSeconds: null, sets: 3 })).toBeNull()
    expect(holdPlan({ durationInSeconds: 0, sets: 3 })).toBeNull()
  })

  it('a negative duration (no database CHECK refuses one) is nothing to time either', () => {
    expect(holdPlan({ durationInSeconds: -5, sets: 3 })).toBeNull()
  })

  it('negative sets are one hold', () => {
    expect(holdPlan({ durationInSeconds: 30, sets: -2 })).toStrictEqual({ holdMs: 30_000, sets: 1 })
  })
})

describe('the hold countdown', () => {
  it('Start runs the first set from that moment; the time left is calculated from it', () => {
    const running = pressMain(HOLD_START, T)
    expect(running).toStrictEqual({ phase: 'running', set: 1, since: T, heldBefore: 0 })
    expect(remainingMs(running, PLANK, T + 6_500)).toBe(13_500)
  })

  it('a pause keeps what was held; Resume counts on from it, not from the start', () => {
    const paused = pressMain(pressMain(HOLD_START, T), T + 6_000)
    expect(paused).toStrictEqual({ phase: 'paused', set: 1, held: 6_000 })
    // However long the pause lasts, nothing changes.
    expect(remainingMs(paused, PLANK, T + 600_000)).toBe(14_000)

    const resumed = pressMain(paused, T + 60_000)
    expect(resumed).toStrictEqual({ phase: 'running', set: 1, since: T + 60_000, heldBefore: 6_000 })
    expect(remainingMs(resumed, PLANK, T + 65_000)).toBe(9_000)
  })

  it('never more than the hold, never less than 0 — even with a clock read before the start', () => {
    const running = pressMain(HOLD_START, T)
    expect(remainingMs(running, PLANK, T - 5_000)).toBe(20_000)
    expect(heldMs(running, T - 5_000)).toBe(0)
    expect(remainingMs(running, PLANK, T + 99_000)).toBe(0)
  })

  it('nothing held before Start and after the last set', () => {
    expect(heldMs(HOLD_START, T)).toBe(0)
    expect(remainingMs(HOLD_START, PLANK, T)).toBe(20_000)
    expect(remainingMs({ phase: 'all_done' }, PLANK, T)).toBe(0)
  })

  it('a hold over moves to the NEXT set, waiting for Start (no rest timer)', () => {
    const running = pressMain(HOLD_START, T)
    // One millisecond before the end: still running — the same object.
    expect(advance(running, PLANK, T + 19_999)).toBe(running)
    expect(advance(running, PLANK, T + 20_000)).toStrictEqual({ phase: 'ready', set: 2 })
    // Read late (a tab in the background): the same answer, not two sets on.
    expect(advance(running, PLANK, T + 95_000)).toStrictEqual({ phase: 'ready', set: 2 })
  })

  it('the last set over: all done; "Start over" goes back to set 1', () => {
    const lastSet: HoldState = { phase: 'running', set: 3, since: T, heldBefore: 0 }
    const done = advance(lastSet, PLANK, T + 20_000)
    expect(done).toStrictEqual({ phase: 'all_done' })
    expect(pressMain(done, T + 30_000)).toStrictEqual({ phase: 'ready', set: 1 })
  })

  it('a single hold is done after one set', () => {
    const running = pressMain(HOLD_START, T)
    expect(advance(running, { holdMs: 30_000, sets: 1 }, T + 30_000)).toStrictEqual({
      phase: 'all_done',
    })
  })

  it('only a RUNNING hold advances — a paused one at 0 time left stays paused', () => {
    const paused: HoldState = { phase: 'paused', set: 1, held: 20_000 }
    expect(advance(paused, PLANK, T)).toBe(paused)
    expect(advance(HOLD_START, PLANK, T)).toBe(HOLD_START)
  })

  it('Reset restarts the current hold and keeps the sets already held', () => {
    expect(resetHold({ phase: 'running', set: 2, since: T, heldBefore: 3_000 })).toStrictEqual({
      phase: 'ready',
      set: 2,
    })
    expect(resetHold({ phase: 'paused', set: 3, held: 5_000 })).toStrictEqual({
      phase: 'ready',
      set: 3,
    })
  })

  it('Reset does nothing when no hold is under way', () => {
    const between: HoldState = { phase: 'ready', set: 2 }
    expect(resetHold(between)).toBe(between)
    const done: HoldState = { phase: 'all_done' }
    expect(resetHold(done)).toBe(done)
  })
})

describe('holdEvent — what to announce and when to beep', () => {
  const ready1: HoldState = { phase: 'ready', set: 1 }
  const running1: HoldState = { phase: 'running', set: 1, since: T, heldBefore: 0 }
  const paused1: HoldState = { phase: 'paused', set: 1, held: 4_000 }
  const ready2: HoldState = { phase: 'ready', set: 2 }

  it.each<[string, HoldState, HoldState, string | null]>([
    ['Start', ready1, running1, 'started'],
    ['Start of a later set', ready2, { ...running1, set: 2 }, 'started'],
    ['Pause', running1, paused1, 'paused'],
    ['Resume', paused1, running1, 'resumed'],
    ['a set over', running1, ready2, 'set_done'],
    ['the last set over', { ...running1, set: 3 }, { phase: 'all_done' }, 'all_done'],
    ['Reset while running', running1, ready1, 'reset'],
    ['Reset while paused', paused1, ready1, 'reset'],
    ['Start over (said by the button itself)', { phase: 'all_done' }, ready1, null],
  ])('%s', (_, before, after, event) => {
    expect(holdEvent(before, after)).toBe(event)
  })

  it('no change, nothing to say', () => {
    expect(holdEvent(running1, running1)).toBeNull()
  })

  it('all done only after a RUNNING hold — never when merely shown again', () => {
    expect(holdEvent(ready2, { phase: 'all_done' })).toBeNull()
  })
})

describe('holdKeepsScreenOn', () => {
  it.each<[string, HoldState, boolean]>([
    ['before the first set', { phase: 'ready', set: 1 }, false],
    ['while holding', { phase: 'running', set: 1, since: T, heldBefore: 0 }, true],
    ['between two sets', { phase: 'ready', set: 2 }, true],
    ['paused — the patient chose to stop', { phase: 'paused', set: 2, held: 1 }, false],
    ['after the last set', { phase: 'all_done' }, false],
  ])('%s', (_, state, on) => {
    expect(holdKeepsScreenOn(state)).toBe(on)
  })
})

describe('the stopwatch', () => {
  it('counts up from Start, pauses, and counts on from where it was', () => {
    const running = pressStopwatch(STOPWATCH_START, T)
    expect(stopwatchMs(running, T + 4_200)).toBe(4_200)

    const paused = pressStopwatch(running, T + 4_200)
    expect(paused).toStrictEqual({ since: null, countedBefore: 4_200 })
    expect(stopwatchMs(paused, T + 900_000)).toBe(4_200)

    const resumed = pressStopwatch(paused, T + 10_000)
    expect(resumed).toStrictEqual({ since: T + 10_000, countedBefore: 4_200 })
    expect(stopwatchMs(resumed, T + 11_000)).toBe(5_200)
  })

  it('never counts backwards from a clock read before its start', () => {
    expect(stopwatchMs({ since: T, countedBefore: 1_000 }, T - 500)).toBe(1_000)
  })

  it('a new stopwatch shows 0', () => {
    expect(stopwatchMs(STOPWATCH_START, T)).toBe(0)
  })
})

describe('clockText', () => {
  it('a countdown rounds UP: the full time at the start, 0:00 only at the end', () => {
    expect(clockText(20_000, 'up')).toBe('0:20')
    expect(clockText(19_001, 'up')).toBe('0:20')
    expect(clockText(19_000, 'up')).toBe('0:19')
    expect(clockText(1, 'up')).toBe('0:01')
    expect(clockText(0, 'up')).toBe('0:00')
  })

  it('a stopwatch rounds DOWN', () => {
    expect(clockText(999, 'down')).toBe('0:00')
    expect(clockText(1_000, 'down')).toBe('0:01')
    expect(clockText(59_999, 'down')).toBe('0:59')
  })

  it('minutes, and hours from an hour', () => {
    expect(clockText(725_000, 'down')).toBe('12:05')
    expect(clockText(3_599_000, 'down')).toBe('59:59')
    expect(clockText(3_600_000, 'down')).toBe('1:00:00')
    expect(clockText(3_725_000, 'down')).toBe('1:02:05')
  })
})

describe('durationWords', () => {
  it.each<[number, string]>([
    [0, '0 seconds'],
    [1, '1 second'],
    [20, '20 seconds'],
    [60, '1 minute'],
    [61, '1 minute 1 second'],
    [90, '1 minute 30 seconds'],
    [120, '2 minutes'],
  ])('%i → %s', (seconds, words) => {
    expect(durationWords(seconds)).toBe(words)
  })
})