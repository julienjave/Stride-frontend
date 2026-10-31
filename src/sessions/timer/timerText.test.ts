import { describe, it, expect } from 'vitest'
import { holdAnnouncement, holdHeadline, holdHint, holdMainLabel } from './timerText'
import type { HoldState } from './timerRules'

const PLANK = { holdMs: 20_000, sets: 3 }
const POSE = { holdMs: 90_000, sets: 1 }

const ready1: HoldState = { phase: 'ready', set: 1 }
const ready2: HoldState = { phase: 'ready', set: 2 }
const running2: HoldState = { phase: 'running', set: 2, since: 0, heldBefore: 0 }
const paused2: HoldState = { phase: 'paused', set: 2, held: 1 }
const done: HoldState = { phase: 'all_done' }

describe('holdHeadline', () => {
  it('the hold in words, and which set when there are several', () => {
    expect(holdHeadline(running2, PLANK)).toBe('Hold for 20 seconds · set 2 of 3')
    expect(holdHeadline(ready1, POSE)).toBe('Hold for 1 minute 30 seconds')
  })

  it('after the last set', () => {
    expect(holdHeadline(done, PLANK)).toBe('All 3 sets held')
    expect(holdHeadline(done, POSE)).toBe('Hold done')
  })
})

describe('holdHint', () => {
  it.each<[string, HoldState, string]>([
    ['before the first set', ready1, 'Get into position, then press Start.'],
    ['between sets', ready2, "Set 1 done. Start set 2 when you're ready."],
    ['before the third set', { phase: 'ready', set: 3 }, "Set 2 done. Start set 3 when you're ready."],
    ['holding', running2, 'Holding…'],
    ['paused', paused2, 'Paused.'],
    ['all done — Done stays the patient’s tap', done, 'Press Done below if you managed it.'],
  ])('%s', (_, state, hint) => {
    expect(holdHint(state)).toBe(hint)
  })
})

describe('holdMainLabel', () => {
  it.each<[HoldState, string]>([
    [ready1, 'Start'],
    [ready2, 'Start set 2'],
    [running2, 'Pause'],
    [paused2, 'Resume'],
    [done, 'Start over'],
  ])('%o → %s', (state, label) => {
    expect(holdMainLabel(state)).toBe(label)
  })
})

describe('holdAnnouncement', () => {
  it('several sets: each sentence names the set', () => {
    expect(holdAnnouncement('started', running2, PLANK)).toBe('Set 2 of 3: hold for 20 seconds.')
    expect(holdAnnouncement('reset', ready2, PLANK)).toBe('Set 2 of 3: hold reset.')
    expect(holdAnnouncement('set_done', ready2, PLANK)).toBe(
      "Set 1 done. Start set 2 when you're ready.",
    )
    expect(holdAnnouncement('all_done', done, PLANK)).toBe(
      'All 3 sets held. Press Done if you managed it.',
    )
  })

  it('one hold: no set count', () => {
    expect(holdAnnouncement('started', { ...running2, set: 1 }, POSE)).toBe(
      'Hold for 1 minute 30 seconds.',
    )
    expect(holdAnnouncement('reset', ready1, POSE)).toBe('Hold reset.')
    expect(holdAnnouncement('all_done', done, POSE)).toBe('Hold done. Press Done if you managed it.')
  })

  it('pause and resume', () => {
    expect(holdAnnouncement('paused', paused2, PLANK)).toBe('Hold paused.')
    expect(holdAnnouncement('resumed', running2, PLANK)).toBe('Hold resumed.')
  })
})