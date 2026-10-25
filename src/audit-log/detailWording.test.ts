import { describe, it, expect } from 'vitest'
import { describeDetails } from './auditDetails'
import { detailWording, valueWords } from './detailWording'

// Plain words for stored values (2026-10-25). Tested through describeDetails —
// what the screen shows — plus the two lookups' edges.

// One labelled value per item, as [label, value] pairs.
function shown(details: unknown, action?: string) {
  return describeDetails(details, {}, action).map((item) =>
    item.type === 'value' ? [item.label, item.value] : ['(changes)', ''],
  )
}

describe('STEP_UP_FAILED', () => {
  it('says which change it was for, why it failed, and how many in a row', () => {
    expect(
      shown(
        { purpose: 'password_change', reason: 'wrong_password', consecutiveFailures: 3 },
        'STEP_UP_FAILED',
      ),
    ).toStrictEqual([
      ['For', 'Changing the password'],
      ['Reason', 'Wrong password'],
      ['Failures in a row', '3'],
    ])
  })

  // Postgres reorders jsonb keys (shorter first): stored as reason, purpose,
  // …; shown in the table's order, an unknown key after the known ones.
  it("shows the details in the table's order, whatever order they're stored in", () => {
    expect(
      shown(
        { reason: 'wrong_code', extra: 'x', purpose: 'mfa_disable', consecutiveFailures: 1 },
        'STEP_UP_FAILED',
      ).map(([label]) => label),
    ).toStrictEqual(['For', 'Reason', 'Failures in a row', 'Extra'])
  })

  it('has words for every purpose', () => {
    const words = (purpose: string) => shown({ purpose }, 'STEP_UP_FAILED')[0][1]
    expect(
      [
        'email_change',
        'password_change',
        'mfa_setup',
        'mfa_disable',
        'recovery_codes',
        'mfa_reset',
      ].map(words),
    ).toStrictEqual([
      'Changing the email address',
      'Changing the password',
      'Setting up two-factor sign-in',
      'Turning off two-factor sign-in',
      'Getting new recovery codes',
      "Resetting someone's two-factor sign-in",
    ])
  })

  it('has words for every reason', () => {
    const words = (reason: string) => shown({ reason }, 'STEP_UP_FAILED')[0][1]
    expect(
      ['wrong_password', 'wrong_code', 'code_already_used', 'wrong_recovery_code'].map(words),
    ).toStrictEqual([
      'Wrong password',
      'Wrong code',
      'A code that was already used',
      "A recovery code that isn't valid or was already used",
    ])
  })

  it('says when the session was ended — and nothing made up for false', () => {
    expect(shown({ signedOut: true }, 'STEP_UP_FAILED')).toStrictEqual([
      ['Signed out', 'Yes — this session was ended'],
    ])
    expect(shown({ signedOut: false }, 'STEP_UP_FAILED')).toStrictEqual([
      ['Signed out', 'false'],
    ])
  })
})

describe('MFA_LOGIN_FAILURE', () => {
  it('has words for every reason a code was refused', () => {
    const words = (reason: string) => shown({ reason }, 'MFA_LOGIN_FAILURE')[0]
    expect(['wrong_code', 'code_already_used', 'wrong_recovery_code'].map(words)).toStrictEqual([
      ['Reason', 'Wrong code'],
      ['Reason', 'A code that was already used'],
      ['Reason', "A recovery code that isn't valid or was already used"],
    ])
  })

  // Keyed by action: a sign-in's second step never fails on a password, so
  // the step-up's 'wrong_password' has no words here.
  it("doesn't borrow another action's words", () => {
    expect(shown({ reason: 'wrong_password' }, 'MFA_LOGIN_FAILURE')).toStrictEqual([
      ['Reason', 'wrong_password'],
    ])
  })
})

describe('EMAIL_CHANGE_CANCELLED', () => {
  it('says how the change was cancelled', () => {
    expect(shown({ reason: 'cancelled_in_app' }, 'EMAIL_CHANGE_CANCELLED')).toStrictEqual([
      ['Reason', 'Cancelled in the app'],
    ])
    expect(shown({ reason: 'cancelled_by_email_link' }, 'EMAIL_CHANGE_CANCELLED')).toStrictEqual([
      ['Reason', 'Cancelled from the link in the email'],
    ])
  })
})

describe('anything the table does not know', () => {
  it('shows a value it has no words for as stored', () => {
    expect(shown({ reason: 'something_new' }, 'STEP_UP_FAILED')).toStrictEqual([
      ['Reason', 'something_new'],
    ])
  })

  it("leaves other actions' details as they were", () => {
    expect(
      shown({ reason: 'No longer share a clinic', clinicId: 3 }, 'CARE_TEAM_ENDED'),
    ).toStrictEqual([
      ['Reason', 'No longer share a clinic'],
      ['Clinic ID', '#3'],
    ])
  })

  it('keeps the stored order for actions the table does not know', () => {
    expect(
      shown({ b: 1, a: 2 }, 'CARE_TEAM_ENDED').map(([label]) => label),
    ).toStrictEqual(['B', 'A'])
    expect(shown({ b: 1, a: 2 }).map(([label]) => label)).toStrictEqual(['B', 'A'])
    expect(shown({ b: 1, a: 2 }, 'toString').map(([label]) => label)).toStrictEqual(['B', 'A'])
  })

  it('uses the generic words without an action', () => {
    expect(shown({ purpose: 'password_change' })).toStrictEqual([['Purpose', 'password_change']])
  })

  // Stored data decides the lookups: an inherited name must find nothing.
  it('finds nothing for inherited names', () => {
    expect(detailWording('toString', 'reason')).toBeUndefined()
    // A function has OWN keys (`length`, `name`): an inherited action must
    // not be searched at all.
    expect(detailWording('toString', 'length')).toBeUndefined()
    expect(detailWording('STEP_UP_FAILED', 'constructor')).toBeUndefined()
    expect(valueWords(detailWording('STEP_UP_FAILED', 'reason'), 'toString')).toBeUndefined()
    expect(shown({ toString: 'x' }, 'STEP_UP_FAILED')).toStrictEqual([['To string', 'x']])
  })

  it('gives words only to text and true / false, never to numbers or lists', () => {
    const wording = { values: { '3': 'three', a: 'A' } }
    expect(valueWords(wording, 3)).toBeUndefined()
    expect(valueWords(wording, ['a'])).toBeUndefined()
    expect(valueWords(wording, 'a')).toBe('A')
  })
})