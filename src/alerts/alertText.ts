import { formatShortDate } from '@/common/calendarDate'
import type { AttendanceAlert, Inactivity, MissedRun, SessionAlert } from './types'

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