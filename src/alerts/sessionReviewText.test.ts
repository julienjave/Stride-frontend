import { describe, expect, it } from 'vitest'
import { formatMomentDate } from '@/common/formatMomentDate'
import { endNoteLabel, reviewLine, scoreText } from './sessionReviewText'

const SAM = { id: 4, firstName: 'Sam', lastName: 'Okafor' }

describe('reviewLine', () => {
  it("names a colleague, and says You for the reader's own", () => {
    const review = { practitioner: SAM, reviewedAt: '2031-06-11T09:30:00.000Z' }
    const day = formatMomentDate('2031-06-11T09:30:00.000Z', 'en-GB')
    expect(reviewLine(review, 3, 'en-GB')).toBe(`Sam Okafor — ${day}`)
    expect(reviewLine(review, 4, 'en-GB')).toBe(`You — ${day}`)
  })
})

describe('endNoteLabel', () => {
  it('says how the session ended', () => {
    expect(endNoteLabel('skipped')).toBe('Their note when skipping')
    expect(endNoteLabel('incomplete')).toBe('Their note when stopping')
  })
})

describe('scoreText', () => {
  it('gives the number out of 10, 0 included, or that it was left blank', () => {
    expect(scoreText(7)).toBe('7 out of 10')
    expect(scoreText(0)).toBe('0 out of 10')
    expect(scoreText(null)).toBe('Not answered')
  })
})