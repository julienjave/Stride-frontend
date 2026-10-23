import { describe, expect, it } from 'vitest'
import { actionLabel, formatEntryDay, formatEntryMoment } from './auditWording'

describe('actionLabel', () => {
  it('gives an action its written words', () => {
    expect(actionLabel('PROGRAM_SUMMARY_VIEWED')).toBe('Viewed a program’s progress')
    expect(actionLabel('LOGOUT')).toBe('Signed out')
    expect(actionLabel('CONVERSATION_READ')).toBe('Read new messages')
  })

  // Two-factor sign-in, pass 2's three actions (decisions §14).
  it('words the recovery-code and reset actions', () => {
    expect(actionLabel('MFA_RECOVERY_CODE_USED')).toBe('Signed in with a recovery code')
    expect(actionLabel('MFA_RECOVERY_CODES_REGENERATED')).toBe(
      'Made new two-factor recovery codes',
    )
    expect(actionLabel('MFA_RESET_BY_ADMIN')).toBe('Reset two-factor sign-in for an account')
  })

  // An action the table doesn't know is still readable.
  it('makes words from the name of an action it does not know', () => {
    expect(actionLabel('PROGRAM_PAUSED_BY_ROBOT')).toBe('Program paused by robot')
    expect(actionLabel('MFA2_RESET')).toBe('Mfa2 reset')
  })

  it('shows anything else exactly as stored', () => {
    expect(actionLabel('POST /users/6')).toBe('POST /users/6')
    expect(actionLabel('Program_viewed')).toBe('Program_viewed')
    expect(actionLabel('_LEADING')).toBe('_LEADING')
    expect(actionLabel('TRAILING_')).toBe('TRAILING_')
  })

  // Only the table's OWN names count — not what every object inherits.
  it('does not mistake an inherited name for an action', () => {
    expect(actionLabel('toString')).toBe('toString')
    expect(actionLabel('constructor')).toBe('constructor')
  })
})

describe('formatEntryMoment', () => {
  it('shows the day and the time to the minute, in the given zone', () => {
    expect(formatEntryMoment('2031-03-10T13:02:59.000Z', 'en-GB', 'UTC')).toBe(
      '10 Mar 2031, 13:02',
    )
    expect(formatEntryMoment('2031-03-10T13:02:59.000Z', 'en-GB', 'Europe/Paris')).toBe(
      '10 Mar 2031, 14:02',
    )
  })
})

describe('formatEntryDay', () => {
  // The same day in every zone — the run under TZ=America/Montreal is where
  // a day read as LOCAL midnight would turn into the 9th.
  it('shows a calendar day as that day, whatever the zone', () => {
    expect(formatEntryDay('2031-03-10', 'en-GB')).toBe('10 Mar 2031')
    expect(formatEntryDay('2031-12-31', 'en-GB')).toBe('31 Dec 2031')
  })
})