import { formatShortDate, localDateString } from '@/common/calendarDate'
import type {
  AttendanceAlert,
  CareTeamJoinAlert,
  ComplaintReviewAlert,
  LegalDisclosureAlert,
  PatientMergeAlert,
  Inactivity,
  MissedRun,
  PersonName,
  SessionAlert,
} from './types'

// The "For review" list's words (2026-10-19). Pure functions — an alert in, sentences
// out — so the wording is tested apart from the screens, the pattern of
// every Phase 4 feature (`…Text.ts` beside `…Rules.ts`). The backend
// decided WHICH alerts exist; these only say them. `locale` is for tests
// (undefined = the browser's own).

// "3", "1" — with the noun that agrees: one place for the plural rule.
function count(n: number, singular: string, plural: string): string {
  return `${n} ${n === 1 ? singular : plural}`
}

// The run of misses. Days and weeks are worded apart because they mean
// different things: a scheduled DAY was missed outright; a WEEK of an
// "N a week" program ended below its target (maybe 1 of 3 was done).
//   "3 scheduled sessions missed in a row, since Mon 12 Oct"
//   "2 weeks in a row below target, since Fri 2 Oct"
//   "2 scheduled sessions missed and 1 week below target in a row, since …"
//     (only across a change of schedule type)
export function missedRunText(run: MissedRun, locale?: string): string {
  const since = `since ${formatShortDate(run.since, locale)}`
  const days = count(run.days, 'scheduled session', 'scheduled sessions')
  const weeks = count(run.weeks, 'week', 'weeks')
  if (run.weeks === 0) return `${days} missed in a row, ${since}`
  if (run.days === 0) return `${weeks} in a row below target, ${since}`
  return `${days} missed and ${weeks} below target in a row, ${since}`
}

//   "No session for 9 days — the last on Fri 9 Oct"
//   "No session for 8 days since the program started"
// "Session" of any kind: a skip or a stop counts as the patient acting.
export function inactivityText(idle: Inactivity, locale?: string): string {
  const lead = `No session for ${count(idle.days, 'day', 'days')}`
  return idle.lastSessionDate === null
    ? `${lead} since the program started`
    : `${lead} — the last on ${formatShortDate(idle.lastSessionDate, locale)}`
}

// An attendance row's facts, one line each, in the backend's order.
export function attendanceLines(alert: AttendanceAlert, locale?: string): string[] {
  return [
    ...(alert.missedInARow ? [missedRunText(alert.missedInARow, locale)] : []),
    ...(alert.inactive ? [inactivityText(alert.inactive, locale)] : []),
  ]
}

// Why a session is listed, as one line — or null when the status line
// already says it all. Read with the row's status line beside it ("Fri 16
// Oct · Stopped (pain)"), so:
//   - `ended_for_pain` adds nothing: the status already says "(pain)";
//   - the two pain reasons become ONE fact, the numbers: "Pain 3 → 7" when
//     both were answered (a rise is only visible with both), "Pain after: 8"
//     otherwise — the reader judges a number, not a label;
//   - the hard exercises are named, with their ratings;
//   - a note is only said to EXIST ("Left a note"): its words are on the
//     session page, never in the list (minimum necessary).
export function sessionReasonsText(alert: SessionAlert): string | null {
  const { painBefore, painAfter } = alert.session
  const has = (reason: SessionAlert['reasons'][number]) => alert.reasons.includes(reason)
  const parts: string[] = []
  if ((has('pain_high') || has('pain_rise')) && painAfter !== null) {
    parts.push(painBefore !== null ? `Pain ${painBefore} → ${painAfter}` : `Pain after: ${painAfter}`)
  }
  if (has('hard_exercise')) {
    parts.push(
      `Rated hard: ${alert.hardExercises.map((e) => `${e.name} (${e.rating}/10)`).join(', ')}`,
    )
  }
  if (has('patient_note')) parts.push('Left a note')
  return parts.length === 0 ? null : parts.join(' · ')
}

// The card's slot: how many, said for a busy reader. 0 is good news, so
// it gets its own words rather than "0 to look at".
export function alertCountText(n: number): string {
  return n === 0 ? 'All caught up' : `${n} to look at`
}

// The row's link, named for a screen reader in full — the visible text is
// just "Review" / "View program", and a list of ten identical "Review"
// links can't be told apart. The name STARTS with the visible words (so
// voice control — "click Review" — still finds it).
export function alertLinkLabel(alert: SessionAlert | AttendanceAlert, locale?: string): string {
  const who = `${alert.patient.firstName} ${alert.patient.lastName}`
  return alert.kind === 'session'
    ? `Review ${who}'s session of ${formatShortDate(alert.session.localDate, locale)}`
    : `View program ${alert.program.title} (${who})`
}
// --- A COLLEAGUE JOINED THE CARE TEAM (2026-10-28) ---------------------------------

const fullName = (person: PersonName) => `${person.firstName} ${person.lastName}`

// The day of an instant, in the viewer's zone ("Tue 27 Oct"): a link starts at
// a moment, and the viewer's calendar decides which day that was.
function dayOf(instant: string, locale?: string): string {
  return formatShortDate(localDateString(new Date(instant)), locale)
}

// What happened, naming who did it: "Sam Lee joined the care team" when they
// joined by themselves; "Avery Admin added Sam Lee to the care team" when
// someone else did. (The patient is the row's own heading.)
export function joinText(alert: CareTeamJoinAlert): string {
  const { practitioner, addedBy } = alert.link
  return addedBy === null
    ? `${fullName(practitioner)} joined the care team`
    : `${fullName(addedBy)} added ${fullName(practitioner)} to the care team`
}

