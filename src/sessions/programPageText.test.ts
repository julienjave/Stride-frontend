import { describe, it, expect } from 'vitest'
import { equipmentText, makeUpTodayLabel, sessionLinkLabel } from './programPageText'

// en-GB pinned: dates read "Wed 4 Jun" whatever the test machine's language.
const L = 'en-GB'

describe('sessionLinkLabel', () => {
  it('starts with the visible words and names the session — differently for each kind', () => {
    expect(sessionLinkLabel('2031-06-04', 'counted', L)).toBe('View session of Wed 4 Jun')
    expect(sessionLinkLabel('2031-06-04', 'stopped', L)).toBe('View session of Wed 4 Jun (stopped)')
    expect(sessionLinkLabel('2031-06-04', 'extra', L)).toBe('View session of Wed 4 Jun (extra)')
  })
})

describe('makeUpTodayLabel', () => {
  it("names the missed session as the hub does", () => {
    expect(makeUpTodayLabel('2031-06-04', 'B · Strength', L)).toBe(
      'Make it up today: B · Strength from Wed 4 Jun',
    )
    expect(makeUpTodayLabel('2031-06-04', null, L)).toBe('Make it up today: the session of Wed 4 Jun')
  })
})

describe('equipmentText', () => {
  it('lists the equipment, or says nothing with none', () => {
    expect(equipmentText(['band', 'chair'])).toBe('Equipment: band, chair')
    expect(equipmentText([])).toBeNull()
  })
})