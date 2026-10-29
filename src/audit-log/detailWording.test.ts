import { describe, it, expect } from 'vitest'
import { describeDetails } from './auditDetails'
import { detailWording, valueWords } from './detailWording'
import { formatEntryDay, formatEntryMoment } from './auditWording'

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
        'patient_merge',
      ].map(words),
    ).toStrictEqual([
      'Changing the email address',
      'Changing the password',
      'Setting up two-factor sign-in',
      'Turning off two-factor sign-in',
      'Getting new recovery codes',
      "Resetting someone's two-factor sign-in",
      'Merging two patient accounts',
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

// The records export's emailed link (decisions §20). Stored as Postgres
// returns jsonb — keys reordered — and shown in the table's order.
describe('RECORDS_EXPORT_LINK_SENT', () => {
  it('says where the link went, until when, whose account — and which link it replaced', () => {
    expect(
      shown(
        {
          sentTo: 'pat@example.com',
          expiresAt: '2031-03-13T09:00:00.000Z',
          patientActive: false,
          replacedLinkId: 4,
        },
        'RECORDS_EXPORT_LINK_SENT',
      ),
    ).toStrictEqual([
      ['Sent to', 'pat@example.com'],
      ['Works until', formatEntryMoment('2031-03-13T09:00:00.000Z')],
      ['Account', 'Deactivated (the patient can’t sign in)'],
      ['Replaced the open link', '#4'],
    ])
  })

  it("shows the details in the table's order, whatever order they're stored in", () => {
    expect(
      shown(
        { replacedLinkId: 4, patientActive: true, expiresAt: '2031-03-13T09:00:00.000Z', sentTo: 'a@b.c' },
        'RECORDS_EXPORT_LINK_SENT',
      ).map(([label]) => label),
    ).toStrictEqual(['Sent to', 'Works until', 'Account', 'Replaced the open link'])
    expect(shown({ patientActive: true }, 'RECORDS_EXPORT_LINK_SENT')).toStrictEqual([['Account', 'Active']])
  })
})

describe('RECORDS_EXPORT_LINK_REFUSED', () => {
  it('counts the wrong dates of birth, and says when the link locked', () => {
    expect(shown({ wrongDatesOfBirth: 2 }, 'RECORDS_EXPORT_LINK_REFUSED')).toStrictEqual([
      ['Wrong dates of birth so far', '2'],
    ])
    expect(
      shown({ linkLocked: true, wrongDatesOfBirth: 5 }, 'RECORDS_EXPORT_LINK_REFUSED'),
    ).toStrictEqual([
      ['Wrong dates of birth so far', '5'],
      ['Link locked', 'Yes — the link no longer works'],
    ])
  })
})

// A patient created (or the patient role granted) after the
// possible-duplicate warning (decisions §27): the matches by user id, after
// the entry's other details.
describe('USER_CREATED and USER_ROLE_GRANTED', () => {
  it('names the possible duplicates by user id, after the other details', () => {
    expect(
      shown({ possibleDuplicateOf: [12, 15], invitationId: 9, careTeamLinkId: 4 }, 'USER_CREATED'),
    ).toStrictEqual([
      ['Care team link ID', '#4'],
      ['Invitation ID', '#9'],
      ['Possible duplicate of (user ids)', '12, 15'],
    ])
    expect(
      shown({ possibleDuplicateOf: [12], role: 'patient' }, 'USER_ROLE_GRANTED'),
    ).toStrictEqual([
      ['Role', 'patient'],
      ['Possible duplicate of (user ids)', '12'],
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

  it('gives words to text, true / false and lists of texts — never to numbers or objects', () => {
    const wording = { values: { '3': 'three', a: 'A', b: 'B' } }
    expect(valueWords(wording, 3)).toBeUndefined()
    expect(valueWords(wording, { a: 1 })).toBeUndefined()
    expect(valueWords(wording, 'a')).toBe('A')
    // A list: each item its words, an unknown item as stored.
    expect(valueWords(wording, ['b', 'a', 'z'])).toBe('B, A, z')
    // Not a list of texts, or empty: the generic formatting decides.
    expect(valueWords(wording, ['a', 3])).toBeUndefined()
    expect(valueWords(wording, [])).toBeUndefined()
    // An item named like an inherited property is unknown, not a function.
    expect(valueWords(wording, ['toString'])).toBe('toString')
  })
})

// The complaint review (decisions §25, pass 2): why, under which case
// number, until when — in that order, whatever order Postgres stored them in.
describe('COMPLAINT_REVIEW_OPENED', () => {
  it('says the reason, the case reference and until when', () => {
    expect(
      shown(
        { expiresAt: '2031-03-13T09:00:00.000Z', caseReference: 'CR-14', reason: 'Knee worse' },
        'COMPLAINT_REVIEW_OPENED',
      ),
    ).toStrictEqual([
      ['Reason', 'Knee worse'],
      ['Case reference', 'CR-14'],
      ['Open until', formatEntryMoment('2031-03-13T09:00:00.000Z')],
    ])
  })
})

describe('COMPLAINT_REVIEW_ENDED and the notice', () => {
  it('says who had opened it and when it would have closed; which review was seen', () => {
    expect(
      shown({ openedBy: 7, expiresAt: '2031-03-13T09:00:00.000Z' }, 'COMPLAINT_REVIEW_ENDED'),
    ).toStrictEqual([
      ['Opened by (user id)', '7'],
      ['Would have been open until', formatEntryMoment('2031-03-13T09:00:00.000Z')],
    ])
    expect(
      shown({ openedBy: 7, complaintReviewId: 12 }, 'COMPLAINT_REVIEW_NOTICE_REVIEWED'),
    ).toStrictEqual([
      ['Complaint review', '#12'],
      ['Opened by (user id)', '7'],
    ])
  })
})
// The legal disclosure (decisions §25, pass 3): to whom, under what, which
// parts and period, the hold — in the form's order, whatever order Postgres
// stored them in; the basis and each part in words.
describe('LEGAL_DISCLOSURE_MADE', () => {
  it('says to whom, under what, what went and the hold', () => {
    expect(
      shown(
        {
          parts: ['medical_file', 'messages'],
          periodTo: '2031-03-31',
          legalBasis: 'court_order',
          receivedOn: '2031-03-01',
          periodFrom: '2031-03-01',
          recipientName: 'Jane Roe',
          withheldUntil: '2031-04-01T04:00:00.000Z',
          orderReference: '500-17-123',
          recipientOrganisation: 'Montreal Police',
          withholdingStatement: 'Investigation',
        },
        'LEGAL_DISCLOSURE_MADE',
      ),
    ).toStrictEqual([
      ['Disclosed to', 'Jane Roe'],
      ['Organisation', 'Montreal Police'],
      ['Legal basis', 'A court order'],
      ['Order reference', '500-17-123'],
      ['Request received on', formatEntryDay('2031-03-01')],
      ['Parts', 'Medical file, Messages'],
      ['Period from', formatEntryDay('2031-03-01')],
      ['Period to', formatEntryDay('2031-03-31')],
      ['Held back from the patient until', formatEntryMoment('2031-04-01T04:00:00.000Z')],
      ["Agency's statement", 'Investigation'],
    ])
  })

  it('has words for every basis and every part', () => {
    const basis = (value: string) => shown({ legalBasis: value }, 'LEGAL_DISCLOSURE_MADE')[0][1]
    expect(
      [
        'court_order',
        'subpoena',
        'required_by_law',
        'law_enforcement',
        'health_oversight',
        'coroner',
        'other',
      ].map(basis),
    ).toStrictEqual([
      'A court order',
      'A subpoena, with the assurances the law requires',
      'Required by law',
      'A request from law enforcement',
      'A health oversight agency',
      'A coroner or medical examiner',
      'Another legal basis',
    ])
    // Stored in another order (Postgres puts shorter keys first): shown in the
    // form's — the explanation before the reference.
    expect(
      shown(
        { parts: ['programs', 'sessions'], orderReference: 'R-1', basisExplanation: 'Why' },
        'LEGAL_DISCLOSURE_MADE',
      ),
    ).toStrictEqual([
      ['Explanation', 'Why'],
      ['Order reference', 'R-1'],
      ['Parts', 'Exercise programs, Sessions'],
    ])
  })

  it('says which disclosure a notice was about', () => {
    expect(
      shown({ madeBy: 7, disclosureId: 21 }, 'LEGAL_DISCLOSURE_NOTICE_REVIEWED'),
    ).toStrictEqual([
      ['Disclosure', '#21'],
      ['Made by (user id)', '7'],
    ])
  })
})

// A patient merge (decisions §27, pass 3): the admins' half, in the order an
// admin checks it, its words for the filled fields and the merged account.
describe('PATIENT_MERGED', () => {
  it('says which account went into which, then what else was involved', () => {
    expect(
      shown(
        {
          closedExportLinkIds: [],
          filledFields: ['phone', 'avatar'],
          survivorId: 1,
          mergedId: 2,
          wasActive: false,
          signedOutSessions: 0,
        },
        'PATIENT_MERGED',
      ),
    ).toStrictEqual([
      ['Merged away (user)', '#2'],
      ['Kept (user)', '#1'],
      ['The merged account was', 'Already deactivated'],
      ['Its sessions signed out', '0'],
      ['Filled on the account kept', 'Phone, Photo'],
      ['Download links closed (ids)', 'none'],
    ])
  })

  it('words its notice being reviewed', () => {
    expect(shown({ mergedBy: 9, mergeId: 3 }, 'PATIENT_MERGE_NOTICE_REVIEWED')).toStrictEqual([
      ['Merge', '#3'],
      ['Merged by (user id)', '9'],
    ])
  })
})

