import type { AuditAction } from './types'

// Plain words for the VALUES some audit entries store (decided with the
// person, 2026-10-25). The database keeps the stored value — 'wrong_password'
// stays 'wrong_password' forever: an audit trail is evidence, and the code
// matches on these values. Only the screen translates, here, the same way
// auditWording.ts translates the action names. "Show the raw entry" still
// shows what is stored.
//
// Keyed by ACTION, then by detail KEY: `reason` means something different in
// each action (a failed step-up's reason is not an email change's), so one
// table per key would mix them up.

// --- The backend's values, mirrored ------------------------------------------------------------------------
//
// Hand-written copies of backend types, like `AuditAction` (types.ts): each
// word table below is typed `Record<…, string>`, so a value missing a word is
// a compile error HERE once it's added to these lists. A value the backend
// stores that isn't listed (an older row, or one added since) is shown as
// stored — never hidden.

// src/mfa/step-up.service.ts, StepUpPurpose — which change a step-up guarded.
type StepUpPurpose =
  | 'email_change'
  | 'password_change'
  | 'mfa_setup'
  | 'mfa_disable'
  | 'recovery_codes'
  | 'mfa_reset'

// src/mfa/totp.ts and second-factor.ts — why a second factor was refused.
type SecondFactorRefusal = 'wrong_code' | 'code_already_used' | 'wrong_recovery_code'

// src/mfa/step-up.service.ts, StepUpFailureReason.
type StepUpFailureReason = 'wrong_password' | SecondFactorRefusal

// src/email-change/email-change.service.ts — the reasons written into
// EMAIL_CHANGE_CANCELLED entries (a replaced request or a password change
// cancels too, but those are written in OTHER entries' details).
type EmailChangeCancelReason = 'cancelled_in_app' | 'cancelled_by_email_link'

// src/database/schema/legal-disclosures.schema.ts, LegalBasis.
type LegalBasis =
  | 'court_order'
  | 'subpoena'
  | 'required_by_law'
  | 'law_enforcement'
  | 'health_oversight'
  | 'coroner'
  | 'other'

// src/legal-disclosures/legal-disclosure-rules.ts, DisclosurePart.
type DisclosurePart = 'medical_file' | 'programs' | 'sessions' | 'messages'

// --- The words -------------------------------------------------------------------------------------------

const SECOND_FACTOR_REFUSAL: Record<SecondFactorRefusal, string> = {
  wrong_code: 'Wrong code',
  code_already_used: 'A code that was already used',
  wrong_recovery_code: "A recovery code that isn't valid or was already used",
}

// Words for each value, filled from the typed tables above — `satisfies`
// checks them without widening, so they fit the looser shape below.
const STEP_UP_PURPOSE = {
  email_change: 'Changing the email address',
  password_change: 'Changing the password',
  mfa_setup: 'Setting up two-factor sign-in',
  mfa_disable: 'Turning off two-factor sign-in',
  recovery_codes: 'Getting new recovery codes',
  mfa_reset: "Resetting someone's two-factor sign-in",
} satisfies Record<StepUpPurpose, string>

const STEP_UP_REASON = {
  wrong_password: 'Wrong password',
  ...SECOND_FACTOR_REFUSAL,
} satisfies Record<StepUpFailureReason, string>

// The admin's own words for these (the form's), not the patient's: the audit
// log is read by admins.
const LEGAL_BASIS = {
  court_order: 'A court order',
  subpoena: 'A subpoena, with the assurances the law requires',
  required_by_law: 'Required by law',
  law_enforcement: 'A request from law enforcement',
  health_oversight: 'A health oversight agency',
  coroner: 'A coroner or medical examiner',
  other: 'Another legal basis',
} satisfies Record<LegalBasis, string>

const DISCLOSURE_PART = {
  medical_file: 'Medical file',
  programs: 'Exercise programs',
  sessions: 'Sessions',
  messages: 'Messages',
} satisfies Record<DisclosurePart, string>

const EMAIL_CHANGE_CANCEL_REASON = {
  cancelled_in_app: 'Cancelled in the app',
  cancelled_by_email_link: 'Cancelled from the link in the email',
} satisfies Record<EmailChangeCancelReason, string>

// How one detail key of one action is shown: its label, and words for its
// values (looked up by the value as text — `true` as 'true').
export interface DetailWording {
  label?: string
  values?: Readonly<Record<string, string>>
}

