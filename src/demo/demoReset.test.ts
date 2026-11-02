import { describe, expect, it } from 'vitest'
import { nextReset, resetTimeOfDay, type DemoReset } from './demoReset'

// The demo's real setting (decisions §46): 04:00 Eastern.
const toronto: DemoReset = { time: '04:00', timeZone: 'America/Toronto' }

// Every expectation is an INSTANT written in UTC, so these tests read the
// same whatever zone the machine running them is in.
describe('nextReset', () => {
  it('is today when today’s has not happened yet', () => {
    // 01:00 in Toronto (winter, −05:00) = 06:00 UTC.
    expect(nextReset(toronto, new Date('2027-01-15T06:00:00Z')).toISOString()).toBe(
      '2027-01-15T09:00:00.000Z',
    )
  })

  // A real `new Date()` has milliseconds; Intl reads whole seconds. The
  // reset is still on the minute.
  it('lands on the exact minute from a moment with milliseconds', () => {
    expect(nextReset(toronto, new Date('2027-01-15T06:00:00.789Z')).toISOString()).toBe(
      '2027-01-15T09:00:00.000Z',
    )
  })

  it('is tomorrow once today’s has passed', () => {
    // 10:00 in Toronto = 15:00 UTC.
    expect(nextReset(toronto, new Date('2027-01-15T15:00:00Z')).toISOString()).toBe(
      '2027-01-16T09:00:00.000Z',
    )
  })

  // At the very moment of a reset, the NEXT one is tomorrow's.
  it('is tomorrow at the exact moment of today’s', () => {
    expect(nextReset(toronto, new Date('2027-01-15T09:00:00Z')).toISOString()).toBe(
      '2027-01-16T09:00:00.000Z',
    )
  })

  // The zone's calendar, not UTC's: at 02:00 UTC on the 16th it is still the
  // 15th, 21:00, in Toronto — the next reset is the 16th's.
  it('counts days in the zone, not in UTC', () => {
    expect(nextReset(toronto, new Date('2027-01-16T02:00:00Z')).toISOString()).toBe(
      '2027-01-16T09:00:00.000Z',
    )
  })

  it('uses the summer offset in summer', () => {
    // −04:00: 04:00 in Toronto = 08:00 UTC.
    expect(nextReset(toronto, new Date('2027-07-15T06:00:00Z')).toISOString()).toBe(
      '2027-07-15T08:00:00.000Z',
    )
  })

  // Toronto's clocks go forward at 02:00 on Sunday 14 March 2027: the night
  // before is still winter, the night after already summer.
  it('takes each night’s own offset across a clock change', () => {
    expect(nextReset(toronto, new Date('2027-03-13T12:00:00Z')).toISOString()).toBe(
      '2027-03-14T08:00:00.000Z',
    )
    expect(nextReset(toronto, new Date('2027-03-12T12:00:00Z')).toISOString()).toBe(
      '2027-03-13T09:00:00.000Z',
    )
  })

  it('rolls over the end of a month and of a year', () => {
    expect(nextReset(toronto, new Date('2027-12-31T15:00:00Z')).toISOString()).toBe(
      '2028-01-01T09:00:00.000Z',
    )
  })

  // A zone ahead of UTC, at a time with minutes.
  it('works east of UTC too', () => {
    const paris: DemoReset = { time: '23:30', timeZone: 'Europe/Paris' }
    expect(nextReset(paris, new Date('2027-01-15T12:00:00Z')).toISOString()).toBe(
      '2027-01-15T22:30:00.000Z',
    )
  })
})

describe('resetTimeOfDay', () => {
  const winter = new Date('2027-01-15T06:00:00Z')

  it.each([
    ['America/Toronto', '4:00 AM'],
    ['America/Halifax', '5:00 AM'],
    ['America/St_Johns', '5:30 AM'],
    ['America/Chicago', '3:00 AM'],
    ['Europe/Paris', '10:00 AM'],
  ])('reads the 04:00 Eastern reset in %s as %s', (timeZone, expected) => {
    expect(resetTimeOfDay(toronto, winter, { locale: 'en-US', timeZone })).toBe(expected)
  })

  // Europe moves its clocks on 28 March 2027, Toronto on the 14th: for those
  // two weeks the same reset is an hour earlier in Paris.
  it('follows the gap between two zones’ clock changes', () => {
    const between = new Date('2027-03-20T12:00:00Z')
    expect(
      resetTimeOfDay(toronto, between, { locale: 'en-US', timeZone: 'Europe/Paris' }),
    ).toBe('9:00 AM')
  })

  it('writes the time in the viewer’s language', () => {
    expect(
      resetTimeOfDay(toronto, winter, { locale: 'fr-FR', timeZone: 'Europe/Paris' }),
    ).toBe('10:00')
  })
})