// When: the day it started, then — when the link has an end — whether they
// have left since or are covering until a day. `now` decides which (a
// parameter, so the words are tested at a fixed moment).
//   "Tue 27 Oct"   "Tue 27 Oct · left Wed 28 Oct"   "Tue 27 Oct · until Fri 6 Nov"
export function joinPeriodText(alert: CareTeamJoinAlert, now: Date, locale?: string): string {
  const { startedAt, endsAt } = alert.link
  const started = dayOf(startedAt, locale)
  if (endsAt === null) return started
  const ended = new Date(endsAt) <= now
  return `${started} · ${ended ? 'left' : 'until'} ${dayOf(endsAt, locale)}`
}

// The row's two controls, named in full for a screen reader (starting with the
// visible words, for voice control): a list of identical "Mark as reviewed"
// buttons can't be told apart otherwise.
export function joinReviewLabel(alert: CareTeamJoinAlert): string {
  return `Mark as reviewed: ${fullName(alert.link.practitioner)} on ${fullName(alert.patient)}'s care team`
}

export function joinLinkLabel(alert: CareTeamJoinAlert): string {
  return `View care team (${fullName(alert.patient)})`
}

// --- AN ADMIN OPENED A COMPLAINT REVIEW (2026-10-28) -------------------------------

// What happened, naming who: "Avery Admin opened a complaint review of the
// record" (the patient is the row's heading). Never why — the alert has no
// reason to say.
export function complaintReviewText(alert: ComplaintReviewAlert): string {
  return `${fullName(alert.review.openedBy)} opened a complaint review of the record`
}

// When: the day it opened, then its end — "until" while it runs, "ended" once
// it is over, whether an admin ended it early (endedAt) or its 7 days ran out
// (expiresAt). `now` decides which, as for a join.
//   "Wed 28 Oct · until Wed 4 Nov"   "Wed 28 Oct · ended Thu 29 Oct"
export function complaintReviewPeriodText(
  alert: ComplaintReviewAlert,
  now: Date,
  locale?: string,
): string {
  const { openedAt, expiresAt, endedAt } = alert.review
  const end = endedAt ?? expiresAt
  const over = new Date(end) <= now
  return `${dayOf(openedAt, locale)} · ${over ? 'ended' : 'until'} ${dayOf(end, locale)}`
}

// What it means for the reader, said once per row: the admin can make copies,
// and the reason isn't something the app will show them.
export const COMPLAINT_REVIEW_EXPLAINED =
  "While it's open, that admin can download copies of the record. The reason stays with the clinic's admins."

export function complaintReviewReviewLabel(alert: ComplaintReviewAlert): string {
  return `Mark as reviewed: complaint review of ${fullName(alert.patient)}'s record`
}

// --- AN ADMIN DISCLOSED THE RECORD (2026-10-28) ------------------------------------

// What happened, naming who did it and who received it: "Avery Admin
// disclosed the record to Det. Jane Roe (Montreal Police)". Never under what
// order — the alert has no basis or reference to say.
export function legalDisclosureText(alert: LegalDisclosureAlert): string {
  const { madeBy, recipientName, recipientOrganisation } = alert.disclosure
  const recipient =
    recipientOrganisation === null ? recipientName : `${recipientName} (${recipientOrganisation})`
  return `${fullName(madeBy)} disclosed the record to ${recipient}`
}

// When: the day it was made, then — while an agency's hold still runs — the
// day the patient will see it. Once that day has come, the hold is over and
// says nothing more. `now` decides which, as for a join.
//   "Wed 28 Oct"   "Wed 28 Oct · Pat sees it from Mon 30 Nov"
export function legalDisclosurePeriodText(
  alert: LegalDisclosureAlert,
  now: Date,
  locale?: string,
): string {
  const { madeAt, withheldUntil } = alert.disclosure
  const made = dayOf(madeAt, locale)
  if (withheldUntil === null || new Date(withheldUntil) <= now) return made
  return `${made} · ${alert.patient.firstName} sees it from ${dayOf(withheldUntil, locale)}`
}

// What it means for the reader. While the hold runs, the one thing the care
// team must not do is tell the patient first.
export function legalDisclosureExplained(alert: LegalDisclosureAlert, now: Date): string {
  const { withheldUntil } = alert.disclosure
  const held = withheldUntil !== null && new Date(withheldUntil) > now
  return held
    ? `The law required the clinic to give them a copy. An agency asked that ${alert.patient.firstName} not be told until then — please don't mention it before.`
    : "The law required the clinic to give them a copy. The order's details stay with the clinic's admins."
}

export function legalDisclosureReviewLabel(alert: LegalDisclosureAlert): string {
  return `Mark as reviewed: disclosure of ${fullName(alert.patient)}'s record`
}

// --- AN ADMIN MERGED TWO ACCOUNTS OF THE PATIENT (2026-10-29) -----------------------

// What happened, naming who: "Avery Admin merged a second account of this
// patient into this one" (the patient is the row's heading).
export function patientMergeText(alert: PatientMergeAlert): string {
  return `${fullName(alert.merge.mergedBy)} merged a second account of this patient into this one`
}

// When: the day it happened.
export function patientMergePeriodText(alert: PatientMergeAlert, locale?: string): string {
  return dayOf(alert.merge.mergedAt, locale)
}

// What it means for the reader: the record they treat changed shape.
export const PATIENT_MERGE_EXPLAINED =
  'Programs, sessions, notes and messages from the other account are now part of this record.'

export function patientMergeReviewLabel(alert: PatientMergeAlert): string {
  return `Mark as reviewed: accounts of ${fullName(alert.patient)} merged`
}
