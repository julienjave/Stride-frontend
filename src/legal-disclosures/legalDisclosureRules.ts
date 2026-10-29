import { formatCalendarDate } from '@/common/formatCalendarDate'
import { formatMomentDate } from '@/common/formatMomentDate'
import { formatLinkMoment } from '@/records-export/recordsExportRules'
import type { PersonRef } from '@/records-export/types'
import type {
  DisclosurePart,
  LegalBasis,
  LegalDisclosureSummary,
  MakeLegalDisclosureBody,
  OwnLegalDisclosure,
} from './types'

// The legal disclosure screens' small rules (decisions §25, pass 3) — pure,
// so they're tested without a screen. The words match the backend's
// (legal-disclosure-rules.ts there): the patient reads the same sentence on
// My records and in their PDF.

// --- The backend's numbers, mirrored -----------------------------------------
//
// Hand-written copies (legal-disclosures.schema.ts there): the form's
// maxLength stops typing at the same limit the server enforces.
export const NAME_MAX_LENGTH = 200
export const REFERENCE_MAX_LENGTH = 100
export const EXPLANATION_MAX_LENGTH = 1000
export const STATEMENT_MAX_LENGTH = 2000

// --- Words -------------------------------------------------------------------

// In the order the form lists them — the common cases first, "other" last.
export const LEGAL_BASES: LegalBasis[] = [
  'court_order',
  'subpoena',
  'required_by_law',
  'law_enforcement',
  'health_oversight',
  'coroner',
  'other',
]

export const LEGAL_BASIS_LABELS: Record<LegalBasis, string> = {
  court_order: 'A court order',
  subpoena: 'A subpoena, with the assurances the law requires',
  required_by_law: 'Required by law',
  law_enforcement: 'A request from law enforcement',
  health_oversight: 'A health oversight agency (an inspection or licensing body)',
  coroner: 'A coroner or medical examiner',
  other: 'Another legal basis',
}

// "A court order" — or, for "other", the explanation the admin wrote, which
// is the only thing that says why.
export function legalBasisText(basis: LegalBasis, explanation: string | null): string {
  return basis === 'other' && explanation !== null
    ? `${LEGAL_BASIS_LABELS.other}: ${explanation}`
    : LEGAL_BASIS_LABELS[basis]
}

export const DISCLOSURE_PARTS: DisclosurePart[] = ['medical_file', 'programs', 'sessions', 'messages']

// The form's checkbox labels.
export const PART_LABELS: Record<DisclosurePart, string> = {
  medical_file: 'Medical file',
  programs: 'Exercise programs',
  sessions: 'Sessions',
  messages: 'Messages',
}

const PART_WORDS: Record<DisclosurePart, string> = {
  medical_file: 'medical file',
  programs: 'exercise programs',
  sessions: 'sessions',
  messages: 'messages',
}

// "Medical file, sessions and messages" — in the fixed order, first letter
// capitalised (the backend's partsText, word for word).
export function partsText(parts: DisclosurePart[]): string {
  const words = DISCLOSURE_PARTS.filter((part) => parts.includes(part)).map(
    (part) => PART_WORDS[part],
  )
  const phrase =
    words.length <= 1 ? (words[0] ?? '') : `${words.slice(0, -1).join(', ')} and ${words.at(-1)}`
  return phrase.charAt(0).toUpperCase() + phrase.slice(1)
}

// "April 1, 2026 to April 30, 2026", "from April 1, 2026", "up to April 30,
// 2026", or "all dates". Days with no time: formatCalendarDate keeps them the
// stored day in every zone. `locale` only for tests.
export function periodText(from: string | null, to: string | null, locale?: string): string {
  const day = (value: string) => formatCalendarDate(value, locale)
  if (from !== null && to !== null) return from === to ? day(from) : `${day(from)} to ${day(to)}`
  if (from !== null) return `from ${day(from)}`
  if (to !== null) return `up to ${day(to)}`
  return 'all dates'
}

// "Jane Roe (Montreal Police)", or the name alone.
export function recipientText(disclosure: OwnLegalDisclosure): string {
  return disclosure.recipientOrganisation === null
    ? disclosure.recipientName
    : `${disclosure.recipientName} (${disclosure.recipientOrganisation})`
}

// The name a copy is saved under when the browser hides the server's.
export const FALLBACK_FILE_NAME = 'stride-disclosure.pdf'

// --- The admin's list --------------------------------------------------------

export interface DisclosureDescription {
  // "Made by you on 28 Oct 2026, 15:00."
  made: string
  // The hold, when there is one: still running, or over.
  hold: string | null
}

// "you" for the signed-in admin, the name for anyone else.
function who(person: PersonRef, myId: number): string {
  return person.id === myId ? 'you' : `${person.firstName} ${person.lastName}`
}

// One disclosure as an admin reads it. The hold's end is a DAY in the
// viewer's zone (the admin chose a day; the server stored the start of it).
// `shownToPatient` is the server's judgement, by its clock — not recomputed
// here, so the page and the patient's own list can't disagree.
export function describeDisclosure(
  disclosure: LegalDisclosureSummary,
  myId: number,
  patientFirstName: string,
  locale?: string,
  timeZone?: string,
): DisclosureDescription {
  const made = `Made by ${who(disclosure.madeBy, myId)} on ${formatLinkMoment(disclosure.madeAt, locale, timeZone)}.`
  if (disclosure.withheldUntil === null) return { made, hold: null }
  const until = new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeZone }).format(
    new Date(disclosure.withheldUntil),
  )
  return {
    made,
    hold: disclosure.shownToPatient
      ? `Held back from ${patientFirstName} until ${until}, at an agency's request — shown to them since.`
      : `Held back from ${patientFirstName} until ${until}, at an agency's request. They don't see it yet.`,
  }
}

