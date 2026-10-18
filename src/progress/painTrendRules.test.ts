import { describe, it, expect } from 'vitest'
import { median, painAfterTrend, sparkSessions } from './painTrendRules'
import type { ScoredSession } from './scoreRules'

// Completed sessions, one a day from 1 June 2031, with these pain-after
// answers (null = asked, not answered).
function sessions(painAfter: (number | null)[]): ScoredSession[] {
  return painAfter.map((value, i) => ({
    id: i + 1,
    localDate: `2031-06-${String(i + 1).padStart(2, '0')}`,
    status: 'completed',
    endReason: null,
    workoutId: 57,
    painBefore: 5,
    painAfter: value,
    mobilityAfter: 6,
  }))
}

describe('median', () => {
  it('takes the middle value of an odd count, whatever the order', () => {
    expect(median([7, 2, 4])).toBe(4)
    expect(median([5])).toBe(5)
  })

  it('takes the mean of the two middle values of an even count', () => {
    expect(median([6, 2])).toBe(4)
    expect(median([1, 9, 3, 4])).toBe(3.5)
  })

  // Sorted as NUMBERS: JavaScript's default sort compares text, which puts
  // "10" before "2" — and 10 is a real score.
  it('sorts 10 above 2', () => {
    expect(median([10, 2, 3])).toBe(3)
  })

  it('leaves the list as it was', () => {
    const values = [7, 2, 4]
    median(values)
    expect(values).toEqual([7, 2, 4])
  })
})

describe('painAfterTrend', () => {
  // Last 3: 2, 2, 3 → 2. The 3 before: 5, 4, 4 → 4. Two points lower.
  it('says lower when the last three are lower than the three before', () => {
    expect(painAfterTrend(sessions([5, 4, 4, 2, 2, 3]))).toBe('lower')
  })

  it('says higher when they are higher', () => {
    expect(painAfterTrend(sessions([2, 3, 2, 5, 4, 4]))).toBe('higher')
  })

  // One point is a change; less is noise.
  it('calls a whole point a change, and half a point steady', () => {
    expect(painAfterTrend(sessions([4, 4, 4, 3, 3, 3]))).toBe('lower')
    expect(painAfterTrend(sessions([3, 3, 3, 4, 4, 4]))).toBe('higher')
    // Before: 4 and 3 → 3.5; recent: 3. Half a point: steady.
    expect(painAfterTrend(sessions([4, 3, 3, 3, 3]))).toBe('steady')
    expect(painAfterTrend(sessions([3, 4, 4, 4, 4]))).toBe('steady')
  })

  // A median: one bad session among the last three doesn't flip the arrow
  // (a mean of 2, 2, 9 would be 4.3 — "higher" than 4).
  it('isn’t moved by one unusual session', () => {
    expect(painAfterTrend(sessions([4, 4, 4, 2, 2, 9]))).toBe('lower')
  })

  // Only the six latest answers count; older ones are history.
  it('compares the last three with the three before, no further back', () => {
    expect(painAfterTrend(sessions([9, 9, 9, 3, 3, 3, 3, 3, 3]))).toBe('steady')
  })

  it('needs four answers: three recent and one before', () => {
    expect(painAfterTrend(sessions([5, 2, 2, 2]))).toBe('lower')
    expect(painAfterTrend(sessions([5, 2, 2]))).toBe(null)
    expect(painAfterTrend(sessions([]))).toBe(null)
  })

  // A blank check-out isn't a value: the answers around it are compared.
  it('leaves unanswered sessions out', () => {
    expect(painAfterTrend(sessions([5, null, 2, 2, null, 2]))).toBe('lower')
    expect(painAfterTrend(sessions([5, null, 2, null, 2]))).toBe(null)
  })
})

describe('sparkSessions', () => {
  it('keeps the last 8 sessions asked pain after, answered or not', () => {
    const list = sessions([1, 2, 3, 4, null, 6, 7, 8, 9, 10])
    expect(sparkSessions(list).map((s) => s.id)).toEqual([3, 4, 5, 6, 7, 8, 9, 10])
  })

  it('leaves out sessions never asked pain after', () => {
    const list = sessions([1, 2, 3])
    list[1] = { ...list[1], status: 'skipped', endReason: 'pain', painAfter: null }
    list[2] = { ...list[2], status: 'in_progress', painAfter: null }
    expect(sparkSessions(list).map((s) => s.id)).toEqual([1])
  })
})