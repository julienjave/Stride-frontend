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

  // A failed step-up (decisions §16, privacy and security pass 2) — its own
  // words, not ones made from its name ("Step up failed").
  it('words a failed step-up', () => {
    expect(actionLabel('STEP_UP_FAILED')).toBe(
      'Entered a wrong password or code to confirm a change',
    )
  })

  // The records export (decisions §20): the patient's copy, and the
  // emailed link's two actions.
  it('words the records export actions', () => {
    expect(actionLabel('RECORDS_EXPORTED')).toBe('Downloaded a copy of a health record')
    expect(actionLabel('RECORDS_EXPORT_LINK_SENT')).toBe('Emailed a health record download link')
    expect(actionLabel('RECORDS_EXPORT_LINK_REFUSED')).toBe(
      'Entered a wrong date of birth on a download link',
    )
  })

  // The complaint review (decisions §25, pass 2).
  it('words the complaint review actions', () => {
    expect(actionLabel('COMPLAINT_REVIEW_OPENED')).toBe('Opened a complaint review of a health record')
    expect(actionLabel('COMPLAINT_REVIEW_ENDED')).toBe('Ended a complaint review early')
    expect(actionLabel('COMPLAINT_REVIEW_NOTICE_REVIEWED')).toBe(
      'Marked a complaint review notice as reviewed',
    )
  })

  // The legal disclosure (decisions §25, pass 3).
  it('words the legal disclosure actions', () => {
    expect(actionLabel('LEGAL_DISCLOSURE_MADE')).toBe('Disclosed a health record (legal requirement)')
    expect(actionLabel('LEGAL_DISCLOSURE_NOTICE_REVIEWED')).toBe(
      'Marked a disclosure notice as reviewed',
    )
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