// The records export's emailed link (decisions §20). `sentTo` is the address
// the link went to — kept, since "where did a copy go?" must have an answer
// after the account's email changes; `replacedLinkId` the link it closed.
// RECORDS_EXPORTED isn't here: its details are clinical (the ids of what went
// in), withheld from admins — the audit log's only readers.
const DETAIL_WORDING: Partial<Record<AuditAction, Record<string, DetailWording>>> = {
  RECORDS_EXPORT_LINK_SENT: {
    sentTo: { label: 'Sent to' },
    expiresAt: { label: 'Works until' },
    patientActive: {
      label: 'Account',
      values: { true: 'Active', false: 'Deactivated (the patient can’t sign in)' },
    },
    replacedLinkId: { label: 'Replaced the open link' },
  },
  RECORDS_EXPORT_LINK_REFUSED: {
    wrongDatesOfBirth: { label: 'Wrong dates of birth so far' },
    linkLocked: { label: 'Link locked', values: { true: 'Yes — the link no longer works' } },
  },
  // The complaint review (decisions §25, pass 2). `openedBy` is a user id, as
  // stored (the entry's own "who" is the admin who acted).
  COMPLAINT_REVIEW_OPENED: {
    reason: { label: 'Reason' },
    caseReference: { label: 'Case reference' },
    expiresAt: { label: 'Open until' },
  },
  COMPLAINT_REVIEW_ENDED: {
    openedBy: { label: 'Opened by (user id)' },
    expiresAt: { label: 'Would have been open until' },
  },
  COMPLAINT_REVIEW_NOTICE_REVIEWED: {
    complaintReviewId: { label: 'Complaint review' },
    openedBy: { label: 'Opened by (user id)' },
  },
  // The legal disclosure (decisions §25, pass 3): to whom, under what, which
  // parts and period, and the hold — in the form's order. An optional field
  // left empty is absent from the entry, so absent from here.
  LEGAL_DISCLOSURE_MADE: {
    recipientName: { label: 'Disclosed to' },
    recipientOrganisation: { label: 'Organisation' },
    legalBasis: { label: 'Legal basis', values: LEGAL_BASIS },
    basisExplanation: { label: 'Explanation' },
    orderReference: { label: 'Order reference' },
    receivedOn: { label: 'Request received on' },
    parts: { label: 'Parts', values: DISCLOSURE_PART },
    periodFrom: { label: 'Period from' },
    periodTo: { label: 'Period to' },
    withheldUntil: { label: 'Held back from the patient until' },
    withholdingStatement: { label: "Agency's statement" },
  },
  LEGAL_DISCLOSURE_NOTICE_REVIEWED: {
    disclosureId: { label: 'Disclosure' },
    madeBy: { label: 'Made by (user id)' },
  },
  STEP_UP_FAILED: {
    purpose: { label: 'For', values: STEP_UP_PURPOSE },
    reason: { values: STEP_UP_REASON },
    consecutiveFailures: { label: 'Failures in a row' },
    signedOut: { label: 'Signed out', values: { true: 'Yes — this session was ended' } },
  },
  MFA_LOGIN_FAILURE: {
    reason: { values: SECOND_FACTOR_REFUSAL },
  },
  EMAIL_CHANGE_CANCELLED: {
    reason: { values: EMAIL_CHANGE_CANCEL_REASON },
  },
}

// --- Lookups ---------------------------------------------------------------------------------------------
//
// Object.hasOwn, never `in` or a plain index: the action and the key come
// from stored data, and `in` also finds what an object INHERITS — a key
// named 'toString' would find a function (the audit vocabulary's lesson).

// One action's table, or undefined for an action it doesn't know — the one
// place an action read from stored data is looked up.
function wordingOf(action: string | undefined): Record<string, DetailWording> | undefined {
  if (action === undefined || !Object.hasOwn(DETAIL_WORDING, action)) return undefined
  return DETAIL_WORDING[action as AuditAction]
}

// The wording for one key of one action, or undefined (then the screen uses
// its generic label and formatting).
export function detailWording(action: string | undefined, key: string): DetailWording | undefined {
  const byKey = wordingOf(action)
  if (!byKey || !Object.hasOwn(byKey, key)) return undefined
  return byKey[key]
}

// The order to show an action's details in: the keys this table knows, in
// the table's order ("For" before "Reason"), then any others as stored.
// Postgres stores jsonb with its keys reordered (shorter keys first), so the
// stored order says nothing — a failed step-up would read "Reason, For".
export function orderDetailKeys(action: string | undefined, keys: string[]): string[] {
  const known = Object.keys(wordingOf(action) ?? {})
  return [
    ...known.filter((key) => keys.includes(key)),
    ...keys.filter((key) => !known.includes(key)),
  ]
}

// The words for a stored value, or undefined when there are none — a value
// that isn't text, true / false or a list of texts (a number, an object), or
// one the table doesn't know. A LIST of texts (a disclosure's parts, since
// 2026-10-28) gets words item by item, joined like any list; an item the
// table doesn't know is shown as stored — never hidden.
export function valueWords(wording: DetailWording | undefined, value: unknown): string | undefined {
  const values = wording?.values
  if (!values) return undefined
  const known = (text: string) => (Object.hasOwn(values, text) ? values[text] : undefined)
  if (Array.isArray(value)) {
    if (value.length === 0 || !value.every((item) => typeof item === 'string')) return undefined
    return value.map((item: string) => known(item) ?? item).join(', ')
  }
  if (typeof value !== 'string' && typeof value !== 'boolean') return undefined
  return known(String(value))
}