// --- The patient's list ------------------------------------------------------

// The heading of one line of the patient's accounting: "October 28, 2026 ·
// Jane Roe (Montreal Police)" — the day in the patient's own zone.
export function sharedHeading(disclosure: OwnLegalDisclosure, locale?: string): string {
  return `${formatMomentDate(disclosure.madeAt, locale)} · ${recipientText(disclosure)}`
}

// --- The form ----------------------------------------------------------------

export interface DisclosureForm {
  recipientName: string
  recipientOrganisation: string
  // '' until one is chosen: the select starts with no basis, on purpose — a
  // default would be a legal claim nobody made.
  legalBasis: LegalBasis | ''
  basisExplanation: string
  orderReference: string
  receivedOn: string
  parts: DisclosurePart[]
  periodFrom: string
  periodTo: string
  hold: boolean
  withheldUntil: string
  withholdingStatement: string
}

export const EMPTY_FORM: DisclosureForm = {
  recipientName: '',
  recipientOrganisation: '',
  legalBasis: '',
  basisExplanation: '',
  orderReference: '',
  receivedOn: '',
  parts: [],
  periodFrom: '',
  periodTo: '',
  hold: false,
  withheldUntil: '',
  withholdingStatement: '',
}

export type FormField =
  | 'recipientName'
  | 'legalBasis'
  | 'basisExplanation'
  | 'receivedOn'
  | 'parts'
  | 'periodTo'
  | 'withheldUntil'
  | 'withholdingStatement'

// The form's own messages — each different from its field's placeholder.
export const FORM_MESSAGES = {
  recipientName: 'Say who receives the copy.',
  legalBasis: 'Choose the legal basis.',
  basisExplanation: 'Explain the legal basis.',
  receivedOnMissing: 'Give the day the request reached the clinic.',
  receivedOnFuture: "The request can't have arrived after today.",
  parts: 'Choose at least one part of the record.',
  periodTo: 'The period must end on or after its first day.',
  withheldUntilMissing: 'Give the day the hold ends.',
  withheldUntilPast: 'The hold must end after today.',
  withholdingStatement: "Paste the agency's statement asking for the hold.",
} as const

// Every field's error, in the form's order (the first one gets the focus).
// `today`: the browser's day — the server checks the same, in the same zone.
export function formErrors(form: DisclosureForm, today: string): Partial<Record<FormField, string>> {
  const errors: Partial<Record<FormField, string>> = {}
  if (form.recipientName.trim() === '') errors.recipientName = FORM_MESSAGES.recipientName
  if (form.legalBasis === '') errors.legalBasis = FORM_MESSAGES.legalBasis
  if (form.legalBasis === 'other' && form.basisExplanation.trim() === '') {
    errors.basisExplanation = FORM_MESSAGES.basisExplanation
  }
  if (form.receivedOn === '') errors.receivedOn = FORM_MESSAGES.receivedOnMissing
  else if (form.receivedOn > today) errors.receivedOn = FORM_MESSAGES.receivedOnFuture
  if (form.parts.length === 0) errors.parts = FORM_MESSAGES.parts
  if (form.periodFrom !== '' && form.periodTo !== '' && form.periodTo < form.periodFrom) {
    errors.periodTo = FORM_MESSAGES.periodTo
  }
  if (form.hold) {
    if (form.withheldUntil === '') errors.withheldUntil = FORM_MESSAGES.withheldUntilMissing
    else if (form.withheldUntil <= today) errors.withheldUntil = FORM_MESSAGES.withheldUntilPast
    if (form.withholdingStatement.trim() === '') {
      errors.withholdingStatement = FORM_MESSAGES.withholdingStatement
    }
  }
  return errors
}

// What is sent: texts trimmed (the backend stores what it's sent), an empty
// optional field LEFT OUT (the backend refuses a blank one), the explanation
// only with "other" and the hold's two fields only with the hold — so a
// value typed, then made irrelevant by another choice, is never sent. The
// parts in the fixed order. Call it only once formErrors is empty (the basis
// is chosen then).
export function makeBody(form: DisclosureForm, timeZone: string): MakeLegalDisclosureBody {
  const optional = (key: keyof MakeLegalDisclosureBody, value: string) =>
    value.trim() === '' ? {} : { [key]: value.trim() }
  const legalBasis = form.legalBasis as LegalBasis
  return {
    recipientName: form.recipientName.trim(),
    ...optional('recipientOrganisation', form.recipientOrganisation),
    legalBasis,
    ...(legalBasis === 'other' ? optional('basisExplanation', form.basisExplanation) : {}),
    ...optional('orderReference', form.orderReference),
    receivedOn: form.receivedOn,
    parts: DISCLOSURE_PARTS.filter((part) => form.parts.includes(part)),
    ...optional('periodFrom', form.periodFrom),
    ...optional('periodTo', form.periodTo),
    ...(form.hold
      ? {
          ...optional('withheldUntil', form.withheldUntil),
          ...optional('withholdingStatement', form.withholdingStatement),
        }
      : {}),
    timeZone,
  }
}
