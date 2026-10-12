import { describe, it, expect } from 'vitest'
import {
  addDays,
  formatShortDate,
  isCalendarDate,
  isoWeekday,
  localDateString,
} from './calendarDate'

// Dates pinned far from today (2031): a rule that silently used the real
// clock can't pass by coincidence.

describe('isCalendarDate', () => {
  it('accepts a real day in the exact YYYY-MM-DD shape', () => {
    expect(isCalendarDate('2031-06-01')).toBe(true)
    // 2028 is a leap year: 29 February exists.
    expect(isCalendarDate('2028-02-29')).toBe(true)
  })

  it('refuses a day that does not exist, though it has the right shape', () => {
    // The case a regex alone gets wrong: 2031 is not a leap year, and
    // Date.UTC would quietly turn 29 February into 1 March.
    expect(isCalendarDate('2031-02-29')).toBe(false)
    expect(isCalendarDate('2031-04-31')).toBe(false)
    expect(isCalendarDate('2031-13-01')).toBe(false)
  })

  it('refuses any other shape', () => {
    expect(isCalendarDate('')).toBe(false)
    expect(isCalendarDate('2031-6-1')).toBe(false)
    expect(isCalendarDate('2031-06-01T00:00:00Z')).toBe(false)
    expect(isCalendarDate('01/06/2031')).toBe(false)
  })
})

describe('addDays', () => {
  it('adds and removes days across month and year ends', () => {
    expect(addDays('2031-06-01', 3)).toBe('2031-06-04')
    expect(addDays('2031-01-31', 1)).toBe('2031-02-01')
    expect(addDays('2031-12-31', 1)).toBe('2032-01-01')
    expect(addDays('2031-01-01', -1)).toBe('2030-12-31')
    expect(addDays('2031-06-01', 0)).toBe('2031-06-01')
  })

  // Daylight-saving days last 23 or 25 hours in local time, and a version
  // computing in LOCAL time (setDate instead of setUTCDate) lands on the
  // wrong day around them. The machine's time zone decides which change
  // date exposes it, so there's one case per side of the Atlantic: in
  // UTC both versions pass; run with TZ=Europe/Paris or
  // TZ=America/Montreal and the local-time version fails.
  it('counts whole days across a daylight-saving change, Europe (30 March 2031)', () => {
    expect(addDays('2031-03-29', 1)).toBe('2031-03-30')
    expect(addDays('2031-03-29', 2)).toBe('2031-03-31')
  })

  it('counts whole days across a daylight-saving change, North America (9 March 2031)', () => {
    expect(addDays('2031-03-08', 1)).toBe('2031-03-09')
    expect(addDays('2031-03-08', 2)).toBe('2031-03-10')
  })
})

describe('isoWeekday', () => {
  it('numbers Monday 1 … Sunday 7', () => {
    expect(isoWeekday('2031-06-02')).toBe(1) // Monday
    expect(isoWeekday('2031-06-05')).toBe(4) // Thursday
    // Sunday is 7, not JavaScript's 0 — the case getUTCDay() alone gets wrong.
    expect(isoWeekday('2031-06-01')).toBe(7)
  })
})

describe('localDateString', () => {
  it("is the viewer's local date, zero-padded", () => {
    // Built from local parts, so 00:30 on 5 January is the 5th everywhere.
    expect(localDateString(new Date(2031, 0, 5, 0, 30))).toBe('2031-01-05')
    expect(localDateString(new Date(2031, 11, 31, 23, 30))).toBe('2031-12-31')
  })
})

describe('formatShortDate', () => {
  it('shows the weekday, day and month in the given locale', () => {
    expect(formatShortDate('2031-01-06', 'en-GB')).toBe('Mon 6 Jan')
    expect(formatShortDate('2031-01-06', 'fr-FR')).toBe('lun. 6 janv.')
  })
})