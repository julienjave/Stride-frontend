import { describe, it, expect } from 'vitest'
import { formatMomentDate } from './formatMomentDate'

describe('formatMomentDate', () => {
  it("formats a moment as a long date in the viewer's language", () => {
    // Noon UTC: the same calendar day in every time zone from UTC-11 to
    // UTC+11, so the test doesn't depend on the machine's zone.
    expect(formatMomentDate('2026-10-08T12:00:00.000Z', 'en-US')).toBe('October 8, 2026')
    expect(formatMomentDate('2026-10-08T12:00:00.000Z', 'fr-FR')).toBe('8 octobre 2026')
  })
})